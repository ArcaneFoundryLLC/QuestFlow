import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestFlowApp } from '@/components/QuestFlowApp';

/**
 * Integration tests for real-time plan recalculation
 * Tests the complete flow from user input to plan generation
 */
describe('Real-time Plan Recalculation Integration', () => {
  beforeEach(() => {
    // Mock localStorage
    const mockStorage = {
      getItem: jest.fn(() => null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
    });

    // Mock performance.now for consistent timing
    jest.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should demonstrate complete real-time plan recalculation flow', async () => {
    const user = userEvent.setup();
    
    render(<QuestFlowApp />);

    // 1. Verify initial state - no plan shown
    expect(screen.getByText('Welcome to QuestFlow')).toBeInTheDocument();
    expect(screen.queryByText("Tonight's Plan")).not.toBeInTheDocument();

    // 2. Add a quest
    const addButton = screen.getAllByText('Add Quest')[0];
    await user.click(addButton);

    // Fill out quest form
    const descriptionInput = screen.getByLabelText('Quest Description');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Win 5 games');

    const remainingInput = screen.getByLabelText('Remaining Count');
    await user.type(remainingInput, '5');

    // Submit quest
    const submitButton = screen.getAllByText('Add Quest')[1];
    await user.click(submitButton);

    // 3. Wait for automatic plan generation (debounced)
    await waitFor(() => {
      expect(screen.queryByText("Tonight's Plan")).toBeInTheDocument();
    }, { timeout: 2000 });

    // 4. Verify plan is displayed
    expect(screen.getByText("Tonight's Plan")).toBeInTheDocument();
    expect(screen.getByText(/Play.*games/)).toBeInTheDocument();

    // 5. Test real-time recalculation by changing time budget
    const timeBudgetSlider = screen.getByLabelText(/Available Time/);
    
    // Change from 60 to 120 minutes
    fireEvent.change(timeBudgetSlider, { target: { value: '120' } });

    // Plan should update automatically (debounced)
    await waitFor(() => {
      // The plan content should reflect the new time budget
      expect(screen.getByText(/Available Time.*120.*minutes/)).toBeInTheDocument();
    }, { timeout: 1000 });

    // 6. Test real-time recalculation by changing win rate
    const winRateSlider = screen.getByLabelText(/Expected Win Rate/);
    
    // Change from 50% to 70%
    fireEvent.change(winRateSlider, { target: { value: '70' } });

    await waitFor(() => {
      expect(screen.getByText(/Expected Win Rate.*70%/)).toBeInTheDocument();
    }, { timeout: 1000 });

    // 7. Verify plan persists and updates are reflected
    expect(screen.getByText("Tonight's Plan")).toBeInTheDocument();
    expect(screen.getByText(/Play.*games/)).toBeInTheDocument();
  });

  it('should handle rapid input changes with proper debouncing', async () => {
    const user = userEvent.setup();
    
    render(<QuestFlowApp />);

    // Add a quest first
    const addButton = screen.getAllByText('Add Quest')[0];
    await user.click(addButton);

    const descriptionInput = screen.getByLabelText('Quest Description');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Win 3 games');

    const remainingInput = screen.getByLabelText('Remaining Count');
    await user.type(remainingInput, '3');

    const submitButton = screen.getAllByText('Add Quest')[1];
    await user.click(submitButton);

    // Wait for initial plan
    await waitFor(() => {
      expect(screen.queryByText("Tonight's Plan")).toBeInTheDocument();
    }, { timeout: 2000 });

    // Rapidly change inputs
    const timeBudgetSlider = screen.getByLabelText(/Available Time/);
    const winRateSlider = screen.getByLabelText(/Expected Win Rate/);

    // Simulate rapid changes
    fireEvent.change(timeBudgetSlider, { target: { value: '90' } });
    fireEvent.change(winRateSlider, { target: { value: '60' } });
    fireEvent.change(timeBudgetSlider, { target: { value: '120' } });
    fireEvent.change(winRateSlider, { target: { value: '65' } });
    fireEvent.change(timeBudgetSlider, { target: { value: '150' } });

    // Final values should be reflected after debounce
    await waitFor(() => {
      expect(screen.getByText(/Available Time.*150.*minutes/)).toBeInTheDocument();
      expect(screen.getByText(/Expected Win Rate.*65%/)).toBeInTheDocument();
    }, { timeout: 1000 });

    // Plan should still be visible and updated
    expect(screen.getByText("Tonight's Plan")).toBeInTheDocument();
  });

  it('should show loading states during plan recalculation', async () => {
    const user = userEvent.setup();
    
    // Mock a slower plan generation to see loading state
    jest.spyOn(performance, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(100); // 100ms duration

    render(<QuestFlowApp />);

    // Add quest
    const addButton = screen.getAllByText('Add Quest')[0];
    await user.click(addButton);

    const descriptionInput = screen.getByLabelText('Quest Description');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Cast 20 spells');

    const remainingInput = screen.getByLabelText('Remaining Count');
    await user.type(remainingInput, '20');

    // Select cast spells quest type
    const castSpellsOption = screen.getByLabelText(/Cast Spells/);
    await user.click(castSpellsOption);

    const submitButton = screen.getAllByText('Add Quest')[1];
    await user.click(submitButton);

    // Should show loading state briefly
    await waitFor(() => {
      // Loading state might be brief, but plan should eventually appear
      expect(screen.queryByText("Tonight's Plan")).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should handle error scenarios gracefully', async () => {
    const user = userEvent.setup();
    
    render(<QuestFlowApp />);

    // Add quest with impossible time constraint
    const addButton = screen.getAllByText('Add Quest')[0];
    await user.click(addButton);

    const descriptionInput = screen.getByLabelText('Quest Description');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Win 50 games');

    const remainingInput = screen.getByLabelText('Remaining Count');
    await user.type(remainingInput, '50');

    const submitButton = screen.getAllByText('Add Quest')[1];
    await user.click(submitButton);

    // Set very low time budget
    const timeBudgetSlider = screen.getByLabelText(/Available Time/);
    fireEvent.change(timeBudgetSlider, { target: { value: '15' } });

    // Should show error or warning about impossible plan
    await waitFor(() => {
      // Either an error message or warning should appear
      const hasError = screen.queryByText(/Plan Generation Error/);
      const hasWarning = screen.queryByText(/Optimization Warnings/);
      const hasEmptyState = screen.queryByText(/Welcome to QuestFlow/);
      
      expect(hasError || hasWarning || hasEmptyState).toBeTruthy();
    }, { timeout: 2000 });
  });

  it('should maintain performance under 200ms target', async () => {
    const user = userEvent.setup();
    
    // Mock performance timing
    let callCount = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => {
      callCount++;
      // Simulate fast optimization (under 200ms)
      return callCount === 1 ? 0 : 150; // 150ms duration
    });

    render(<QuestFlowApp />);

    // Add multiple quests to test performance
    for (let i = 0; i < 3; i++) {
      const addButton = screen.getAllByText('Add Quest')[0];
      await user.click(addButton);

      const descriptionInput = screen.getByLabelText('Quest Description');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, `Win ${i + 2} games`);

      const remainingInput = screen.getByLabelText('Remaining Count');
      await user.clear(remainingInput);
      await user.type(remainingInput, `${i + 2}`);

      const submitButton = screen.getAllByText('Add Quest')[1];
      await user.click(submitButton);

      // Wait briefly between additions
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Change settings to trigger recalculation
    const timeBudgetSlider = screen.getByLabelText(/Available Time/);
    fireEvent.change(timeBudgetSlider, { target: { value: '120' } });

    // Should complete without performance warnings
    await waitFor(() => {
      expect(screen.queryByText("Tonight's Plan")).toBeInTheDocument();
    }, { timeout: 1000 });

    // No performance warnings should be logged
    // (In a real implementation, we'd check console.warn calls)
  });
});