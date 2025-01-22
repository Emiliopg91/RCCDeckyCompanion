export class MessageType {
  type: string;
  name: string;
  data: any[];
  error: string | null;
  id: string;

  constructor(
    type: string,
    name: string,
    data: any[] = [],
    error: string | null = null,
    id?: string
  ) {
    this.type = type;
    this.name = name;
    this.data = data;
    this.error = error;
    this.id = id ?? MessageType.generateUUID();
  }

  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  toJSON(): string {
    return JSON.stringify({
      type: this.type,
      name: this.name,
      data: this.data,
      error: this.error,
      id: this.id
    });
  }

  static fromJSON(json: string): MessageType {
    const obj = JSON.parse(json);
    return new MessageType(obj.type, obj.name, obj.data, obj.error, obj.id);
  }
}

class WebSocketClient {
  private readonly url: string;
  private readonly reconnectInterval: number = 1000; // Tiempo entre intentos de reconexión (ms)
  private websocket: WebSocket | null = null;
  private isConnected: boolean = false;
  private shouldReconnect: boolean = true;
  private onConnectCallback: (() => void) | undefined = undefined;

  constructor(host: string, port: number, onConnectCallback: (() => void) | undefined = undefined) {
    this.url = `ws://${host}:${port}`;
    this.connect();
    this.onConnectCallback = onConnectCallback;
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
    });
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled Rejection:', reason);
    });
  }

  private connect(): void {
    try {
      this.websocket = new WebSocket(this.url);

      this.websocket.onopen = () => {
        console.log('Connected to WebSocket server.');
        if (this.onConnectCallback) {
          this.onConnectCallback();
        }
        this.isConnected = true;
      };

      this.websocket.onclose = () => {
        console.log('Disconnected from WebSocket server.');
        this.isConnected = false;
        if (this.shouldReconnect) {
          console.log(`Reconnecting in ${this.reconnectInterval}ms...`);
          setTimeout(() => this.connect(), this.reconnectInterval);
        }
      };

      this.websocket.onmessage = (event) => {
        try {
          console.log(`Message received: ${event.data}`);
          this.handleMessage(event.data);
        } catch (error) {
          console.error('Error handling message:', error);
        }
      };

      this.websocket.onerror = (error) => {
        error.preventDefault();
        console.error('WebSocket error:', error);
        if (this.shouldReconnect) {
          console.log(`Reconnecting in ${this.reconnectInterval}ms...`);
          setTimeout(() => this.connect(), this.reconnectInterval);
        }
      };
    } catch (error) {
      console.error('Error during connection setup:', error);
      if (this.shouldReconnect) {
        setTimeout(() => this.connect(), this.reconnectInterval);
      }
    }
  }

  private handleMessage(message: string): void {
    try {
      const parsedMessage = JSON.parse(message) as MessageType;

      if (parsedMessage.type === 'REQUEST') {
        this.handleRequest(parsedMessage);
      } else {
        console.warn('Unhandled message type:', parsedMessage.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  private handleRequest(request: MessageType): void {
    console.log(`Handling request: method=${request.name}, args=${JSON.stringify(request.data)}`);

    let responseData: Array<any> = [];
    try {
      if (request.name === 'ping') {
        responseData = ['pong'];
      } else {
        responseData = [`Method ${request.name} not implemented.`];
      }

      this.sendMessage({
        type: 'RESPONSE',
        name: request.name,
        id: request.id,
        data: responseData
      });
    } catch (error) {
      console.error('Error handling request:', error);
    }
  }

  public sendMessage(message: any): void {
    if (this.isConnected && this.websocket) {
      try {
        this.websocket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message:', error);
      }
    } else {
      console.warn('Cannot send message: WebSocket is not connected.');
    }
  }

  public emitEvent(name: string, ...data: any[]): void {
    const event = {
      type: 'EVENT',
      name,
      data
    };
    this.sendMessage(event);
  }

  public stopReconnecting(): void {
    this.shouldReconnect = false;
  }
}

// Ejemplo de uso
const client = new WebSocketClient('localhost', 18158, () => {
  client.emitEvent('exampleEvent', { key: 'value' });
  console.log('Event emited');
});

function sleep() {
  setTimeout(sleep, 10000);
}

sleep();
