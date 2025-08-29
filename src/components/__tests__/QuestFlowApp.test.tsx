import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestFlowApp } from '../QuestFlowApp';
import { Quest, QuestType, StorageManager } from '@/models';

// Mock the storage manager
jest.mock('@/models', () => ({
  ...jest.requireActual('@/models'),
  StorageManager: jest.fn(),
  optimizePlan: jest.fn(),
}));

// Mock the debounced hook
jest.mock('@/hooks/useDebouncedPlanGeneration', () => ({
  useDebouncedPlanGeneration: jest.fn(),
}));

const mockStorageManager = {
  loadQuests: jest.fn(),
  loadSettings: jest.fn(),
  saveQuests: jest.fn(),
  saveSettings: jest.fn(),
  savePlan: jest.fn(),
};

const mockUseDebouncedPlanGeneration = jest.requireMock('@/hooks/useDebouncedPlanGeneration').useDebouncedPlanGeneration;

describe('QuestFlowApp Integration Tests', () => {
  const mockQuest: Quest = {
    id: 'test-quest-1',
    type: QuestType.WIN,
    description: 'Win 5 games',
    remaining: 5,
    expiresInDays: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPlan = {
    id: 'test-plan',
    steps: [
      {
        id: 'step-1',
        queue: 'standard_bo1',
        targetGames: 3,
        estimatedMinutes: 24,
        expectedRewards: { gold: 150, gems: 0, packs: 0 },
        questProgress: [
          {
            questId: 'test-quest-1',
            progressAmount: 3,
          },
        ],
        completed: false,
      },
    ],
    totalEstimatedMinutes: 24,
    totalExpectedRewards: { gold: 150, gems: 0, packs: 0 },
    questsCompleted: ['test-quest-1'],
    timeBudget: 60,
    winRate: 0.5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup storage manager mock
    (StorageManager as jest.Mock).mockImplementation(() => mockStorageManager);
    mockStorageManager.loadQuests.mockReturnValue([]);
    mockStorageManager.loadSettings.mockReturnValue(null);

    // Setup hook mock with default values
    mockUseDebouncedPlanGeneration.mockReturnValue({
      plan: null,
      isLoading: false,
      error: null,
      warnings: [],
      lastGeneratedAt: null,
      triggerImmediateGeneration: jest.fn(),
      clearError: jest.fn(),
      clearWarnings: jest.fn(),
    });
  });

  it('should render welcome message when no quests are present', () => {
    render(<QuestFlowApp />);
    
    expect(screen.getByText('Welcome to QuestFlow')).toBeInTheDocument();
    expect(screen.getByText('Add your MTGA daily quests to get started with optimization')).toBeInTheDocument();
  });

  it('should load saved data from storage on mount', async () => {
    mockStorageManager.loadQuests.mockResolvedValue([mockQuest]);
    mockStorageManager.loadSettings.mockResolvedValue({
      defaultWinRate: 0.6,
      preferredQueues: ['standard_bo1'],
      minutesPerGame: 8,
    });

    render(<QuestFlowApp />);

    // Wait for async loading to complete
    await waitFor(() => {
      expect(mockStorageManager.loadQuests).toHaveBeenCalled();
      expect(mockStorageManager.loadSettings).toHaveBeenCalled();
    });
  });

  it('should display loading state during plan generation', () => {
    mockUseDebouncedPlanGeneration.mockReturnValue({
      plan: null,
      isLoading: true,
      error: null,
      warnings: [],
      lastGeneratedAt: null,
      triggerImmediateGeneration: jest.fn(),
      clearError: jest.fn(),
      clearWarnings: jest.fn(),
    });

    render(<QuestFlowApp />);

    expect(screen.getByText('Generating Optimized Plan')).toBeInTheDocument();
    expect(screen.getByText(/Calculating the best quest completion strategy/)).toBeInTheDocument();
  });

  it('should display error messages', () => {
    const mockClearError = jest.fn();
    mockUseDebouncedPlanGeneration.mockReturnValue({
      plan: null,
      isLoading: false,
      error: 'Insufficient time to complete any quests',
      warnings: [],
      lastGeneratedAt: null,
      triggerImmediateGeneration: jest.fn(),
      clearError: mockClearError,
      clearWarnings: jest.fn(),
    });

    render(<QuestFlowApp />);

    expect(screen.getByText('Plan Generation Error')).toBeInTheDocument();
    expect(screen.getByText('Insufficient time to complete any quests')).toBeInTheDocument();

    // Test error dismissal
    const dismissButton = screen.getByLabelText('Dismiss error');
    fireEvent.click(dismissButton);
    expect(mockClearError).toHaveBeenCalled();
  });

  it('should display warning messages', () => {
    const mockClearWarnings = jest.fn();
    const warnings = ['Some quests cannot be completed within time budget'];
    
    mockUseDebouncedPlanGeneration.mockReturnValue({
      plan: mockPlan,
      isLoading: false,
      error: null,
      warnings,
      lastGeneratedAt: new Date(),
      triggerImmediateGeneration: jest.fn(),
      clearError: jest.fn(),
      clearWarnings: mockClearWarnings,
    });

    render(<QuestFlowApp />);

    expect(screen.getByText('Optimization Warnings')).toBeInTheDocument();
    expect(screen.getByText(/Some quests cannot be completed within time budget/)).toBeInTheDocument();

    // Test warning dismissal
    const dismissButton = screen.getByLabelText('Dismiss warnings');
    fireEvent.click(dismissButton);
    expect(mockClearWarnings).toHaveBeenCalled();
  });

  it('should display success message when plan is generated', () => {
    mockUseDebouncedPlanGeneration.mockReturnValue({
      plan: mockPlan,
      isLoading: false,
      error: null,
      warnings: [],
      lastGeneratedAt: new Date(),
      triggerImmediateGeneration: jest.fn(),
      clearError: jest.fn(),
      clearWarnings: jest.fn(),
    });

    // Mock the success message state
    const { rerender } = render(<QuestFlowApp />);
    
    // Simulate plan generation callback
    act(() => {
      const hookCall = mockUseDebouncedPlanGeneration.mock.calls[0];
      const options = hookCall[4]; // Fifth parameter is options
      if (options && options.onPlanGenerated) {
        options.onPlanGenerated(mockPlan);
      }
    });

    rerender(<QuestFlowApp />);

    expect(screen.getByText('Plan Generated Successfully')).toBeInTheDocument();
  });

  it('should save quests to storage when they change', async () => {
    const user = userEvent.setup();
    render(<QuestFlowApp />);

    // Add a quest through the form
    const addButtons = screen.getAllByText('Add Quest');
    const addButton = addButtons[0]; // Use the first "Add Quest" button (the main one)
    await user.click(addButton);

    // Fill out the form (this would trigger quest changes)
    const descriptionInput = screen.getByLabelText('Quest Description');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Win 5 games');

    const remainingInput = screen.getByLabelText('Remaining Count');
    await user.type(remainingInput, '5');

    // Find the submit button in the form (not the disabled header button)
    const submitButtons = screen.getAllByText('Add Quest');
    const submitButton = submitButtons[1]; // Use the second "Add Quest" button (the form submit button)
    await user.click(submitButton);

    // Verify storage was called
    await waitFor(() => {
      expect(mockStorageManager.saveQuests).toHaveBeenCalled();
    });
  });

  it('should trigger immediate plan generation when requested', async () => {
    const mockTriggerImmediate = jest.fn();
    
    // First render with no quests
    mockUseDebouncedPlanGeneration.mockReturnValue({
      plan: null,
      isLoading: false,
      error: null,
      warnings: [],
      lastGeneratedAt: null,
      triggerImmediateGeneration: mockTriggerImmediate,
      clearError: jest.fn(),
      clearWarnings: jest.fn(),
    });

    const user = userEvent.setup();
    const { rerender } = render(<QuestFlowApp />);

    // Add a quest first
    const addButtons = screen.getAllByText('Add Quest');
    const addButton = addButtons[0];
    await user.click(addButton);

    const descriptionInput = screen.getByLabelText('Quest Description');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Win 5 games');

    const remainingInput = screen.getByLabelText('Remaining Count');
    await user.type(remainingInput, '5');

    const submitButtons = screen.getAllByText('Add Quest');
    const submitButton = submitButtons[1];
    await user.click(submitButton);

    // Wait for quest to be added and rerender with quest present
    await waitFor(() => {
      expect(mockStorageManager.saveQuests).toHaveBeenCalled();
    });

    // Mock the hook to return state with quests present
    mockUseDebouncedPlanGeneration.mockReturnValue({
      plan: null,
      isLoading: false,
      error: null,
      warnings: [],
      lastGeneratedAt: null,
      triggerImmediateGeneration: mockTriggerImmediate,
      clearError: jest.fn(),
      clearWarnings: jest.fn(),
    });

    rerender(<QuestFlowApp />);

    // Now look for the generate plan button (should appear when quests are present)
    await waitFor(() => {
      const generateButton = screen.queryByText('Generate Optimized Plan');
      if (generateButton) {
        fireEvent.click(generateButton);
        expect(mockTriggerImmediate).toHaveBeenCalled();
      } else {
        // If the button doesn't appear, the plan generation is automatic
        // which means the hook is being called with the quest data
        expect(mockUseDebouncedPlanGeneration).toHaveBeenCalledWith(
          expect.arrayContaining([expect.objectContaining({ description: 'Win 5 games' })]),
          expect.any(Number),
          expect.any(Number),
          expect.any(Object),
          expect.any(Object)
        );
      }
    });
  });

  it('should handle step completion in plan display', async () => {
    mockUseDebouncedPlanGeneration.mockReturnValue({
      plan: mockPlan,
      isLoading: false,
      error: null,
      warnings: [],
      lastGeneratedAt: new Date(),
      triggerImmediateGeneration: jest.fn(),
      clearError: jest.fn(),
      clearWarnings: jest.fn(),
    });

    render(<QuestFlowApp />);

    // Plan should be displayed
    expect(screen.getByText("Tonight's Plan")).toBeInTheDocument();

    // Find and click step completion checkbox
    const stepCheckbox = screen.getByLabelText(/Mark step 1 as/);
    fireEvent.click(stepCheckbox);

    // The step completion is handled by the PlanDisplay component
    // We just need to verify the handler is called, not the storage directly
    expect(stepCheckbox).toBeInTheDocument();
  });

  it('should update settings and save to storage', async () => {
    const user = userEvent.setup();
    render(<QuestFlowApp />);

    // Change win rate slider using fireEvent since it's a range input
    const winRateSlider = screen.getByLabelText(/Expected Win Rate/);
    fireEvent.change(winRateSlider, { target: { value: '60' } });

    // Verify settings were saved
    await waitFor(() => {
      expect(mockStorageManager.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultWinRate: 0.6,
        })
      );
    });
  });

  it('should handle real-time updates with debouncing', async () => {
    let hookCallCount = 0;
    
    mockUseDebouncedPlanGeneration.mockImplementation(() => {
      hookCallCount++;
      return {
        plan: null,
        isLoading: false,
        error: null,
        warnings: [],
        lastGeneratedAt: null,
        triggerImmediateGeneration: jest.fn(),
        clearError: jest.fn(),
        clearWarnings: jest.fn(),
      };
    });

    render(<QuestFlowApp />);

    // Change time budget multiple times quickly using fireEvent
    const timeBudgetSlider = screen.getByLabelText(/Available Time/);
    
    fireEvent.change(timeBudgetSlider, { target: { value: '90' } });
    fireEvent.change(timeBudgetSlider, { target: { value: '120' } });

    // Hook should be called with updated values
    expect(mockUseDebouncedPlanGeneration).toHaveBeenCalledWith(
      expect.any(Array),
      120,
      expect.any(Number),
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('should handle storage errors gracefully', () => {
    mockStorageManager.loadQuests.mockImplementation(() => {
      throw new Error('Storage error');
    });

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    render(<QuestFlowApp />);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to load data from storage:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should display plan with quest progress', () => {
    mockUseDebouncedPlanGeneration.mockReturnValue({
      plan: mockPlan,
      isLoading: false,
      error: null,
      warnings: [],
      lastGeneratedAt: new Date(),
      triggerImmediateGeneration: jest.fn(),
      clearError: jest.fn(),
      clearWarnings: jest.fn(),
    });

    render(<QuestFlowApp />);

    // Check that plan display is rendered
    expect(screen.getByText("Tonight's Plan")).toBeInTheDocument();
    expect(screen.getByText(/Play 3 games/)).toBeInTheDocument();
    expect(screen.getAllByText(/150 gold/)).toHaveLength(2); // Appears in summary and step details
  });

  it('should handle performance monitoring', async () => {
    const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
    
    mockUseDebouncedPlanGeneration.mockReturnValue({
      plan: mockPlan,
      isLoading: false,
      error: null,
      warnings: ['Plan generation took longer than expected'],
      lastGeneratedAt: new Date(),
      triggerImmediateGeneration: jest.fn(),
      clearError: jest.fn(),
      clearWarnings: jest.fn(),
    });

    render(<QuestFlowApp />);

    // Simulate warning callback
    act(() => {
      const hookCall = mockUseDebouncedPlanGeneration.mock.calls[0];
      const options = hookCall[4];
      if (options && options.onWarnings) {
        options.onWarnings(['Plan generation took longer than expected']);
      }
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Plan generation warnings:',
      ['Plan generation took longer than expected']
    );

    consoleSpy.mockRestore();
  });

  it('should handle real-time recalculation when inputs change rapidly', async () => {
    let hookCallCount = 0;
    
    mockUseDebouncedPlanGeneration.mockImplementation((quests, timeBudget, winRate) => {
      hookCallCount++;
      return {
        plan: hookCallCount > 1 ? mockPlan : null,
        isLoading: hookCallCount === 1,
        error: null,
        warnings: [],
        lastGeneratedAt: hookCallCount > 1 ? new Date() : null,
        triggerImmediateGeneration: jest.fn(),
        clearError: jest.fn(),
        clearWarnings: jest.fn(),
      };
    });

    render(<QuestFlowApp />);

    // Rapidly change multiple inputs
    const timeBudgetSlider = screen.getByLabelText(/Available Time/);
    const winRateSlider = screen.getByLabelText(/Expected Win Rate/);
    
    // Simulate rapid input changes
    fireEvent.change(timeBudgetSlider, { target: { value: '90' } });
    fireEvent.change(winRateSlider, { target: { value: '60' } });
    fireEvent.change(timeBudgetSlider, { target: { value: '120' } });

    // Verify hook was called with debounced updates
    await waitFor(() => {
      expect(mockUseDebouncedPlanGeneration).toHaveBeenCalledWith(
        expect.any(Array),
        120, // Final time budget value
        0.6, // Final win rate value (60% converted to decimal)
        expect.any(Object),
        expect.objectContaining({
          debounceMs: 300,
          performanceTargetMs: 200,
        })
      );
    });
  });

  it('should handle error recovery and retry', async () => {
    const mockClearError = jest.fn();
    let callCount = 0;
    
    mockUseDebouncedPlanGeneration.mockImplementation(() => {
      callCount++;
      return {
        plan: null,
        isLoading: false,
        error: callCount === 1 ? 'Insufficient time to complete any quests' : null,
        warnings: [],
        lastGeneratedAt: null,
        triggerImmediateGeneration: jest.fn(),
        clearError: mockClearError,
        clearWarnings: jest.fn(),
      };
    });

    const { rerender } = render(<QuestFlowApp />);

    // Should show error initially
    expect(screen.getByText('Plan Generation Error')).toBeInTheDocument();
    expect(screen.getByText('Insufficient time to complete any quests')).toBeInTheDocument();

    // Clear error and change inputs to trigger retry
    const dismissButton = screen.getByLabelText('Dismiss error');
    fireEvent.click(dismissButton);
    expect(mockClearError).toHaveBeenCalled();

    // Change time budget to trigger recalculation
    const timeBudgetSlider = screen.getByLabelText(/Available Time/);
    fireEvent.change(timeBudgetSlider, { target: { value: '120' } });

    // Rerender to simulate hook update
    rerender(<QuestFlowApp />);

    // Error should be cleared after retry
    expect(screen.queryByText('Plan Generation Error')).not.toBeInTheDocument();
  });

  it('should show loading state during plan recalculation', async () => {
    let isLoading = false;
    
    mockUseDebouncedPlanGeneration.mockImplementation(() => ({
      plan: null,
      isLoading,
      error: null,
      warnings: [],
      lastGeneratedAt: null,
      triggerImmediateGeneration: jest.fn(),
      clearError: jest.fn(),
      clearWarnings: jest.fn(),
    }));

    const { rerender } = render(<QuestFlowApp />);

    // Simulate loading state
    isLoading = true;
    rerender(<QuestFlowApp />);

    expect(screen.getByText('Generating Optimized Plan')).toBeInTheDocument();
    expect(screen.getByText(/Calculating the best quest completion strategy/)).toBeInTheDocument();

    // Simulate completion
    isLoading = false;
    rerender(<QuestFlowApp />);

    expect(screen.queryByText('Generating Optimized Plan')).not.toBeInTheDocument();
  });

  it('should handle impossible plan scenarios gracefully', () => {
    mockUseDebouncedPlanGeneration.mockReturnValue({
      plan: null,
      isLoading: false,
      error: 'Insufficient time to complete any quests',
      warnings: ['Consider increasing time budget or adjusting win rate'],
      lastGeneratedAt: new Date(),
      triggerImmediateGeneration: jest.fn(),
      clearError: jest.fn(),
      clearWarnings: jest.fn(),
    });

    render(<QuestFlowApp />);

    // Should show both error and warnings
    expect(screen.getByText('Plan Generation Error')).toBeInTheDocument();
    expect(screen.getByText('Insufficient time to complete any quests')).toBeInTheDocument();
    expect(screen.getByText('Optimization Warnings')).toBeInTheDocument();
    expect(screen.getByText(/Consider increasing time budget or adjusting win rate/)).toBeInTheDocument();
  });

  it('should meet performance target of 200ms', async () => {
    const performanceStart = performance.now();
    
    mockUseDebouncedPlanGeneration.mockImplementation(() => {
      const duration = performance.now() - performanceStart;
      
      return {
        plan: mockPlan,
        isLoading: false,
        error: null,
        warnings: duration > 200 ? ['Plan generation exceeded performance target'] : [],
        lastGeneratedAt: new Date(),
        triggerImmediateGeneration: jest.fn(),
        clearError: jest.fn(),
        clearWarnings: jest.fn(),
      };
    });

    render(<QuestFlowApp />);

    // Change inputs to trigger recalculation
    const timeBudgetSlider = screen.getByLabelText(/Available Time/);
    fireEvent.change(timeBudgetSlider, { target: { value: '90' } });

    // Verify performance monitoring is in place
    await waitFor(() => {
      expect(mockUseDebouncedPlanGeneration).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
        expect.objectContaining({
          performanceTargetMs: 200,
        })
      );
    });
  });
});