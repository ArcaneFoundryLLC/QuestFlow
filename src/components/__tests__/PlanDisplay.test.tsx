import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { v4 as uuidv4 } from 'uuid';
import PlanDisplay from '../PlanDisplay';
import {
  OptimizedPlan,
  PlanStep,
  Quest,
  QuestType,
  QueueType,
  Rewards,
  QuestProgress,
} from '@/models';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the cn utility
jest.mock('@/utils/cn', () => ({
  cn: (...classes: (string | undefined | boolean)[]) => 
    classes.filter(Boolean).join(' ')
}));

// Helper function to create mock rewards
const createMockRewards = (gold = 100, gems = 0, packs = 0): Rewards => ({
  gold,
  gems,
  packs,
});

// Helper function to create mock quest progress
const createMockQuestProgress = (questId: string, progressAmount = 1): QuestProgress => ({
  questId,
  progressAmount,
});

// Helper function to create mock plan step
const createMockPlanStep = (
  overrides: Partial<PlanStep> = {}
): PlanStep => ({
  id: uuidv4(),
  queue: QueueType.STANDARD_BO1,
  targetGames: 3,
  estimatedMinutes: 24,
  expectedRewards: createMockRewards(150),
  questProgress: [],
  completed: false,
  ...overrides,
});

// Helper function to create mock quest
const createMockQuest = (
  overrides: Partial<Quest> = {}
): Quest => ({
  id: uuidv4(),
  type: QuestType.WIN,
  description: 'Win 5 games',
  remaining: 5,
  expiresInDays: 3,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Helper function to create mock optimized plan
const createMockPlan = (
  overrides: Partial<OptimizedPlan> = {}
): OptimizedPlan => ({
  id: uuidv4(),
  steps: [createMockPlanStep()],
  totalEstimatedMinutes: 60,
  totalExpectedRewards: createMockRewards(300),
  questsCompleted: [],
  timeBudget: 60,
  winRate: 0.5,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('PlanDisplay', () => {
  const mockOnStepComplete = jest.fn();
  const mockOnPlanUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty Plan Handling', () => {
    it('should display empty state when plan has no steps', () => {
      const emptyPlan = createMockPlan({ steps: [] });
      
      render(
        <PlanDisplay
          plan={emptyPlan}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.getByText('No Plan Available')).toBeInTheDocument();
      expect(screen.getByText('Add some quests and generate a plan to see your optimized schedule.')).toBeInTheDocument();
    });
  });

  describe('Plan Header and Summary', () => {
    it('should display plan header with correct title', () => {
      const plan = createMockPlan();
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.getByText("Tonight's Plan")).toBeInTheDocument();
    });

    it('should show completion progress correctly', () => {
      const completedStep = createMockPlanStep({ completed: true });
      const incompleteStep = createMockPlanStep({ completed: false });
      const plan = createMockPlan({
        steps: [completedStep, incompleteStep]
      });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.getByText('1 of 2 steps completed (50%)')).toBeInTheDocument();
    });

    it('should display summary statistics correctly', () => {
      const step1 = createMockPlanStep({
        estimatedMinutes: 30,
        expectedRewards: createMockRewards(100, 50, 1),
        completed: false,
      });
      const step2 = createMockPlanStep({
        estimatedMinutes: 45,
        expectedRewards: createMockRewards(150, 0, 0),
        completed: false,
      });
      const plan = createMockPlan({
        steps: [step1, step2],
        questsCompleted: ['quest1', 'quest2'],
      });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.getByText('1h 15m')).toBeInTheDocument(); // Total time
      expect(screen.getByText('250 gold, 50 gems, 1 pack')).toBeInTheDocument(); // Total rewards
      
      // Find the quests to complete number in the summary section
      const summarySection = screen.getByText('Quests to Complete').closest('.text-center');
      expect(summarySection).toHaveTextContent('2');
    });
  });

  describe('Plan Steps Display', () => {
    it('should render plan steps with correct information', () => {
      const questId = uuidv4();
      const step = createMockPlanStep({
        queue: QueueType.STANDARD_BO1,
        targetGames: 5,
        estimatedMinutes: 40,
        expectedRewards: createMockRewards(250, 0, 0),
        questProgress: [createMockQuestProgress(questId, 2)],
      });
      const plan = createMockPlan({ steps: [step] });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.getByText('Play 5 games in Standard Ranked')).toBeInTheDocument();
      expect(screen.getByText('Best of 1 matches in Standard format')).toBeInTheDocument();
      expect(screen.getByText('~40m')).toBeInTheDocument();
      expect(screen.getAllByText('250 gold')).toHaveLength(2); // Summary and step
    });

    it('should handle singular game count correctly', () => {
      const step = createMockPlanStep({ targetGames: 1 });
      const plan = createMockPlan({ steps: [step] });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.getByText('Play 1 game in Standard Ranked')).toBeInTheDocument();
    });

    it('should display quest progress indicators', () => {
      const questId = uuidv4();
      const quest = createMockQuest({
        id: questId,
        description: 'Win 5 games',
      });
      const step = createMockPlanStep({
        questProgress: [createMockQuestProgress(questId, 3)],
      });
      const plan = createMockPlan({ steps: [step] });
      
      render(
        <PlanDisplay
          plan={plan}
          quests={[quest]}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.getByText('Quest Progress:')).toBeInTheDocument();
      expect(screen.getAllByText('Win 5 games')).toHaveLength(2); // Step progress and quest status
      expect(screen.getByText('+3')).toBeInTheDocument();
    });
  });

  describe('Step Completion Functionality', () => {
    it('should handle step completion toggle', async () => {
      const step = createMockPlanStep({ completed: false });
      const plan = createMockPlan({ steps: [step] });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      const checkbox = screen.getByRole('button', { name: /mark step 1 as complete/i });
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(mockOnStepComplete).toHaveBeenCalledWith(step.id, true);
      });
    });

    it('should handle step incompletion toggle', async () => {
      const step = createMockPlanStep({ completed: true });
      const plan = createMockPlan({ steps: [step] });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      const checkbox = screen.getByRole('button', { name: /mark step 1 as incomplete/i });
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(mockOnStepComplete).toHaveBeenCalledWith(step.id, false);
      });
    });

    it('should call onPlanUpdate when provided', async () => {
      const step = createMockPlanStep({ completed: false });
      const plan = createMockPlan({ steps: [step] });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
          onPlanUpdate={mockOnPlanUpdate}
        />
      );

      const checkbox = screen.getByRole('button', { name: /mark step 1 as complete/i });
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(mockOnPlanUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            steps: expect.arrayContaining([
              expect.objectContaining({
                id: step.id,
                completed: true,
              })
            ])
          })
        );
      });
    });

    it('should show completion checkmark for completed steps', () => {
      const step = createMockPlanStep({ completed: true });
      const plan = createMockPlan({ steps: [step] });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      const checkbox = screen.getByRole('button', { name: /mark step 1 as incomplete/i });
      expect(checkbox).toHaveClass('bg-green-600');
    });
  });

  describe('Next Step Actions', () => {
    it('should show next step button when steps remain', () => {
      const step1 = createMockPlanStep({ completed: true });
      const step2 = createMockPlanStep({ completed: false, queue: QueueType.HISTORIC_BO1 });
      const plan = createMockPlan({ steps: [step1, step2] });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.getByText('Next: Historic Ranked')).toBeInTheDocument();
      expect(screen.getByText('Mark Next Step Complete')).toBeInTheDocument();
    });

    it('should handle next step completion', async () => {
      const step1 = createMockPlanStep({ completed: true });
      const step2 = createMockPlanStep({ completed: false });
      const plan = createMockPlan({ steps: [step1, step2] });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      const nextStepButton = screen.getByText('Mark Next Step Complete');
      fireEvent.click(nextStepButton);

      await waitFor(() => {
        expect(mockOnStepComplete).toHaveBeenCalledWith(step2.id, true);
      });
    });

    it('should not show next step button when all steps are completed', () => {
      const step = createMockPlanStep({ completed: true });
      const plan = createMockPlan({ steps: [step] });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      // When all steps are completed, the next step section should not be shown
      expect(screen.queryByText('Mark Next Step Complete')).not.toBeInTheDocument();
      expect(screen.getByText('🎉 Plan Complete!')).toBeInTheDocument();
    });
  });

  describe('Plan Completion', () => {
    it('should show completion message when all steps are done', () => {
      const step1 = createMockPlanStep({ completed: true });
      const step2 = createMockPlanStep({ completed: true });
      const plan = createMockPlan({
        steps: [step1, step2],
        totalExpectedRewards: createMockRewards(500, 100, 2),
      });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.getByText('🎉 Plan Complete!')).toBeInTheDocument();
      expect(screen.getByText('You\'ve completed all steps and earned 500 gold, 100 gems, 2 packs')).toBeInTheDocument();
    });

    it('should not show completion message when steps remain', () => {
      const step1 = createMockPlanStep({ completed: true });
      const step2 = createMockPlanStep({ completed: false });
      const plan = createMockPlan({ steps: [step1, step2] });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.queryByText('🎉 Plan Complete!')).not.toBeInTheDocument();
    });
  });

  describe('Quest Status Display', () => {
    it('should show quest completion status', () => {
      const questId1 = uuidv4();
      const questId2 = uuidv4();
      const questId3 = uuidv4();
      
      const quest1 = createMockQuest({
        id: questId1,
        description: 'Win 5 games',
      });
      const quest2 = createMockQuest({
        id: questId2,
        description: 'Cast 20 spells',
      });
      const quest3 = createMockQuest({
        id: questId3,
        description: 'Play 3 games with red',
      });

      const step = createMockPlanStep({
        completed: true,
        questProgress: [createMockQuestProgress(questId1, 5)],
      });
      
      const plan = createMockPlan({
        steps: [step],
        questsCompleted: [questId2],
      });
      
      render(
        <PlanDisplay
          plan={plan}
          quests={[quest1, quest2, quest3]}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.getByText('Quest Status')).toBeInTheDocument();
      
      // Find quest descriptions in the quest status section
      const questStatusSection = screen.getByText('Quest Status').closest('.rounded-lg');
      expect(questStatusSection).toBeInTheDocument();
      
      // Check status indicators
      expect(screen.getByText('Completed ✓')).toBeInTheDocument();
      expect(screen.getByText('Will Complete')).toBeInTheDocument();
      expect(screen.getByText('Not in Plan')).toBeInTheDocument();
    });

    it('should not show quest status section when no quests provided', () => {
      const plan = createMockPlan();
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.queryByText('Quest Status')).not.toBeInTheDocument();
    });
  });

  describe('Reward Formatting', () => {
    it('should format rewards with only gold correctly', () => {
      const step = createMockPlanStep({
        expectedRewards: createMockRewards(250, 0, 0),
      });
      const plan = createMockPlan({ steps: [step] });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.getAllByText('250 gold')).toHaveLength(2); // Summary and step
    });

    it('should format rewards with multiple types correctly', () => {
      const step = createMockPlanStep({
        expectedRewards: createMockRewards(1000, 500, 3),
      });
      const plan = createMockPlan({ steps: [step] });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.getAllByText('1,000 gold, 500 gems, 3 packs')).toHaveLength(2); // Summary and step
    });

    it('should handle singular pack count correctly', () => {
      const step = createMockPlanStep({
        expectedRewards: createMockRewards(0, 0, 1),
      });
      const plan = createMockPlan({ steps: [step] });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.getAllByText('1 pack')).toHaveLength(2); // Summary and step
    });

    it('should show "No rewards" when all rewards are zero', () => {
      const step = createMockPlanStep({
        expectedRewards: createMockRewards(0, 0, 0),
      });
      const plan = createMockPlan({ steps: [step] });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.getAllByText('No rewards')).toHaveLength(2); // Summary and step
    });
  });

  describe('Time Formatting', () => {
    it('should format minutes correctly', () => {
      const step = createMockPlanStep({ estimatedMinutes: 45 });
      const plan = createMockPlan({ steps: [step] });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.getByText('~45m')).toBeInTheDocument();
    });

    it('should format hours correctly', () => {
      const step = createMockPlanStep({ estimatedMinutes: 120 });
      const plan = createMockPlan({ steps: [step] });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.getByText('~2h')).toBeInTheDocument();
    });

    it('should format hours and minutes correctly', () => {
      const step = createMockPlanStep({ estimatedMinutes: 90 });
      const plan = createMockPlan({ steps: [step] });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.getByText('~1h 30m')).toBeInTheDocument();
    });
  });

  describe('Queue Type Display', () => {
    it('should display different queue types correctly', () => {
      const step1 = createMockPlanStep({ queue: QueueType.QUICK_DRAFT });
      const step2 = createMockPlanStep({ queue: QueueType.MIDWEEK_MAGIC });
      const plan = createMockPlan({ steps: [step1, step2] });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      expect(screen.getByText('Play 3 games in Quick Draft')).toBeInTheDocument();
      expect(screen.getByText('Draft against bots, play against humans')).toBeInTheDocument();
      expect(screen.getByText('Play 3 games in Midweek Magic')).toBeInTheDocument();
      expect(screen.getByText('Special weekly event format')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for checkboxes', () => {
      const step = createMockPlanStep();
      const plan = createMockPlan({ steps: [step] });
      
      render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      const checkbox = screen.getByRole('button', { name: /mark step 1 as complete/i });
      expect(checkbox).toBeInTheDocument();
    });

    it('should update ARIA labels when step completion changes', async () => {
      const step = createMockPlanStep({ completed: false });
      const plan = createMockPlan({ steps: [step] });
      
      const { rerender } = render(
        <PlanDisplay
          plan={plan}
          onStepComplete={mockOnStepComplete}
        />
      );

      // Initially should show "complete"
      expect(screen.getByRole('button', { name: /mark step 1 as complete/i })).toBeInTheDocument();

      // After clicking, should show "incomplete"
      const checkbox = screen.getByRole('button', { name: /mark step 1 as complete/i });
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mark step 1 as incomplete/i })).toBeInTheDocument();
      });
    });
  });
});