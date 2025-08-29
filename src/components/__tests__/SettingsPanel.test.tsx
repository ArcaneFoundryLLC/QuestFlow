import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from '../SettingsPanel';
import { createDefaultSettings } from '@/models/settings';
import { QueueType } from '@/models/queue';

// Mock the cn utility
jest.mock('@/utils/cn', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}));

describe('SettingsPanel', () => {
  const defaultSettings = createDefaultSettings();
  const mockOnSettingsChange = jest.fn();
  const mockOnToggleCollapse = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderSettingsPanel = (props = {}) => {
    return render(
      <SettingsPanel
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        isCollapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
        {...props}
      />
    );
  };

  describe('Rendering', () => {
    it('renders settings panel header', () => {
      renderSettingsPanel();
      
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByLabelText('Collapse settings')).toBeInTheDocument();
    });

    it('renders collapsed state correctly', () => {
      renderSettingsPanel({ isCollapsed: true });
      
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.queryByText('Default Win Rate')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Expand settings')).toBeInTheDocument();
    });

    it('renders expanded state with all sections', () => {
      renderSettingsPanel();
      
      expect(screen.getByText('Default Win Rate')).toBeInTheDocument();
      expect(screen.getByText('Preferred Queues')).toBeInTheDocument();
      expect(screen.getByText('Default Minutes Per Game')).toBeInTheDocument();
    });

    it('displays current win rate percentage', () => {
      const settings = { ...defaultSettings, defaultWinRate: 0.6 };
      renderSettingsPanel({ settings });
      
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('displays current minutes per game', () => {
      const settings = { ...defaultSettings, minutesPerGame: 12 };
      renderSettingsPanel({ settings });
      
      expect(screen.getByText('12 min')).toBeInTheDocument();
    });

    it('displays number of selected queues', () => {
      const settings = { 
        ...defaultSettings, 
        preferredQueues: [QueueType.STANDARD_BO1, QueueType.HISTORIC_BO1, QueueType.QUICK_DRAFT] 
      };
      renderSettingsPanel({ settings });
      
      expect(screen.getByText('3 selected')).toBeInTheDocument();
    });
  });

  describe('Win Rate Control', () => {
    it('updates win rate when slider changes', async () => {
      renderSettingsPanel();
      
      const slider = screen.getByLabelText('Default win rate percentage');
      fireEvent.change(slider, { target: { value: '65' } });
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            defaultWinRate: 0.65,
          })
        );
      });
    });

    it('enforces win rate minimum of 30%', async () => {
      const user = userEvent.setup();
      renderSettingsPanel();
      
      const slider = screen.getByLabelText('Default win rate percentage');
      fireEvent.change(slider, { target: { value: '25' } });
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            defaultWinRate: 0.3,
          })
        );
      });
    });

    it('enforces win rate maximum of 80%', async () => {
      const user = userEvent.setup();
      renderSettingsPanel();
      
      const slider = screen.getByLabelText('Default win rate percentage');
      fireEvent.change(slider, { target: { value: '85' } });
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            defaultWinRate: 0.8,
          })
        );
      });
    });

    it('displays win rate guidance text', () => {
      renderSettingsPanel();
      
      expect(screen.getByText(/Your estimated win rate across all queues/)).toBeInTheDocument();
    });
  });

  describe('Queue Preferences', () => {
    it('renders all available queues', () => {
      renderSettingsPanel();
      
      expect(screen.getByText('Standard (Best of 1)')).toBeInTheDocument();
      expect(screen.getByText('Historic (Best of 1)')).toBeInTheDocument();
      expect(screen.getByText('Quick Draft')).toBeInTheDocument();
      expect(screen.getByText('Premier Draft')).toBeInTheDocument();
    });

    it('shows selected queues as checked', () => {
      const settings = { 
        ...defaultSettings, 
        preferredQueues: [QueueType.STANDARD_BO1, QueueType.QUICK_DRAFT] 
      };
      renderSettingsPanel({ settings });
      
      const standardCheckbox = screen.getByRole('checkbox', { name: /Standard \(Best of 1\)/ });
      const quickDraftCheckbox = screen.getByRole('checkbox', { name: /Quick Draft/ });
      const historicCheckbox = screen.getByRole('checkbox', { name: /Historic \(Best of 1\)/ });
      
      expect(standardCheckbox).toBeChecked();
      expect(quickDraftCheckbox).toBeChecked();
      expect(historicCheckbox).not.toBeChecked();
    });

    it('toggles queue selection when clicked', async () => {
      const user = userEvent.setup();
      // Start with settings that don't include Historic BO1
      const settings = { 
        ...defaultSettings, 
        preferredQueues: [QueueType.STANDARD_BO1, QueueType.QUICK_DRAFT] 
      };
      renderSettingsPanel({ settings });
      
      const historicCheckbox = screen.getByRole('checkbox', { name: /Historic \(Best of 1\)/ });
      await user.click(historicCheckbox);
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            preferredQueues: expect.arrayContaining([QueueType.HISTORIC_BO1]),
          })
        );
      });
    });

    it('removes queue when unchecked', async () => {
      const user = userEvent.setup();
      const settings = { 
        ...defaultSettings, 
        preferredQueues: [QueueType.STANDARD_BO1, QueueType.HISTORIC_BO1] 
      };
      renderSettingsPanel({ settings });
      
      const historicCheckbox = screen.getByRole('checkbox', { name: /Historic \(Best of 1\)/ });
      await user.click(historicCheckbox);
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            preferredQueues: [QueueType.STANDARD_BO1],
          })
        );
      });
    });

    it('prevents removing the last queue', async () => {
      const user = userEvent.setup();
      const settings = { 
        ...defaultSettings, 
        preferredQueues: [QueueType.STANDARD_BO1] 
      };
      renderSettingsPanel({ settings });
      
      const standardCheckbox = screen.getByRole('checkbox', { name: /Standard \(Best of 1\)/ });
      expect(standardCheckbox).toBeDisabled();
      expect(screen.getByText('Required')).toBeInTheDocument();
      
      // Clicking should not trigger change
      await user.click(standardCheckbox);
      expect(mockOnSettingsChange).not.toHaveBeenCalled();
    });

    it('displays queue selection guidance text', () => {
      renderSettingsPanel();
      
      expect(screen.getByText(/Select which queues to include in optimization/)).toBeInTheDocument();
    });
  });

  describe('Minutes Per Game Control', () => {
    it('updates minutes per game when slider changes', async () => {
      renderSettingsPanel();
      
      const slider = screen.getByLabelText('Default minutes per game');
      fireEvent.change(slider, { target: { value: '15' } });
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            minutesPerGame: 15,
          })
        );
      });
    });

    it('enforces minimum of 3 minutes', async () => {
      renderSettingsPanel();
      
      const slider = screen.getByLabelText('Default minutes per game');
      fireEvent.change(slider, { target: { value: '1' } });
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            minutesPerGame: 3,
          })
        );
      });
    });

    it('enforces maximum of 30 minutes', async () => {
      renderSettingsPanel();
      
      const slider = screen.getByLabelText('Default minutes per game');
      fireEvent.change(slider, { target: { value: '35' } });
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            minutesPerGame: 30,
          })
        );
      });
    });

    it('displays time estimate guidance text', () => {
      renderSettingsPanel();
      
      expect(screen.getByText(/Default time estimate per game/)).toBeInTheDocument();
    });
  });

  describe('Collapse/Expand Functionality', () => {
    it('calls onToggleCollapse when collapse button is clicked', async () => {
      const user = userEvent.setup();
      renderSettingsPanel();
      
      const collapseButton = screen.getByLabelText('Collapse settings');
      await user.click(collapseButton);
      
      expect(mockOnToggleCollapse).toHaveBeenCalledTimes(1);
    });

    it('does not render collapse button when onToggleCollapse is not provided', () => {
      renderSettingsPanel({ onToggleCollapse: undefined });
      
      expect(screen.queryByLabelText('Collapse settings')).not.toBeInTheDocument();
    });

    it('rotates chevron icon based on collapsed state', () => {
      const { rerender } = renderSettingsPanel({ isCollapsed: false });
      
      let chevron = screen.getByLabelText('Collapse settings').querySelector('svg');
      expect(chevron).toHaveClass('rotate-180');
      
      rerender(
        <SettingsPanel
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          isCollapsed={true}
          onToggleCollapse={mockOnToggleCollapse}
        />
      );
      
      chevron = screen.getByLabelText('Expand settings').querySelector('svg');
      expect(chevron).toHaveClass('rotate-0');
    });
  });

  describe('Real-time Updates', () => {
    it('shows auto-saved indicator when changes are made', async () => {
      renderSettingsPanel();
      
      const slider = screen.getByLabelText('Default win rate percentage');
      fireEvent.change(slider, { target: { value: '60' } });
      
      await waitFor(() => {
        expect(screen.getByText('Auto-saved')).toBeInTheDocument();
      });
    });

    it('syncs with external settings changes', () => {
      const { rerender } = renderSettingsPanel();
      
      const newSettings = { ...defaultSettings, defaultWinRate: 0.7 };
      rerender(
        <SettingsPanel
          settings={newSettings}
          onSettingsChange={mockOnSettingsChange}
          isCollapsed={false}
          onToggleCollapse={mockOnToggleCollapse}
        />
      );
      
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('immediately applies changes for real-time plan updates', async () => {
      renderSettingsPanel();
      
      const slider = screen.getByLabelText('Default win rate percentage');
      fireEvent.change(slider, { target: { value: '65' } });
      
      // Should call onSettingsChange immediately, not wait for explicit save
      expect(mockOnSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultWinRate: 0.65,
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for sliders', () => {
      renderSettingsPanel();
      
      expect(screen.getByLabelText('Default win rate percentage')).toBeInTheDocument();
      expect(screen.getByLabelText('Default minutes per game')).toBeInTheDocument();
    });

    it('has proper labels for checkboxes', () => {
      renderSettingsPanel();
      
      expect(screen.getByRole('checkbox', { name: /Standard \(Best of 1\)/ })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Historic \(Best of 1\)/ })).toBeInTheDocument();
    });

    it('has proper button labels for collapse/expand', () => {
      renderSettingsPanel({ isCollapsed: false });
      expect(screen.getByLabelText('Collapse settings')).toBeInTheDocument();
      
      renderSettingsPanel({ isCollapsed: true });
      expect(screen.getByLabelText('Expand settings')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles invalid settings gracefully', () => {
      const invalidSettings = {
        ...defaultSettings,
        defaultWinRate: 1.5, // Invalid value
        preferredQueues: [], // Invalid empty array
      };
      
      // Should not crash when rendering with invalid settings
      expect(() => renderSettingsPanel({ settings: invalidSettings })).not.toThrow();
    });

    it('prevents invalid queue configurations', async () => {
      const user = userEvent.setup();
      const settings = { 
        ...defaultSettings, 
        preferredQueues: [QueueType.STANDARD_BO1] 
      };
      renderSettingsPanel({ settings });
      
      // Last queue should be disabled and not clickable
      const standardCheckbox = screen.getByRole('checkbox', { name: /Standard \(Best of 1\)/ });
      expect(standardCheckbox).toBeDisabled();
      
      await user.click(standardCheckbox);
      expect(mockOnSettingsChange).not.toHaveBeenCalled();
    });
  });
});