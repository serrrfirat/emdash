import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const SETTINGS_DIRECTORY = '/tmp/emdash-settings-update-test';
const SETTINGS_FILE = path.join(SETTINGS_DIRECTORY, 'settings.json');

async function loadSettingsModule() {
  vi.resetModules();
  vi.doMock('electron', () => ({
    app: {
      getPath: () => SETTINGS_DIRECTORY,
    },
  }));

  return import('../../main/settings');
}

beforeEach(() => {
  rmSync(SETTINGS_DIRECTORY, { recursive: true, force: true });
});

afterEach(() => {
  vi.doUnmock('electron');
});

describe('updateAppSettings - repository settings', () => {
  it('persists worktreeRootDirectory values across reloads', async () => {
    const { updateAppSettings } = await loadSettingsModule();

    updateAppSettings({
      repository: {
        worktreeRootDirectory: '/tmp/custom-worktrees',
      },
    });

    const reloadedSettingsModule = await loadSettingsModule();
    expect(reloadedSettingsModule.getAppSettings().repository.worktreeRootDirectory).toBe(
      '/tmp/custom-worktrees'
    );
  });

  it('clears worktreeRootDirectory when explicitly updated to undefined', async () => {
    const { getAppSettings, updateAppSettings } = await loadSettingsModule();

    updateAppSettings({
      repository: {
        worktreeRootDirectory: '/tmp/custom-worktrees',
      },
    });

    expect(getAppSettings().repository.worktreeRootDirectory).toBe('/tmp/custom-worktrees');

    updateAppSettings({
      repository: {
        worktreeRootDirectory: undefined,
      },
    });

    expect(getAppSettings().repository.worktreeRootDirectory).toBeUndefined();
    expect(existsSync(SETTINGS_FILE)).toBe(true);
    expect(JSON.parse(readFileSync(SETTINGS_FILE, 'utf8')).repository.worktreeRootDirectory).toBe(
      undefined
    );
  });
});
