import { isActivePr } from './prStatus';
import type { DeleteRiskStatus } from '../hooks/useDeleteRisks';
import {
  DEFAULT_WORKTREE_DELETE_MODE,
  type WorktreeDeleteMode,
} from '../../shared/worktree/deleteMode';

export type TaskDeleteMode = WorktreeDeleteMode;

export const DEFAULT_TASK_DELETE_MODE: TaskDeleteMode = DEFAULT_WORKTREE_DELETE_MODE;

export function hasDeleteRiskForMode(
  status:
    | Pick<DeleteRiskStatus, 'staged' | 'unstaged' | 'untracked' | 'ahead' | 'error' | 'pr'>
    | undefined,
  mode: TaskDeleteMode
): boolean {
  if (!status) return false;
  return (
    status.staged > 0 ||
    status.unstaged > 0 ||
    status.untracked > 0 ||
    status.ahead > 0 ||
    !!status.error ||
    (mode === 'local-and-remote' && !!(status.pr && isActivePr(status.pr)))
  );
}
