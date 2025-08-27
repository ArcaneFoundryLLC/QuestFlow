# QuestFlow Components

This directory contains the component library for QuestFlow, organized using the Atomic Design methodology.

## Architecture

### Atomic Design Pattern

```
Atoms → Molecules → Organisms → Templates → Pages
```

- **Atoms**: Basic building blocks (Button, Input, Card)
- **Molecules**: Simple combinations of atoms (QuestCard, FormField)
- **Organisms**: Complex UI sections (QuestList, PlanGenerator)
- **Templates**: Page layouts and structure
- **Pages**: Complete page implementations

## Design System

### Colors

#### Primary Colors
- `primary-50` to `primary-950`: Blue-based primary color palette
- Used for buttons, links, and primary actions

#### Quest Colors
- `quest-daily`: Green (#10b981) - Daily quests
- `quest-weekly`: Orange (#f59e0b) - Weekly quests  
- `quest-special`: Purple (#8b5cf6) - Special events
- `quest-urgent`: Red (#ef4444) - Urgent quests

#### MTGA Colors
- `mtga-white`, `mtga-blue`, `mtga-black`, `mtga-red`, `mtga-green`
- Used for Magic: The Gathering Arena color-specific elements

### Spacing
- `18`: 4.5rem (72px)
- `88`: 22rem (352px)
- `128`: 32rem (512px)

### Typography
- **Sans**: Inter font family for body text
- **Mono**: JetBrains Mono for code and technical content

### Animations
- `fade-in`: 0.5s fade in animation
- `slide-up`: 0.3s slide up animation
- `bounce-gentle`: Gentle 2s bounce animation

## Component Guidelines

### Props Interface
All components should:
- Extend appropriate HTML element interfaces
- Use descriptive prop names
- Include proper TypeScript types
- Have default values where appropriate

### Styling
- Use Tailwind CSS utility classes
- Leverage the `cn()` utility for conditional classes
- Follow the design system color palette
- Ensure responsive design

### Accessibility
- Include proper ARIA labels
- Support keyboard navigation
- Provide focus indicators
- Use semantic HTML elements

### Testing
- Write comprehensive unit tests
- Test all variants and states
- Include user interaction tests
- Maintain >80% test coverage

## Usage Examples

### Button Component
```tsx
import { Button } from '@/components/atoms';

<Button variant="primary" size="md" onClick={handleClick}>
  Generate Plan
</Button>
```

### Input Component
```tsx
import { Input } from '@/components/atoms';

<Input 
  label="Quest Target" 
  type="number" 
  placeholder="Enter target number"
  error={errors.target}
/>
```

### Card Component
```tsx
import { Card } from '@/components/atoms';

<Card variant="elevated" className="p-4">
  <h3>Quest Details</h3>
  <p>Quest description here...</p>
</Card>
```

## Adding New Components

1. **Create the component file** in the appropriate atomic level directory
2. **Define the interface** with proper TypeScript types
3. **Implement the component** following the design system
4. **Write tests** for all functionality
5. **Export from index.ts** for easy importing
6. **Update this README** with usage examples

## Best Practices

- Keep components focused and single-purpose
- Use composition over inheritance
- Prefer controlled components for forms
- Implement proper error boundaries
- Follow React best practices and hooks
- Ensure components are tree-shakeable
