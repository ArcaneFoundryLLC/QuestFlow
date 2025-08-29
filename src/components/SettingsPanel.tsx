'use client';

import React, { useState, useCallback } from 'react';
import { Card, Button, Input } from './atoms';
import { cn } from '@/utils/cn';
import { UserSettings, UpdateSettingsInput } from '@/models/settings';
import { QueueType, getAllQueueTypes } from '@/models/queue';

export interface SettingsPanelProps {
  settings: UserSettings;
  onSettingsChange: (settings: UserSettings) => void;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * Queue display names for better UX
 */
const QUEUE_DISPLAY_NAMES: Record<QueueType, string> = {
  [QueueType.STANDARD_BO1]: 'Standard (Best of 1)',
  [QueueType.STANDARD_BO3]: 'Standard (Best of 3)',
  [QueueType.HISTORIC_BO1]: 'Historic (Best of 1)',
  [QueueType.HISTORIC_BO3]: 'Historic (Best of 3)',
  [QueueType.QUICK_DRAFT]: 'Quick Draft',
  [QueueType.PREMIER_DRAFT]: 'Premier Draft',
  [QueueType.TRADITIONAL_DRAFT]: 'Traditional Draft',
  [QueueType.MIDWEEK_MAGIC]: 'Midweek Magic',
  [QueueType.ALCHEMY_BO1]: 'Alchemy (Best of 1)',
  [QueueType.EXPLORER_BO1]: 'Explorer (Best of 1)',
};

/**
 * Settings panel component with collapsible interface
 * Provides controls for win rate, queue preferences, and time estimates
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  className,
  isCollapsed = true,
  onToggleCollapse,
}) => {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Update local settings and track changes
  const updateLocalSettings = useCallback((updates: UpdateSettingsInput) => {
    const newSettings = { ...localSettings, ...updates };
    setLocalSettings(newSettings);
    setHasUnsavedChanges(true);
    
    // Immediately apply changes for real-time updates
    onSettingsChange(newSettings);
  }, [localSettings, onSettingsChange]);

  // Handle win rate changes
  const handleWinRateChange = useCallback((value: number) => {
    const winRate = Math.max(0.3, Math.min(0.8, value / 100));
    updateLocalSettings({ defaultWinRate: winRate });
  }, [updateLocalSettings]);

  // Handle queue preference toggles
  const handleQueueToggle = useCallback((queueType: QueueType) => {
    const currentQueues = localSettings.preferredQueues;
    let newQueues: QueueType[];

    if (currentQueues.includes(queueType)) {
      // Remove queue (but ensure at least one remains)
      newQueues = currentQueues.filter(q => q !== queueType);
      if (newQueues.length === 0) {
        // Don't allow removing the last queue
        return;
      }
    } else {
      // Add queue
      newQueues = [...currentQueues, queueType];
    }

    updateLocalSettings({ preferredQueues: newQueues });
  }, [localSettings.preferredQueues, updateLocalSettings]);

  // Handle minutes per game changes
  const handleMinutesPerGameChange = useCallback((value: number) => {
    const minutes = Math.max(3, Math.min(30, value));
    updateLocalSettings({ minutesPerGame: minutes });
  }, [updateLocalSettings]);

  // Save changes explicitly (for future use if needed)
  const handleSaveChanges = useCallback(() => {
    onSettingsChange(localSettings);
    setHasUnsavedChanges(false);
  }, [localSettings, onSettingsChange]);

  // Reset to original settings
  const handleResetChanges = useCallback(() => {
    setLocalSettings(settings);
    setHasUnsavedChanges(false);
    onSettingsChange(settings);
  }, [settings, onSettingsChange]);

  // Sync with external settings changes
  React.useEffect(() => {
    setLocalSettings(settings);
    setHasUnsavedChanges(false);
  }, [settings]);

  return (
    <Card className={cn('transition-all duration-200', className)}>
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 text-gray-600">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
          {hasUnsavedChanges && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Auto-saved
            </span>
          )}
        </div>
        
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="p-2"
            aria-label={isCollapsed ? 'Expand settings' : 'Collapse settings'}
          >
            <svg
              className={cn('w-4 h-4 transition-transform', isCollapsed ? 'rotate-0' : 'rotate-180')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </Button>
        )}
      </div>

      {/* Settings content */}
      {!isCollapsed && (
        <div className="p-4 space-y-6">
          {/* Win Rate Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Default Win Rate
              </label>
              <span className="text-sm text-gray-500">
                {Math.round(localSettings.defaultWinRate * 100)}%
              </span>
            </div>
            
            <div className="space-y-2">
              <input
                type="range"
                min="30"
                max="80"
                step="5"
                value={Math.round(localSettings.defaultWinRate * 100)}
                onChange={(e) => handleWinRateChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                aria-label="Default win rate percentage"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>30%</span>
                <span>50%</span>
                <span>80%</span>
              </div>
            </div>
            
            <p className="text-xs text-gray-600">
              Your estimated win rate across all queues. This affects EV calculations and time estimates.
            </p>
          </div>

          {/* Queue Preferences Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Preferred Queues
              </label>
              <span className="text-sm text-gray-500">
                {localSettings.preferredQueues.length} selected
              </span>
            </div>
            
            <div className="space-y-2">
              {getAllQueueTypes().map((queueType) => {
                const isSelected = localSettings.preferredQueues.includes(queueType);
                const isLastSelected = localSettings.preferredQueues.length === 1 && isSelected;
                
                return (
                  <label
                    key={queueType}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                      isSelected
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300',
                      isLastSelected && 'opacity-75 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => !isLastSelected && handleQueueToggle(queueType)}
                        disabled={isLastSelected}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {QUEUE_DISPLAY_NAMES[queueType]}
                      </span>
                    </div>
                    
                    {isLastSelected && (
                      <span className="text-xs text-gray-500">
                        Required
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            
            <p className="text-xs text-gray-600">
              Select which queues to include in optimization. At least one queue must be selected.
            </p>
          </div>

          {/* Time Estimates Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Default Minutes Per Game
              </label>
              <span className="text-sm text-gray-500">
                {localSettings.minutesPerGame} min
              </span>
            </div>
            
            <div className="space-y-2">
              <input
                type="range"
                min="3"
                max="30"
                step="1"
                value={localSettings.minutesPerGame}
                onChange={(e) => handleMinutesPerGameChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                aria-label="Default minutes per game"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>3 min</span>
                <span>15 min</span>
                <span>30 min</span>
              </div>
            </div>
            
            <p className="text-xs text-gray-600">
              Default time estimate per game. Individual queues may override this based on format.
            </p>
          </div>

          {/* Action Buttons (for future use) */}
          {hasUnsavedChanges && (
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResetChanges}
                className="flex-1"
              >
                Reset
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveChanges}
                className="flex-1"
              >
                Save Changes
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default SettingsPanel;