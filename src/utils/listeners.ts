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
  public static runningApplications: Array<{ id: number; name: string }> = [];

  public static bind(): void {
    Listeners.unsubscribeGameEvents = EventBus.subscribe(EventType.GAME_LIFE, (e: EventData) => {
      const event = e as GameLifeEventData;
      Logger.info('New game event:', event);
      event.getDetails().then((game) => {
        if (event.isRunning()) {
          Listeners.runningApplications.push({ id: game.getGameId(), name: game.getDisplayName() });
          BackendUtils.emitEvent('launch_game', game.getGameId(), game.getDisplayName());
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

    Listeners.unsubscribeIncommingRequest = Backend.backend_handle(
      'get_app_details',
      (id: string) => {
        //appDetailsStore.GetAppDetails(990080).strLaunchOptions
        //SteamClient.Apps.SetAppLaunchOptions(990080, "EVK_ICD_FILENAMES=/usr/share/vulkan/icd.d/nvidia_icd.i686.json:/usr/share/vulkan/icd.d/nvidia_icd.x86_64.json %command%")
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
  }
}
