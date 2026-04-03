import { dialog } from 'electron';
import { AppSettingsUpdate, getAppSettings, updateAppSettings } from '../settings';
import { createRPCController } from '../../shared/ipc/rpc';
import { getMainWindow } from '../app/window';

export const appSettingsController = createRPCController({
  get: async () => getAppSettings(),
  update: (partial: AppSettingsUpdate) => updateAppSettings(partial || {}),
  pickDirectory: async (args?: { title?: string; message?: string; defaultPath?: string }) => {
    try {
      const window = getMainWindow();
      const dialogOptions: Electron.OpenDialogOptions = {
        title: args?.title || 'Select Directory',
        properties: ['openDirectory'],
        message: args?.message || 'Select a directory',
        defaultPath: args?.defaultPath,
      };
      const result = window
        ? await dialog.showOpenDialog(window, dialogOptions)
        : await dialog.showOpenDialog(dialogOptions);

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    } catch {
      return null;
    }
  },
});
