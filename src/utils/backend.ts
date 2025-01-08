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

  public static async dbusStopGame(game_name: string): Promise<string | null> {
    return Backend.backend_call<[game_name: string], string>('dbus_stop_game', game_name);
  }

  public static async dbusLaunchGame(game_name: string): Promise<string | null> {
    return Backend.backend_call<[game_name: string], string>('dbus_launch_game', game_name);
  }
}
