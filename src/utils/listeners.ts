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
  public static runningApplications: Array<string> = [];

  public static bind(): void {
    Listeners.unsubscribeGameEvents = EventBus.subscribe(EventType.GAME_LIFE, (e: EventData) => {
      const event = e as GameLifeEventData;
      Logger.info('New game event:', event);
      event.getDetails().then((game) => {
        if (event.isRunning()) {
          Listeners.runningApplications.push(game.getDisplayName());
          BackendUtils.emitEvent('launch_game', game.getDisplayName());
        } else {
          const index = Listeners.runningApplications.indexOf(game.getDisplayName());
          if (index !== -1) {
            Listeners.runningApplications.splice(index, 1);
            BackendUtils.emitEvent('stop_game', game.getDisplayName());
          }
        }
      });
    }).unsubscribe;

    Listeners.unsubscribeIncommingRequest = Backend.backend_handle(
      'get_running_games',
      (id: string) => {
        BackendUtils.sendResponse(id, 'get_running_games', Listeners.runningApplications);
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
