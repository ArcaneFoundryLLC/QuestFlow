# Design Document

## Overview

QuestFlow is designed as a single-page application (SPA) that provides instant quest optimization for MTGA players. The design prioritizes simplicity, speed, and maintainability while delivering immediate value through accurate EV calculations and clear recommendations.

The application follows a lightweight architecture with client-side computation, local storage persistence, and minimal external dependencies to ensure it can be maintained by a single developer.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────┐
│           QuestFlow PWA                 │
├─────────────────────────────────────────┤
│  UI Layer (React Components)           │
│  ├── Quest Input Form                  │
│  ├── Plan Display                      │
│  └── Settings Panel                    │
├─────────────────────────────────────────┤
│  Business Logic Layer                  │
│  ├── EV Calculator                     │
│  ├── Plan Optimizer                    │
│  └── Quest Progress Tracker            │
├─────────────────────────────────────────┤
│  Data Layer                            │
│  ├── Local Storage Manager             │
│  ├── Static Reward Tables              │
│  └── Quest/Plan Models                 │
└─────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: Next.js 14 with React 18 and TypeScript
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Context + Custom Hooks
- **Data Persistence**: Browser Local Storage
- **Validation**: Zod schemas
- **PWA**: Next.js built-in PWA support

## Components and Interfaces

### Core Components

#### 1. QuestInputForm Component
```typescript
interface QuestInputFormProps {
  onPlanGenerate: (plan: OptimizedPlan) => void;
}

interface Quest {
  id: string;
  type: 'win' | 'cast' | 'play_colors';
  description: string;
  remaining: number;
  expiresInDays: number;
  colors?: ('W' | 'U' | 'B' | 'R' | 'G')[];
}
```

**Responsibilities:**
- Quest input with type selection and progress tracking
- Time budget slider (15-180 minutes)
- Win rate input (30-80% range with 50% default)
- Real-time plan generation on input changes

#### 2. PlanDisplay Component
```typescript
interface PlanDisplayProps {
  plan: OptimizedPlan;
  onStepComplete: (stepId: string) => void;
}

interface PlanStep {
  id: string;
  queue: QueueType;
  targetGames: number;
  estimatedMinutes: number;
  expectedRewards: Rewards;
  questProgress: QuestProgress[];
  completed: boolean;
}
```

**Responsibilities:**
- Display ordered plan steps with clear queue recommendations
- Show time estimates and expected rewards per step
- Allow step completion tracking
- Display total session summary

#### 3. SettingsPanel Component
```typescript
interface SettingsPanelProps {
  settings: UserSettings;
  onSettingsChange: (settings: UserSettings) => void;
}

interface UserSettings {
  defaultWinRate: number;
  preferredQueues: QueueType[];
  minutesPerGame: number;
}
```

**Responsibilities:**
- Win rate adjustment with immediate plan updates
- Queue preferences (enable/disable specific queues)
- Default time estimates per game type

### Business Logic Interfaces

#### EV Calculator
```typescript
interface EVCalculator {
  calculateQueueEV(queue: QueueType, winRate: number): number;
  calculateQuestProgressRate(quest: Quest, queue: QueueType): number;
  estimateCompletionTime(quest: Quest, queue: QueueType, winRate: number): number;
}
```

#### Plan Optimizer
```typescript
interface PlanOptimizer {
  optimizePlan(
    quests: Quest[],
    timeBudget: number,
    winRate: number,
    settings: UserSettings
  ): OptimizedPlan;
}
```

## Data Models

### Quest Model
```typescript
const QuestSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['win', 'cast', 'play_colors']),
  description: z.string(),
  remaining: z.number().min(0),
  expiresInDays: z.number().min(0),
  colors: z.array(z.enum(['W', 'U', 'B', 'R', 'G'])).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type Quest = z.infer<typeof QuestSchema>;
```

### Queue Types and Rewards
```typescript
enum QueueType {
  STANDARD_BO1 = 'standard_bo1',
  STANDARD_BO3 = 'standard_bo3',
  HISTORIC_BO1 = 'historic_bo1',
  QUICK_DRAFT = 'quick_draft',
  MIDWEEK_MAGIC = 'midweek_magic',
}

interface QueueRewards {
  entryFee: number;
  winRewards: number[];  // Rewards for 0, 1, 2, 3+ wins
  lossRewards: number[]; // Rewards for losses at each win level
  averageGameLength: number; // Minutes per game
  questMultiplier: {
    win: number;
    cast: number;
    play_colors: number;
  };
}
```

### Static Reward Tables
```typescript
const QUEUE_REWARDS: Record<QueueType, QueueRewards> = {
  [QueueType.STANDARD_BO1]: {
    entryFee: 0,
    winRewards: [0, 25, 50, 100, 150, 200, 250],
    lossRewards: [0, 0, 0, 0, 0, 0, 0],
    averageGameLength: 8,
    questMultiplier: { win: 1, cast: 1, play_colors: 1 }
  },
  [QueueType.QUICK_DRAFT]: {
    entryFee: 5000,
    winRewards: [50, 100, 200, 300, 450, 650, 950, 1200],
    lossRewards: [0, 0, 0, 0, 0, 0, 0, 0],
    averageGameLength: 12,
    questMultiplier: { win: 1, cast: 0.8, play_colors: 1.2 }
  },
  // ... other queues
};
```

## Error Handling

### Input Validation
- **Quest Validation**: Ensure remaining count is positive, expiration is future date
- **Time Budget**: Minimum 15 minutes, maximum 180 minutes
- **Win Rate**: Range 30-80% with helpful tooltips for guidance

### Graceful Degradation
- **No Quests**: Show helpful onboarding message with example quests
- **Impossible Plans**: Display message when time budget is insufficient
- **Local Storage Errors**: Fall back to session-only storage with user notification

### Error Boundaries
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// Wrap main app in error boundary with fallback UI
// Log errors to console for debugging (no external services)
```

## Testing Strategy

### Unit Testing Focus
- **EV Calculations**: Test all queue reward calculations with known inputs
- **Plan Optimization**: Test greedy algorithm with various quest combinations
- **Quest Progress**: Test progress rate calculations for different quest types
- **Local Storage**: Test data persistence and retrieval

### Integration Testing
- **Form to Plan Flow**: Test complete user journey from input to plan generation
- **Plan Execution**: Test step completion and plan updates
- **Settings Changes**: Test real-time plan recalculation

### Component Testing
```typescript
// Example test structure
describe('QuestInputForm', () => {
  test('generates plan when valid quests are entered', () => {
    // Test plan generation with mock quests
  });
  
  test('updates plan when win rate changes', () => {
    // Test real-time recalculation
  });
});
```

## Performance Considerations

### Optimization Algorithm
- **Greedy Approach**: Sort queues by EV per minute, select highest value options first
- **Quest Constraints**: Ensure all quests can be completed before expiration
- **Time Constraints**: Respect user's available time budget
- **Computation Target**: Complete optimization in <100ms for typical inputs

### Bundle Size Management
- **Tree Shaking**: Import only used functions from utility libraries
- **Code Splitting**: Lazy load settings panel and advanced features
- **Asset Optimization**: Minimize CSS and JavaScript bundles

### Local Storage Strategy
```typescript
interface StorageManager {
  saveQuests(quests: Quest[]): void;
  loadQuests(): Quest[];
  saveSettings(settings: UserSettings): void;
  loadSettings(): UserSettings;
  clearData(): void;
}

// Implement with error handling and size limits
const MAX_STORAGE_SIZE = 1024 * 1024; // 1MB limit
```

## User Experience Design

### Single Page Layout
```
┌─────────────────────────────────────────┐
│  QuestFlow Header                       │
├─────────────────────────────────────────┤
│  Quest Input Section                    │
│  ├── Add Quest Button                  │
│  ├── Quest List (editable)             │
│  ├── Time Budget Slider                │
│  └── Win Rate Input                    │
├─────────────────────────────────────────┤
│  Tonight's Plan Section                 │
│  ├── Plan Steps (checkboxes)           │
│  ├── Expected Rewards Summary          │
│  └── Total Time Estimate               │
├─────────────────────────────────────────┤
│  Settings (collapsible)                │
└─────────────────────────────────────────┘
```

### Mobile-First Design
- **Touch Targets**: Minimum 44px for all interactive elements
- **Readable Text**: Minimum 16px font size, high contrast
- **Simple Navigation**: Single page with collapsible sections
- **Offline Indicator**: Show connection status and offline capability

### Progressive Web App Features
- **Installable**: Manifest file with app icons and theme colors
- **Offline Capable**: Service worker caches app shell and data
- **Fast Loading**: Critical CSS inlined, non-critical resources lazy loaded

## Security Considerations

### Data Privacy
- **Local Only**: All user data stored locally, no external transmission
- **No Analytics**: No user tracking or data collection
- **Minimal Permissions**: Only request necessary browser permissions

### Input Sanitization
- **XSS Prevention**: Sanitize all user inputs using Zod validation
- **Type Safety**: TypeScript ensures type correctness throughout
- **Bounds Checking**: Validate all numeric inputs within reasonable ranges

## Deployment and Maintenance

### Static Deployment
- **Build Output**: Static files deployable to any CDN or static host
- **No Backend**: Eliminates server maintenance and scaling concerns
- **Version Updates**: Simple file replacement for updates

### Configuration Management
```typescript
// config/rewards.json - easily updatable reward tables
{
  "version": "2024.1",
  "lastUpdated": "2024-01-15",
  "queues": {
    "standard_bo1": { /* reward structure */ },
    // ... other queues
  }
}
```

### Monitoring and Updates
- **Error Logging**: Console-based error logging for development
- **Performance Monitoring**: Web Vitals tracking via built-in Next.js analytics
- **Update Strategy**: Manual updates when MTGA reward structures change