import { Backend } from 'decky-plugin-framework';

/**
 * The Backend class provides access to plugin Python backend methods
 */
export class BackendUtils {
  /**
   * Private constructor to prevent instantiation
   */
  private constructor() {}

  /**
   * Method to get the plugin log
   * @returns A Promise of the log as a string
   */
  public static async getPluginLog(): Promise<string> {
    return Backend.backend_call<[], string>('get_plugin_log');
  }

  /**
   * Method to get the plugin log
   * @returns A Promise of the log as a string
   */
  public static async getPluginName(): Promise<string> {
    return Backend.backend_call<[], string>('get_plugin_name');
  }

  public static async sendResponse(
    id: string,
    method: string,
    ...args: any[]
  ): Promise<string | null> {
    return Backend.backend_call<[id: string, method: string, ...params: any[]], string>(
      'send_response',
      id,
      method,
      ...args
    );
  }

  public static async emitEvent(event: string, ...args: any[]): Promise<string | null> {
    return Backend.backend_call<[event: string, ...params: any[]], string>(
      'emit_event',
      event,
      ...args
    );
  }
}
