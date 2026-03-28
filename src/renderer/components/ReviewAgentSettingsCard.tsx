import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AgentSelector } from './AgentSelector';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Agent } from '../types';
import type { CatalogSkill } from '@shared/skills/types';
import { isValidProviderId } from '@shared/providers/registry';
import {
  DEFAULT_REVIEW_AGENT,
  DEFAULT_REVIEW_PROMPT,
  type ReviewSettings,
} from '@shared/reviewPreset';
import { useAppSettings } from '@/contexts/AppSettingsProvider';

const DEFAULT_REVIEW_SETTINGS: ReviewSettings = {
  enabled: false,
  agent: DEFAULT_REVIEW_AGENT,
  prompt: DEFAULT_REVIEW_PROMPT,
};

const NONE_VALUE = '__none__';

const ReviewAgentSettingsCard: React.FC = () => {
  const { settings, updateSettings, isLoading: loading, isSaving: saving } = useAppSettings();
  const [installedSkills, setInstalledSkills] = useState<CatalogSkill[]>([]);

  const loadInstalledSkills = useCallback(async () => {
    try {
      const result = await window.electronAPI.skillsGetCatalog();
      if (result.success && result.data) {
        setInstalledSkills(result.data.skills.filter((s) => s.installed));
      }
    } catch {
      // Ignore — dropdown will just be empty
    }
  }, []);

  useEffect(() => {
    loadInstalledSkills();
  }, [loadInstalledSkills]);

  const reviewSettings = useMemo<ReviewSettings>(() => {
    const configured = settings?.review;
    return {
      enabled: configured?.enabled ?? DEFAULT_REVIEW_SETTINGS.enabled,
      agent: isValidProviderId(configured?.agent)
        ? configured.agent
        : DEFAULT_REVIEW_SETTINGS.agent,
      prompt:
        typeof configured?.prompt === 'string' && configured.prompt.trim()
          ? configured.prompt
          : DEFAULT_REVIEW_SETTINGS.prompt,
      skillId:
        typeof configured?.skillId === 'string' && configured.skillId.trim()
          ? configured.skillId
          : undefined,
    };
  }, [settings?.review]);

  const [selectedSkillId, setSelectedSkillId] = useState<string>(
    reviewSettings.skillId || NONE_VALUE
  );

  useEffect(() => {
    setSelectedSkillId(reviewSettings.skillId || NONE_VALUE);
  }, [reviewSettings.skillId]);

  const handleSkillChange = (value: string) => {
    setSelectedSkillId(value);
    if (value === NONE_VALUE) {
      updateSettings({ review: { skillId: '' } });
    } else {
      updateSettings({ review: { skillId: value } });
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-muted p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-sm font-medium text-foreground">Review preset</p>
          <p className="text-sm text-muted-foreground">
            Adds a dedicated review action in task chats and the changes panel.
          </p>
        </div>
        <Switch
          checked={reviewSettings.enabled}
          disabled={loading || saving}
          onCheckedChange={(enabled) => updateSettings({ review: { enabled } })}
          aria-label="Enable review preset"
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 flex-col gap-0.5">
          <Label htmlFor="review-agent" className="text-sm font-medium text-foreground">
            Review agent
          </Label>
          <p className="text-sm text-muted-foreground">
            Used when you launch a review chat from the task UI.
          </p>
        </div>
        <div id="review-agent" className="w-[183px] flex-shrink-0">
          <AgentSelector
            value={reviewSettings.agent as Agent}
            onChange={(agent) => updateSettings({ review: { agent } })}
            disabled={loading || saving}
            className="w-full"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-skill" className="text-sm font-medium text-foreground">
          Review skill
        </Label>
        <Select
          value={selectedSkillId}
          onValueChange={handleSkillChange}
          disabled={loading || saving}
        >
          <SelectTrigger id="review-skill" className="w-full">
            <SelectValue placeholder="None (use default prompt)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>None (use default prompt)</SelectItem>
            {installedSkills.map((skill) => (
              <SelectItem key={skill.id} value={skill.id}>
                {skill.displayName || skill.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Pick an installed skill to run as the review command. When set, clicking Review on a PR
          will invoke{' '}
          <code>
            /{'{'}skillId{'}'} {'{'}pr-url{'}'}
          </code>{' '}
          in the terminal.
        </p>
      </div>
    </div>
  );
};

export default ReviewAgentSettingsCard;
