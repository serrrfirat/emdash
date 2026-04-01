import { describe, expect, it } from 'vitest';
import { hasDeleteRiskForMode } from '../../renderer/lib/taskDeleteMode';
import type { DeleteRiskStatus } from '../../renderer/hooks/useDeleteRisks';

function makeStatus(overrides: Partial<DeleteRiskStatus> = {}): DeleteRiskStatus {
  return {
    staged: 0,
    unstaged: 0,
    untracked: 0,
    files: [],
    ahead: 0,
    behind: 0,
    error: undefined,
    pr: null,
    prKnown: true,
    ...overrides,
  };
}

describe('hasDeleteRiskForMode', () => {
  it('does not treat an open PR as a delete risk in local-only mode', () => {
    const status = makeStatus({
      pr: {
        number: 42,
        title: 'Keep this PR',
        state: 'OPEN',
      },
    });

    expect(hasDeleteRiskForMode(status, 'local-only')).toBe(false);
  });

  it('treats an open PR as a delete risk in local-and-remote mode', () => {
    const status = makeStatus({
      pr: {
        number: 42,
        title: 'Delete this PR branch',
        state: 'OPEN',
      },
    });

    expect(hasDeleteRiskForMode(status, 'local-and-remote')).toBe(true);
  });

  it('still treats unpushed commits as a delete risk in local-only mode', () => {
    expect(hasDeleteRiskForMode(makeStatus({ ahead: 2 }), 'local-only')).toBe(true);
  });
});
