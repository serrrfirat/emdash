import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash, Folder } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Spinner } from './ui/spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { DELETE_RISK_SCAN_FRESH_MS, useDeleteRisks } from '../hooks/useDeleteRisks';
import { useToast } from '../hooks/use-toast';
import DeletePrNotice from './DeletePrNotice';
import DeleteRiskFileList from './DeleteRiskFileList';
import { isActivePr } from '../lib/prStatus';
import {
  DEFAULT_TASK_DELETE_MODE,
  hasDeleteRiskForMode,
  type TaskDeleteMode,
} from '../lib/taskDeleteMode';

type Props = {
  taskName: string;
  taskId: string;
  taskPath: string;
  onConfirm: (mode: TaskDeleteMode) => void | Promise<void | boolean>;
  className?: string;
  'aria-label'?: string;
  isDeleting?: boolean;
  /**
   * Indicates whether the task uses a Git worktree for isolation.
   * When false, the task runs directly on the main repository branch.
   * This affects deletion warnings - worktree tasks may have uncommitted changes
   * that will be lost, while main branch tasks do not have this risk.
   * @default true
   */
  useWorktree?: boolean;
  /** Controlled open state — when provided, overrides the internal state. */
  externalOpen?: boolean;
  /** Callback when controlled open state changes. */
  onExternalOpenChange?: (open: boolean) => void;
  /** When true, the trigger button is hidden and only the dialog is rendered. */
  hideTrigger?: boolean;
  allowRemoteBranchDelete?: boolean;
  defaultDeleteMode?: TaskDeleteMode;
};

export const TaskDeleteButton: React.FC<Props> = ({
  taskName,
  taskId,
  taskPath,
  onConfirm,
  className,
  'aria-label': ariaLabel = 'Delete Task',
  isDeleting = false,
  useWorktree = true,
  externalOpen,
  onExternalOpenChange,
  hideTrigger = false,
  allowRemoteBranchDelete = false,
  defaultDeleteMode = DEFAULT_TASK_DELETE_MODE,
}) => {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? (v: boolean) => onExternalOpenChange?.(v) : setInternalOpen;
  const [acknowledge, setAcknowledge] = React.useState(false);
  const [showWarnings, setShowWarnings] = React.useState(false);
  const [requiresAcknowledge, setRequiresAcknowledge] = React.useState(false);
  const [isCheckingRisks, setIsCheckingRisks] = React.useState(false);
  const [showActionSpinner, setShowActionSpinner] = React.useState(false);
  const [deleteMode, setDeleteMode] = React.useState<TaskDeleteMode>(defaultDeleteMode);
  const targets = useMemo(
    () => [{ id: taskId, name: taskName, path: taskPath }],
    [taskId, taskName, taskPath]
  );
  // Only check for deletion risks if the task uses a worktree.
  // Tasks running directly on the main branch (useWorktree === false) don't need risk assessment
  // since they don't have isolated changes that could be lost.
  const { risks, scannedAtById, refresh } = useDeleteRisks(targets, open && useWorktree, {
    eagerPrRefresh: false,
  });
  const status = risks[taskId] || {
    staged: 0,
    unstaged: 0,
    untracked: 0,
    files: [],
    ahead: 0,
    behind: 0,
    error: undefined,
    pr: null,
    prKnown: false,
  };

  // Determine if deletion is risky based on uncommitted changes or active PRs.
  // Tasks on main branch (useWorktree === false) are never considered risky
  // because they don't have worktree-specific changes that would be lost.
  const hasRisk = (targetStatus: typeof status): boolean =>
    hasDeleteRiskForMode(targetStatus, deleteMode);
  const risky: boolean = useWorktree && hasRisk(status);
  const disableDelete: boolean =
    Boolean(isDeleting || isCheckingRisks) || (requiresAcknowledge && !acknowledge);

  React.useEffect(() => {
    if (!open) {
      setAcknowledge(false);
      setShowWarnings(false);
      setRequiresAcknowledge(false);
      setIsCheckingRisks(false);
      setShowActionSpinner(false);
      setDeleteMode(defaultDeleteMode);
    }
  }, [defaultDeleteMode, open]);

  React.useEffect(() => {
    const busy = isDeleting || isCheckingRisks;
    if (!busy) {
      setShowActionSpinner(false);
      return;
    }
    const timeoutId = window.setTimeout(() => setShowActionSpinner(true), 180);
    return () => window.clearTimeout(timeoutId);
  }, [isCheckingRisks, isDeleting]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={cn(className, isDeleting && 'opacity-100')}
                  title="Delete Task"
                  aria-label={ariaLabel}
                  aria-busy={isDeleting}
                  disabled={isDeleting}
                  onClick={(e) => e.stopPropagation()}
                >
                  {isDeleting ? (
                    <Spinner className="h-4 w-4" size="sm" />
                  ) : (
                    <Trash className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Delete Task
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <AlertDialogContent onClick={(e) => e.stopPropagation()} className="space-y-4">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete task?</AlertDialogTitle>
          <AlertDialogDescription>
            {useWorktree
              ? 'This will permanently delete this task and its worktree.'
              : 'This will permanently delete this task from the project.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 text-sm">
          {useWorktree && allowRemoteBranchDelete ? (
            <div className="space-y-2 rounded-md border border-border/70 bg-muted/20 px-3 py-3">
              <div className="text-sm font-medium text-foreground">Delete mode</div>
              <RadioGroup
                value={deleteMode}
                onValueChange={(value) => setDeleteMode(value as TaskDeleteMode)}
                className="gap-2"
              >
                <label
                  htmlFor={`delete-mode-local-${taskId}`}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-border/70 bg-background px-3 py-2"
                >
                  <RadioGroupItem
                    value="local-only"
                    id={`delete-mode-local-${taskId}`}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">Delete local task only</div>
                    <div className="text-muted-foreground">
                      Remove the task, worktree, and local branch. Keep the remote branch and PR.
                    </div>
                  </div>
                </label>
                <label
                  htmlFor={`delete-mode-remote-${taskId}`}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-border/70 bg-background px-3 py-2"
                >
                  <RadioGroupItem
                    value="local-and-remote"
                    id={`delete-mode-remote-${taskId}`}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">Delete branch everywhere</div>
                    <div className="text-muted-foreground">
                      Also delete the remote branch. This can close or detach an open PR.
                    </div>
                  </div>
                </label>
              </RadioGroup>
            </div>
          ) : null}
          <AnimatePresence initial={false}>
            {showWarnings && (requiresAcknowledge || risky) ? (
              <motion.div
                key="delete-risk"
                initial={{ opacity: 0, y: 6, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.99 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="space-y-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-50"
              >
                <p className="font-medium">Unmerged or unpushed work detected</p>
                <div className="rounded-md bg-amber-50/80 px-2 py-1 text-amber-900 dark:bg-amber-500/10 dark:text-amber-50">
                  <div className="flex items-start gap-2">
                    <Folder className="mt-0.5 h-4 w-4 flex-shrink-0 fill-amber-700 text-amber-700" />
                    <div className="min-w-0">
                      <div className="font-medium">{taskName}</div>
                      <div className="text-sm">
                        {[
                          status.staged > 0
                            ? `${status.staged} ${status.staged === 1 ? 'file' : 'files'} staged`
                            : null,
                          status.unstaged > 0
                            ? `${status.unstaged} ${status.unstaged === 1 ? 'file' : 'files'} unstaged:`
                            : null,
                          status.untracked > 0
                            ? `${status.untracked} ${status.untracked === 1 ? 'file' : 'files'} untracked:`
                            : null,
                          status.ahead > 0
                            ? `ahead by ${status.ahead} ${status.ahead === 1 ? 'commit' : 'commits'}`
                            : null,
                          status.behind > 0
                            ? `behind by ${status.behind} ${status.behind === 1 ? 'commit' : 'commits'}`
                            : null,
                          deleteMode === 'local-and-remote' && status.pr && isActivePr(status.pr)
                            ? 'PR open'
                            : null,
                        ]
                          .filter(Boolean)
                          .join(', ') ||
                          status.error ||
                          'Status unavailable'}
                      </div>
                    </div>
                  </div>
                  <DeleteRiskFileList files={status.files} limit={6} />
                </div>
                {deleteMode === 'local-and-remote' && status.pr && isActivePr(status.pr) ? (
                  <DeletePrNotice tasks={[{ name: taskName, pr: status.pr }]} />
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {showWarnings && requiresAcknowledge ? (
              <motion.label
                key="ack-delete"
                className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/30 px-3 py-2"
                initial={{ opacity: 0, y: 6, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.99 }}
                transition={{ duration: 0.18, ease: 'easeOut', delay: 0.02 }}
              >
                <Checkbox
                  checked={acknowledge}
                  onCheckedChange={(checked) => setAcknowledge(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-sm leading-tight text-foreground">Delete task anyway</span>
              </motion.label>
            ) : null}
          </AnimatePresence>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive px-4 py-2 text-destructive-foreground hover:bg-destructive/90"
            disabled={disableDelete}
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (requiresAcknowledge && !acknowledge) {
                setShowWarnings(true);
                return;
              }
              if (useWorktree && !showWarnings) {
                setIsCheckingRisks(true);
                try {
                  const scanAgeMs = Date.now() - (scannedAtById[taskId] ?? 0);
                  const hasFreshScan =
                    (scannedAtById[taskId] ?? 0) > 0 && scanAgeMs <= DELETE_RISK_SCAN_FRESH_MS;
                  const hasKnownStatus = Boolean(risks[taskId]);
                  const hasKnownRisk = hasKnownStatus && hasRisk(status);
                  const hasKnownPrState = hasKnownStatus && status.prKnown;
                  const shouldForceRefresh =
                    !hasKnownStatus || !hasKnownPrState || !hasFreshScan || hasKnownRisk;

                  const latest = shouldForceRefresh ? await refresh({ force: true }) : risks;
                  const latestStatus = latest[taskId] || status;
                  if (hasRisk(latestStatus)) {
                    setRequiresAcknowledge(true);
                    setShowWarnings(true);
                    return;
                  }
                  setRequiresAcknowledge(false);
                } catch (error) {
                  toast({
                    title: 'Could not verify delete risks',
                    description:
                      error instanceof Error ? error.message : 'Please try deleting again.',
                    variant: 'destructive',
                  });
                  return;
                } finally {
                  setIsCheckingRisks(false);
                }
              }
              setOpen(false);
              try {
                await onConfirm(deleteMode);
              } catch {}
            }}
          >
            {showActionSpinner ? <Spinner className="mr-2 h-4 w-4" size="sm" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TaskDeleteButton;
