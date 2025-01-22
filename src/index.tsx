/* eslint-disable @typescript-eslint/ban-types */
import { definePlugin } from '@decky/api';
import { staticClasses } from '@decky/ui';
import { Framework, FrameworkCfg } from 'decky-plugin-framework';

import translations from '../assets/translations.i18n.json';
import { RogIcon } from './components/icons/rogIcon';
import { MainMenu } from './pages/MainMenu';
import { BackendUtils } from './utils/backend';
import { Constants } from './utils/constants';
import { Listeners } from './utils/listeners';

export default definePlugin(() => {
  (async (): Promise<void> => {
    const frameworkConfiguration: FrameworkCfg = {
      game: {
        lifeCycle: true
      },
      toast: {
        logo: window.SP_REACT.createElement(RogIcon, {
          width: 30,
          height: 30
        })
      },
      translator: {
        translations
      }
    };
    await Framework.initialize(
      Constants.PLUGIN_NAME,
      Constants.PLUGIN_VERSION,
      frameworkConfiguration
    );

    Listeners.bind();

    BackendUtils.ready();
  })();

  return {
    name: Constants.PLUGIN_NAME,
    title: <div className={staticClasses.Title}>{Constants.PLUGIN_NAME}</div>,
    content: <MainMenu />,
    icon: <RogIcon width={20} height={20} />,
    onDismount(): void {
      Listeners.unbind();
      Framework.shutdown();
    }
  };
});
