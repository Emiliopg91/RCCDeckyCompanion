import { EventBus, EventData, EventType, GameLifeEventData, Logger } from 'decky-plugin-framework';

import { BackendUtils } from './backend';

export class Listeners {
  private static unsubscribeGameEvents: (() => void) | undefined = undefined;

  public static bind(): void {
    Listeners.unsubscribeGameEvents = EventBus.subscribe(EventType.GAME_LIFE, (e: EventData) => {
      const event = e as GameLifeEventData;
      Logger.info('New game event:', event);
      event.getDetails().then((game) => {
        if (event.isRunning()) {
          BackendUtils.dbusLaunchGame(game.getDisplayName());
        } else {
          BackendUtils.dbusStopGame(game.getDisplayName());
        }
      });
    }).unsubscribe;
  }

  public static unbind(): void {
    if (Listeners.unsubscribeGameEvents) {
      Listeners.unsubscribeGameEvents();
    }
  }
}
