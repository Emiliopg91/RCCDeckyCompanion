# pylint: disable=R0801
import decky
import asyncio
import queue
import os
import json
import socket

from abc import ABC
from threading import Thread, Lock

from .rcc_websocket import MessageType


class UnixSocketServer(ABC):
    """Base class for WebSocket servers"""

    SOCKET = os.path.join(decky.DECKY_PLUGIN_RUNTIME_DIR,"socket")
    INVOCATION_TIMEOUT = 3

    def __init__(self):
        super().__init__()

        self._server = None
        self._client = None

        self._message_queue = queue.Queue()
        self.lock = Lock()

        self.loop = asyncio.new_event_loop()

        Thread(
            daemon=True,
            target=lambda: self.loop.run_until_complete(self.__start_server()),
        ).start()
        Thread(
            daemon=True,
            target=lambda: self.loop.run_until_complete(self._message_sender()),
        ).start()

    async def __start_server(self):
        if os.path.exists(UnixSocketServer.SOCKET):
            os.remove(UnixSocketServer.SOCKET)

        self._server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self._server.bind(UnixSocketServer.SOCKET)
        self._server.listen(1)
        self.running = True

        decky.logger.info(f"[SERVER] Listening on {UnixSocketServer.SOCKET}...")

        Thread(target=self._accept_loop, daemon=True).start()

    def _accept_loop(self):
        while self.running:
            client_sock, _ = self._server.accept()
            with self.lock:
                if self._client is None:
                    self._client = client_sock
                    decky.logger.info("[SERVER] Client connected")
                    Thread(target=self._handle_client, args=(client_sock,), daemon=True).start()
                else:
                    decky.logger.warning("[SERVER] Extra connection rejected")
                    client_sock.close()

    async def _message_sender(self):
        while True:
            decky.logger.info("Waiting for outgoing messages...")
            message = self._message_queue.get(block=True)
            decky.logger.info(f"Preparing to send {message}")

            if self._server:
                if self._client:
                    try:
                        data = json.dumps(message).encode("utf-8")
                        header = len(data).to_bytes(4, byteorder="big")
                        self._client.sendall(header + data)
                        decky.logger.info(f"Sent to client")
                    except Exception as e:
                        decky.logger.error(
                            f"Failed to send message to client: {e}"
                        )
            else:
                decky.logger.info("No server running, message not sent.")

    def _add_message_to_queue(self, message):
        self._message_queue.put(message)

    def send_message(self, message):
        """Método público para enviar un mensaje."""
        self._add_message_to_queue(message)

    def _handle_client(self, sock: socket.socket):
        try:
            while self.running:
                header = sock.recv(4)
                if not header:
                    break
                msg_len = int.from_bytes(header, byteorder="big")
                data = sock.recv(msg_len).decode("utf-8")

                msg = json.loads(data)
                decky.logger.info(f"[SERVER] Received: {msg}")

                # Responder si es request
                if msg.get("type") == "REQUEST":
                    asyncio.run_coroutine_threadsafe(self._handle_message(data), self.loop)
        except Exception as e:
            decky.logger.error("[SERVER] Error:", e)
        finally:
            decky.logger.info("[SERVER] Client disconnected")
            with self.lock:
                self._client = None
            sock.close()

    async def _handle_message(self, input_msg):
        decky.logger.info(f"Received message: '{input_msg}'")
        message: MessageType = None
        try:
            message = MessageType.from_json(input_msg)
        except Exception as e:
            message = None
            decky.logger.error(f"Error on message parsing: {e}")

        if message is not None and message.type == "REQUEST":
            if message.name not in (
                "get_running_games",
                "get_apps_details",
                "set_launch_options",
                "get_icon",
            ):
                message.type = "RESPONSE"
                message.error = f"No such method '{message.name}'"
                self.send_message(message)  # pylint: disable=E1101
            else:
                await decky.emit(message.name, message.id, *message.data)

    def emit(self, event: str, *data: any):
        """Emit event with specified data"""
        msg = MessageType("EVENT", event, data)
        self.send_message(msg)  # pylint: disable=E1101

    def send_response(self, msg_id: str, method: str, *data: any):
        msg = MessageType("RESPONSE", method, list(data), None, msg_id)
        self.send_message(msg)  # pylint: disable=E1101

    def shutdown(self):
        self.running = False
        if self._client:
            self._client.close()
        if self._server:
            self._server.close()
        if os.path.exists(self.SOCKET):
            os.remove(self.SOCKET)
        decky.logger.info("[SERVER] Stopped")
