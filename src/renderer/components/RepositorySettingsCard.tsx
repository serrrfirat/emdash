import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { useAppSettings } from '@/contexts/AppSettingsProvider';
import { Button } from './ui/button';
import { rpc } from '@/lib/rpc';

type RepoSettings = {
  branchPrefix: string;
  pushOnCreate: boolean;
  autoCloseLinkedIssuesOnPrCreate: boolean;
  worktreeRootDirectory?: string;
};

const DEFAULTS: RepoSettings = {
  branchPrefix: 'emdash',
  pushOnCreate: true,
  autoCloseLinkedIssuesOnPrCreate: true,
  worktreeRootDirectory: '',
};

type ActionTarget = Pick<Node, 'contains'>;

export function shouldSkipWorktreeRootDirectoryBlurSave(
  relatedTarget: Node | null,
  actionTargets: Array<ActionTarget | null>
): boolean {
  return actionTargets.some((target) => target?.contains(relatedTarget) === true);
}

const RepositorySettingsCard: React.FC = () => {
  const { settings, updateSettings, isLoading: loading, isSaving: saving } = useAppSettings();
  const [branchPrefix, setBranchPrefix] = useState<string>(DEFAULTS.branchPrefix);
  const [worktreeRootDirectory, setWorktreeRootDirectory] = useState<string>(
    DEFAULTS.worktreeRootDirectory ?? ''
  );
  const browseButtonRef = useRef<HTMLButtonElement>(null);
  const useDefaultButtonRef = useRef<HTMLButtonElement>(null);

  const { repository } = settings ?? {};

  useEffect(() => {
    setBranchPrefix(repository?.branchPrefix ?? DEFAULTS.branchPrefix);
    setWorktreeRootDirectory(repository?.worktreeRootDirectory ?? DEFAULTS.worktreeRootDirectory!);
  }, [repository?.branchPrefix, repository?.worktreeRootDirectory]);

  const example = useMemo(() => {
    const prefix = branchPrefix || DEFAULTS.branchPrefix;
    return `${prefix}/my-feature-a3f`;
  }, [branchPrefix]);

  const saveBranchPrefix = useCallback(() => {
    updateSettings({ repository: { branchPrefix: branchPrefix.trim() } });
  }, [branchPrefix, updateSettings]);

  const saveWorktreeRootDirectory = useCallback(
    (nextValue: string) => {
      const normalizedValue = nextValue.trim();
      setWorktreeRootDirectory(normalizedValue);
      updateSettings({
        repository: {
          worktreeRootDirectory: normalizedValue || undefined,
        },
      });
    },
    [updateSettings]
  );

  const handleWorktreeRootDirectoryBlur = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      if (
        shouldSkipWorktreeRootDirectoryBlurSave(event.relatedTarget as Node | null, [
          browseButtonRef.current,
          useDefaultButtonRef.current,
        ])
      ) {
        return;
      }

      saveWorktreeRootDirectory(worktreeRootDirectory);
    },
    [saveWorktreeRootDirectory, worktreeRootDirectory]
  );

  const handleBrowse = useCallback(async () => {
    const selectedDirectory = await rpc.appSettings.pickDirectory({
      title: 'Choose Worktree Storage Directory',
      message: 'Select the folder where Emdash should store local worktrees',
      defaultPath: worktreeRootDirectory.trim() || undefined,
    });

    if (!selectedDirectory) {
      return;
    }

    saveWorktreeRootDirectory(selectedDirectory);
  }, [saveWorktreeRootDirectory, worktreeRootDirectory]);

  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <Input
          value={branchPrefix}
          onChange={(e) => setBranchPrefix(e.target.value)}
          onBlur={saveBranchPrefix}
          placeholder="Branch prefix"
          aria-label="Branch prefix"
          disabled={loading || saving}
        />
        <div className="text-[11px] text-muted-foreground">
          Example: <code className="rounded bg-muted/60 px-1">{example}</code>
        </div>
      </div>
      <div className="grid gap-2">
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="text-sm font-medium text-foreground">Worktree storage location</div>
          <div className="text-sm">
            Store local worktrees in a custom folder. Leave this blank to keep using
            <code className="mx-1 rounded bg-muted/60 px-1">../worktrees</code>
            next to each repository.
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            value={worktreeRootDirectory}
            onChange={(e) => setWorktreeRootDirectory(e.target.value)}
            onBlur={handleWorktreeRootDirectoryBlur}
            placeholder="~/worktrees"
            aria-label="Worktree storage location"
            disabled={loading || saving}
          />
          <Button
            ref={browseButtonRef}
            type="button"
            variant="outline"
            onClick={() => void handleBrowse()}
            disabled={loading || saving}
          >
            Browse
          </Button>
          <Button
            ref={useDefaultButtonRef}
            type="button"
            variant="ghost"
            onClick={() => saveWorktreeRootDirectory('')}
            disabled={loading || saving || !worktreeRootDirectory.trim()}
          >
            Use Default
          </Button>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Each repository gets its own subfolder under the selected root to avoid collisions.
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="text-sm font-medium text-foreground">Auto-push to origin</div>
          <div className="text-sm">
            Push the new branch to origin and set upstream after creation.
          </div>
        </div>
        <Switch
          checked={repository?.pushOnCreate ?? DEFAULTS.pushOnCreate}
          onCheckedChange={(checked) => updateSettings({ repository: { pushOnCreate: checked } })}
          disabled={loading || saving}
          aria-label="Enable automatic push on create"
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="text-sm font-medium text-foreground">
            Auto-close linked issues on PR creation
          </div>
          <div className="text-sm">
            Add Emdash-managed closing keywords to new PRs so linked GitHub and Linear issues are
            closed automatically. Disable this if your team closes issues only after testing,
            deployment, or external approval.
          </div>
        </div>
        <Switch
          checked={
            repository?.autoCloseLinkedIssuesOnPrCreate ?? DEFAULTS.autoCloseLinkedIssuesOnPrCreate
          }
          onCheckedChange={(checked) =>
            updateSettings({ repository: { autoCloseLinkedIssuesOnPrCreate: checked } })
          }
          disabled={loading || saving}
          aria-label="Enable automatic closing of linked issues on pull request creation"
        />
      </div>
    </div>
  );
};

export default RepositorySettingsCard;
