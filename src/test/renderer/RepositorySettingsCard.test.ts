import { describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/AppSettingsProvider', () => ({
  useAppSettings: () => ({
    settings: undefined,
    updateSettings: vi.fn(),
    isLoading: false,
    isSaving: false,
  }),
}));

vi.mock('@/lib/rpc', () => ({
  rpc: {
    appSettings: {
      pickDirectory: vi.fn(),
    },
  },
}));

import { shouldSkipWorktreeRootDirectoryBlurSave } from '../../renderer/components/RepositorySettingsCard';

describe('shouldSkipWorktreeRootDirectoryBlurSave', () => {
  it('skips blur-saving when focus moves to the browse button', () => {
    const browseTarget = {} as Node;
    const browseButton = {
      contains: (candidate: Node | null) => candidate === browseTarget,
    };

    expect(shouldSkipWorktreeRootDirectoryBlurSave(browseTarget, [browseButton, null])).toBe(true);
  });

  it('does not skip blur-saving when focus moves outside the action buttons', () => {
    const outsideTarget = {} as Node;
    const browseButton = {
      contains: (_candidate: Node | null) => false,
    };
    const useDefaultButton = {
      contains: (_candidate: Node | null) => false,
    };

    expect(
      shouldSkipWorktreeRootDirectoryBlurSave(outsideTarget, [browseButton, useDefaultButton])
    ).toBe(false);
  });
});
