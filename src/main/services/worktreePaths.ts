import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getAppSettings } from '../settings';

function resolveComparablePath(targetPath: string): string {
  const resolved = path.resolve(targetPath);
  try {
    return fs.realpathSync.native ? fs.realpathSync.native(resolved) : fs.realpathSync(resolved);
  } catch {
    return resolved;
  }
}

function sanitizeDirectorySegment(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'project'
  );
}

function getProjectDirectoryName(projectPath: string): string {
  const normalizedProjectPath = resolveComparablePath(projectPath);
  const projectName = sanitizeDirectorySegment(path.basename(normalizedProjectPath));
  const hash = crypto.createHash('sha1').update(normalizedProjectPath).digest('hex').slice(0, 8);
  return `${projectName}-${hash}`;
}

function isWithinDirectory(targetPath: string, directoryPath: string): boolean {
  const normalizedTargetPath = resolveComparablePath(targetPath);
  const normalizedDirectoryPath = resolveComparablePath(directoryPath);
  const relative = path.relative(normalizedDirectoryPath, normalizedTargetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function getDefaultWorktreesDirectory(projectPath: string): string {
  return path.resolve(projectPath, '..', 'worktrees');
}

export function getConfiguredWorktreesDirectory(projectPath: string): string | null {
  const configuredRoot = getAppSettings()?.repository?.worktreeRootDirectory;
  if (!configuredRoot) {
    return null;
  }

  return path.join(path.resolve(configuredRoot), getProjectDirectoryName(projectPath));
}

export function getPreferredWorktreesDirectory(projectPath: string): string {
  return getConfiguredWorktreesDirectory(projectPath) ?? getDefaultWorktreesDirectory(projectPath);
}

export function getManagedWorktreePath(projectPath: string, directoryName: string): string {
  return path.join(getPreferredWorktreesDirectory(projectPath), directoryName);
}

export function getManagedWorktreesDirectories(projectPath: string): string[] {
  return Array.from(
    new Set(
      [getPreferredWorktreesDirectory(projectPath), getDefaultWorktreesDirectory(projectPath)].map(
        (directoryPath) => path.resolve(directoryPath)
      )
    )
  );
}

export function isManagedWorktreePath(projectPath: string, candidatePath: string): boolean {
  const currentManagedDirectory = getConfiguredWorktreesDirectory(projectPath);
  if (currentManagedDirectory && isWithinDirectory(candidatePath, currentManagedDirectory)) {
    return true;
  }

  const defaultWorktreesDirectory = getDefaultWorktreesDirectory(projectPath);
  if (isWithinDirectory(candidatePath, defaultWorktreesDirectory)) {
    return true;
  }

  return (
    candidatePath.includes('/worktrees/') ||
    candidatePath.includes('\\worktrees\\') ||
    candidatePath.includes('/.conductor/') ||
    candidatePath.includes('\\.conductor\\') ||
    candidatePath.includes('/.cursor/worktrees/') ||
    candidatePath.includes('\\.cursor\\worktrees\\')
  );
}
