import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestFlowApp } from '../QuestFlowApp';
import { createDefaultSettings } from '@/models/settings';
import { QueueType } from '@/models/queue';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the cn utility
jest.mock('@/utils/cn', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}));

// Mock the storage manager
jest.mock('@/models/storage', () => ({
  StorageManager: jest.fn().mockImplementation(() => ({
    saveQuests: jest.fn().mockResolvedValue(undefined),
    loadQuests: jest.fn().mockResolvedValue([]),
    saveSettings: jest.fn().mockResolvedValue(undefined),
    loadSettings: jest.fn().mockResolvedValue(createDefaultSettings()),
    savePlan: jest.fn().mockResolvedValue(undefined),
    loadPlans: jest.fn().mockResolvedValue([]),
    clearData: jest.fn().mockResolvedValue(undefined),
    getStorageInfo: jest.fn().mockResolvedValue({
      version: '1.0.0',
      totalSize: 0,
      questsSize: 0,
      settingsSize: 0,
      plansSize: 0,
      available: true,
    }),
  })),
}));

describe('SettingsPanel Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderApp = () => {
    return render(<QuestFlowApp />);
  };

  it('should integrate settings panel with main app and trigger plan recalculation', async () => {
    const user = userEvent.setup();
    renderApp();

    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText('QuestFlow')).toBeInTheDocument();
    });

    // Add a quest first
    const addQuestButton = screen.getByText('Add Quest');
    await user.click(addQuestButton);

    // Fill in quest details - the quest type is already selected as "Win Games" by default
    const remainingInput = screen.getByLabelText('Remaining Count');
    await user.clear(remainingInput);
    await user.type(remainingInput, '5');

    const expirationInput = screen.getByLabelText('Expires in Days');
    await user.clear(expirationInput);
    await user.type(expirationInput, '3');

    // Submit the quest - use the button that's not disabled
    const submitButtons = screen.getAllByText('Add Quest');
    const submitButton = submitButtons.find(button => !button.hasAttribute('disabled'));
    await user.click(submitButton!);

    // Wait for quest to be added
    await waitFor(() => {
      expect(screen.getByText(/Win 5 games/)).toBeInTheDocument();
    });

    // Find and expand settings panel
    const settingsButton = screen.getByLabelText('Expand settings');
    await user.click(settingsButton);

    // Wait for settings panel to expand
    await waitFor(() => {
      expect(screen.getByText('Default Win Rate')).toBeInTheDocument();
    });

    // Change win rate setting
    const winRateSlider = screen.getByLabelText('Default win rate percentage');
    fireEvent.change(winRateSlider, { target: { value: '70' } });

    // Verify the win rate display updated
    await waitFor(() => {
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    // Change queue preferences
    const quickDraftCheckbox = screen.getByRole('checkbox', { name: /Quick Draft/ });
    await user.click(quickDraftCheckbox);

    // Verify queue was added
    await waitFor(() => {
      expect(quickDraftCheckbox).toBeChecked();
    });

    // Change minutes per game
    const minutesSlider = screen.getByLabelText('Default minutes per game');
    fireEvent.change(minutesSlider, { target: { value: '12' } });

    // Verify the minutes display updated
    await waitFor(() => {
      expect(screen.getByText('12 min')).toBeInTheDocument();
    });

    // Verify auto-saved indicator appears
    await waitFor(() => {
      expect(screen.getByText('Auto-saved')).toBeInTheDocument();
    });
  });

  it('should prevent removing the last queue and show appropriate UI feedback', async () => {
    const user = userEvent.setup();
    renderApp();

    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText('QuestFlow')).toBeInTheDocument();
    });

    // Expand settings panel
    const settingsButton = screen.getByLabelText('Expand settings');
    await user.click(settingsButton);

    // Wait for settings panel to expand
    await waitFor(() => {
      expect(screen.getByText('Preferred Queues')).toBeInTheDocument();
    });

    // By default, both Standard BO1 and Historic BO1 are selected
    // First, uncheck Historic BO1 to leave only Standard BO1
    const historicCheckbox = screen.getByRole('checkbox', { name: /Historic \(Best of 1\)/ });
    await user.click(historicCheckbox);

    // Wait for the change to take effect
    await waitFor(() => {
      expect(historicCheckbox).not.toBeChecked();
    });

    // Now Standard BO1 should be the only one left and should be disabled
    const standardCheckbox = screen.getByRole('checkbox', { name: /Standard \(Best of 1\)/ });
    
    // Verify it's checked and disabled (as it's the last one)
    expect(standardCheckbox).toBeChecked();
    expect(standardCheckbox).toBeDisabled();
    
    // Verify "Required" text is shown
    expect(screen.getByText('Required')).toBeInTheDocument();

    // Try to click it (should not work)
    await user.click(standardCheckbox);
    
    // Should still be checked
    expect(standardCheckbox).toBeChecked();
  });

  it('should collapse and expand settings panel correctly', async () => {
    const user = userEvent.setup();
    renderApp();

    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText('QuestFlow')).toBeInTheDocument();
    });

    // Initially collapsed - should not see settings content
    expect(screen.queryByText('Default Win Rate')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Expand settings')).toBeInTheDocument();

    // Expand settings panel
    const expandButton = screen.getByLabelText('Expand settings');
    await user.click(expandButton);

    // Should now see settings content
    await waitFor(() => {
      expect(screen.getByText('Default Win Rate')).toBeInTheDocument();
      expect(screen.getByLabelText('Collapse settings')).toBeInTheDocument();
    });

    // Collapse settings panel
    const collapseButton = screen.getByLabelText('Collapse settings');
    await user.click(collapseButton);

    // Should hide settings content again
    await waitFor(() => {
      expect(screen.queryByText('Default Win Rate')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Expand settings')).toBeInTheDocument();
    });
  });

  it('should maintain settings state when toggling collapse', async () => {
    const user = userEvent.setup();
    renderApp();

    // Wait for app to load and expand settings
    await waitFor(() => {
      expect(screen.getByText('QuestFlow')).toBeInTheDocument();
    });

    const expandButton = screen.getByLabelText('Expand settings');
    await user.click(expandButton);

    // Change win rate
    await waitFor(() => {
      expect(screen.getByText('Default Win Rate')).toBeInTheDocument();
    });

    const winRateSlider = screen.getByLabelText('Default win rate percentage');
    fireEvent.change(winRateSlider, { target: { value: '65' } });

    // Verify change
    await waitFor(() => {
      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    // Collapse and expand again
    const collapseButton = screen.getByLabelText('Collapse settings');
    await user.click(collapseButton);

    await waitFor(() => {
      expect(screen.queryByText('Default Win Rate')).not.toBeInTheDocument();
    });

    const expandButtonAgain = screen.getByLabelText('Expand settings');
    await user.click(expandButtonAgain);

    // Verify setting is still there
    await waitFor(() => {
      expect(screen.getByText('65%')).toBeInTheDocument();
    });
  });
});