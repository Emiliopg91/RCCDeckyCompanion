import { WebSocketServer } from 'ws';

export class MessageType {
  constructor(type, name, data = [], error = null, id) {
    this.type = type;
    this.name = name;
    this.data = data;
    this.error = error;
    this.id = id ?? MessageType.generateUUID();
  }

  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  toJSON() {
    return JSON.stringify({
      type: this.type,
      name: this.name,
      data: this.data,
      error: this.error,
      id: this.id
    });
  }

  static fromJSON(json) {
    const obj = JSON.parse(json);
    return new MessageType(obj.type, obj.name, obj.data, obj.error, obj.id);
  }
}

export class PluginWebsocketServer {
  server = null;
  clients = new Set();

  constructor(port) {
    this.port = port;
    this.startServer();
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
    });
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled Rejection:', reason);
    });
  }

  startServer() {
    try {
      this.server = new WebSocketServer({ host: '127.0.0.1', port: this.port });

      this.server.on('connection', (socket) => {
        console.info('New client connected.');
        this.clients.add(socket);

        socket.on('message', (message) => {
          try {
            console.info(`Message received: ${message}`);
            this.handleMessage(socket, message.toString());
          } catch (error) {
            console.error('Error handling message:', error);
          }
        });

        socket.on('close', () => {
          console.info('Client disconnected.');
          this.clients.delete(socket);
        });

        socket.on('error', (error) => {
          console.error('WebSocket error:', error);
        });
      });

      this.server.on('listening', () => {
        console.info(`WebSocket server started on ws://localhost:${this.port}`);
      });

      this.server.on('error', (error) => {
        console.error('WebSocket server error:', error);
      });
    } catch (error) {
      console.error('Error starting WebSocket server:', error);
    }
  }

  handleMessage(socket, message) {
    try {
      const parsedMessage = JSON.parse(message);

      if (parsedMessage.type === 'REQUEST') {
        this.handleRequest(socket, parsedMessage);
      } else {
        console.warn('Unhandled message type:', parsedMessage.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  handleRequest(socket, request) {
    console.info(`Handling request: method=${request.name}, args=${JSON.stringify(request.data)}`);

    let responseData = [];
    try {
      if (request.name === 'ping') {
        responseData = ['pong'];
      } else {
        responseData = [`Method ${request.name} not implemented.`];
      }

      this.sendMessage(socket, {
        type: 'RESPONSE',
        name: request.name,
        id: request.id,
        data: responseData
      });
    } catch (error) {
      console.error('Error handling request:', error);
    }
  }

  sendMessage(socket, message) {
    try {
      socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  broadcastEvent(name, ...data) {
    const event = new MessageType('EVENT', name, data, null);
    console.info('Broadcasting event ' + JSON.stringify(event));

    for (const client of this.clients) {
      this.sendMessage(client, event);
    }
  }

  stop() {
    if (this.server) {
      this.server.close(() => {
        console.info('WebSocket server stopped.');
      });
    }
  }
}

new PluginWebsocketServer(18158);

function sleep() {
  setTimeout(sleep, 10000);
}

sleep();
