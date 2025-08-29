import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';

describe('Responsive Atomic Components', () => {
  it('renders Button with proper touch targets', () => {
    render(<Button>Test Button</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('min-w-[44px]');
    expect(button).toHaveClass('touch-manipulation');
  });

  it('renders Card with responsive padding', () => {
    render(<Card>Test Content</Card>);
    
    const card = screen.getByText('Test Content').parentElement;
    expect(card).toHaveClass('p-4', 'sm:p-6');
  });

  it('renders Input with proper mobile sizing', () => {
    render(<Input label="Test Input" />);
    
    const input = screen.getByLabelText('Test Input');
    expect(input).toHaveClass('h-11');
    expect(input).toHaveClass('text-base', 'sm:text-sm');
    expect(input).toHaveClass('touch-manipulation');
  });

  it('ensures Button sizes meet minimum touch targets', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    
    sizes.forEach(size => {
      const { unmount } = render(<Button size={size}>Test</Button>);
      const button = screen.getByRole('button');
      
      // All button sizes should have minimum height for touch targets
      const hasMinHeight = button.className.includes('h-10') || 
                          button.className.includes('h-11') || 
                          button.className.includes('h-12');
      expect(hasMinHeight).toBe(true);
      
      unmount();
    });
  });
});

describe('Touch Target Requirements', () => {
  it('ensures Button variants have proper touch targets', () => {
    const variants = ['primary', 'secondary', 'danger', 'ghost'] as const;
    
    variants.forEach(variant => {
      const { unmount } = render(<Button variant={variant}>Test</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('min-w-[44px]');
      expect(button).toHaveClass('touch-manipulation');
      
      unmount();
    });
  });

  it('ensures Input has proper touch-friendly sizing', () => {
    render(<Input placeholder="Test input" />);
    
    const input = screen.getByPlaceholderText('Test input');
    expect(input).toHaveClass('h-11'); // Minimum 44px height
    expect(input).toHaveClass('touch-manipulation');
  });
});

describe('Mobile Layout Behavior', () => {
  it('ensures proper text sizing for mobile readability', () => {
    render(<Input label="Test Label" />);
    
    const input = screen.getByLabelText('Test Label');
    // Should use base text size on mobile, sm on larger screens
    expect(input).toHaveClass('text-base', 'sm:text-sm');
  });

  it('ensures Cards have mobile-friendly padding', () => {
    render(<Card>Mobile Content</Card>);
    
    const card = screen.getByText('Mobile Content').parentElement;
    // Should have smaller padding on mobile, larger on desktop
    expect(card).toHaveClass('p-4', 'sm:p-6');
  });

  it('validates minimum font size requirements', () => {
    // Test that base font size is 16px (text-base in Tailwind)
    render(<Input placeholder="16px minimum" />);
    
    const input = screen.getByPlaceholderText('16px minimum');
    expect(input).toHaveClass('text-base'); // This ensures 16px base font size
  });
});