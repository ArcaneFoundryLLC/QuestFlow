import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestInputForm } from '../QuestInputForm';
import { Quest, QuestType, MTGAColor } from '@/models';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the uuid function
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

describe('QuestInputForm', () => {
  const mockOnPlanGenerate = jest.fn();
  const mockOnQuestsChange = jest.fn();
  const mockOnTimeBudgetChange = jest.fn();
  const mockOnWinRateChange = jest.fn();

  const defaultProps = {
    onPlanGenerate: mockOnPlanGenerate,
    onQuestsChange: mockOnQuestsChange,
    onTimeBudgetChange: mockOnTimeBudgetChange,
    onWinRateChange: mockOnWinRateChange,
  };

  const mockQuest: Quest = {
    id: 'test-quest-1',
    type: QuestType.WIN,
    description: 'Win 5 games',
    remaining: 3,
    expiresInDays: 2,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders with default values', () => {
      render(<QuestInputForm {...defaultProps} />);
      
      expect(screen.getByText('Your Quests')).toBeInTheDocument();
      expect(screen.getByText('Time Budget')).toBeInTheDocument();
      expect(screen.getByText('Win Rate')).toBeInTheDocument();
      expect(screen.getByText('Available Time: 60 minutes')).toBeInTheDocument();
      expect(screen.getByText('Expected Win Rate: 50%')).toBeInTheDocument();
    });

    it('renders with initial quests', () => {
      render(<QuestInputForm {...defaultProps} initialQuests={[mockQuest]} />);
      
      expect(screen.getByText('Win 5 games')).toBeInTheDocument();
      expect(screen.getByText('3 remaining')).toBeInTheDocument();
      expect(screen.getByText('Expires in 2 days')).toBeInTheDocument();
    });

    it('shows empty state when no quests', () => {
      render(<QuestInputForm {...defaultProps} />);
      
      expect(screen.getByText('No quests added yet')).toBeInTheDocument();
      expect(screen.getByText('Add your MTGA daily quests to get started')).toBeInTheDocument();
    });
  });

  describe('Quest Management', () => {
    it('shows add quest form when Add Quest button is clicked', async () => {
      const user = userEvent.setup();
      render(<QuestInputForm {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: 'Add Quest' }));
      
      expect(screen.getByText('Add New Quest')).toBeInTheDocument();
      expect(screen.getByText('Quest Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Quest Description')).toBeInTheDocument();
    });

    it('adds a new quest successfully', async () => {
      const user = userEvent.setup();
      render(<QuestInputForm {...defaultProps} />);
      
      // Click the header "Add Quest" button to open the form
      await user.click(screen.getByRole('button', { name: 'Add Quest' }));
      
      // Fill out the form
      await user.type(screen.getByLabelText('Quest Description'), 'Win 5 games');
      await user.type(screen.getByLabelText('Remaining Count'), '5');
      
      // Submit the form - get the enabled button (not the disabled header button)
      const addButtons = screen.getAllByRole('button', { name: 'Add Quest' });
      const enabledAddButton = addButtons.find(button => !button.hasAttribute('disabled'));
      await user.click(enabledAddButton!);
      
      await waitFor(() => {
        expect(mockOnQuestsChange).toHaveBeenCalledWith([
          expect.objectContaining({
            id: 'mock-uuid-1234',
            type: QuestType.WIN,
            description: 'Win 5 games',
            remaining: 5,
            expiresInDays: 3,
          }),
        ]);
      });
    });
  });

  describe('Time Budget Control', () => {
    it('updates time budget when slider changes', () => {
      render(<QuestInputForm {...defaultProps} />);
      
      const slider = screen.getByLabelText(/available time/i);
      
      fireEvent.change(slider, { target: { value: '90' } });
      
      expect(screen.getByText('Available Time: 90 minutes')).toBeInTheDocument();
      expect(mockOnTimeBudgetChange).toHaveBeenCalledWith(90);
    });
  });

  describe('Win Rate Control', () => {
    it('updates win rate when slider changes', () => {
      render(<QuestInputForm {...defaultProps} />);
      
      const slider = screen.getByLabelText(/expected win rate/i);
      
      fireEvent.change(slider, { target: { value: '70' } });
      
      expect(screen.getByText('Expected Win Rate: 70%')).toBeInTheDocument();
      expect(mockOnWinRateChange).toHaveBeenCalledWith(70);
    });

    it('shows win rate tooltip', () => {
      render(<QuestInputForm {...defaultProps} initialWinRate={70} />);
      
      expect(screen.getByText(/Highly skilled player with optimized deck/)).toBeInTheDocument();
    });
  });

  describe('Plan Generation', () => {
    it('shows generate plan button when quests exist', () => {
      render(<QuestInputForm {...defaultProps} initialQuests={[mockQuest]} />);
      
      expect(screen.getByText('Generate Optimized Plan')).toBeInTheDocument();
    });

    it('does not show generate plan button when no quests', () => {
      render(<QuestInputForm {...defaultProps} />);
      
      expect(screen.queryByText('Generate Optimized Plan')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<QuestInputForm {...defaultProps} />);
      
      expect(screen.getByLabelText(/available time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expected win rate/i)).toBeInTheDocument();
    });
  });
});