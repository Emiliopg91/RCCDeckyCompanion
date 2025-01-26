import {
  Backend,
  EventBus,
  EventData,
  EventType,
  GameLifeEventData,
  Logger
} from 'decky-plugin-framework';

import { BackendUtils } from './backend';

export class Listeners {
  private static unsubscribeGameEvents: (() => void) | undefined = undefined;
  private static unsubscribeIncommingRequest: (() => void) | undefined = undefined;
  private static unsubscribeGetAppsDetails: (() => void) | undefined = undefined;
  private static unsubscribeSetLaunchOptions: (() => void) | undefined = undefined;

  public static runningApplications: Array<{ id: number; name: string }> = [];

  public static bind(): void {
    Listeners.unsubscribeGameEvents = EventBus.subscribe(EventType.GAME_LIFE, (e: EventData) => {
      const event = e as GameLifeEventData;
      Logger.info('New game event:', event);
      event.getDetails().then((game) => {
        if (event.isRunning()) {
          Listeners.runningApplications.push({ id: game.getGameId(), name: game.getDisplayName() });
          BackendUtils.emitEvent(
            'launch_game',
            game.getGameId(),
            game.getDisplayName(),
            event.getPID()
          );
        } else {
          Listeners.runningApplications = Listeners.runningApplications.filter(
            (e) => e.id != game.getGameId()
          );
          BackendUtils.emitEvent('stop_game', game.getGameId(), game.getDisplayName());
        }
      });
    }).unsubscribe;

    Listeners.unsubscribeIncommingRequest = Backend.backend_handle(
      'get_running_games',
      (id: string) => {
        BackendUtils.sendResponse(id, 'get_running_games', Listeners.runningApplications);
      }
    );

    Listeners.unsubscribeGetAppsDetails = Backend.backend_handle(
      'get_apps_details',
      async (id: string, ...data: number[]) => {
        const response: Record<number, any> = {};
        for (let i = 0; i < data.length; i++) {
          const details = await appDetailsStore.RequestAppDetails(data[i]);
          response[data[i]] = {
            appid: data[i],
            name: details.strDisplayName,
            launch_opts: details.strLaunchOptions,
            is_steam_app: appStore.GetAppOverviewByGameID(data[i]).rt_steam_release_date > 0
          };
        }
        BackendUtils.sendResponse(id, 'get_apps_details', response);
        //SteamClient.Apps.SetAppLaunchOptions(990080, "EVK_ICD_FILENAMES=/usr/share/vulkan/icd.d/nvidia_icd.i686.json:/usr/share/vulkan/icd.d/nvidia_icd.x86_64.json %command%")
      }
    );

    Listeners.unsubscribeSetLaunchOptions = Backend.backend_handle(
      'set_launch_options',
      async (id: string, appid: number, launch_opts: string) => {
        SteamClient.Apps.SetAppLaunchOptions(appid, launch_opts);
        BackendUtils.sendResponse(id, 'set_launch_options');
      }
    );
  }

  public static unbind(): void {
    if (Listeners.unsubscribeGameEvents) {
      Listeners.unsubscribeGameEvents();
    }
    if (Listeners.unsubscribeIncommingRequest) {
      Listeners.unsubscribeIncommingRequest();
    }
    if (Listeners.unsubscribeGetAppsDetails) {
      Listeners.unsubscribeGetAppsDetails();
    }
    if (Listeners.unsubscribeSetLaunchOptions) {
      Listeners.unsubscribeSetLaunchOptions();
    }
  }
}
