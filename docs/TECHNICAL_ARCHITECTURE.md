# QuestFlow Technical Architecture

> **Lightweight, Maintainable Architecture for Micro-SaaS PWA**

## 🎯 Architecture Principles

**Core Design Philosophy:**
- **Minimal Dependencies**: Only essential packages, avoid framework bloat
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Offline-First**: Local data persistence with optional cloud sync
- **Performance Budget**: < 500KB gzipped bundle, < 2s load time on 3G

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    QuestFlow PWA                           │
├─────────────────────────────────────────────────────────────┤
│  Frontend Layer (Next.js 14 + React)                      │
│  ├── UI Components (Tailwind CSS)                         │
│  ├── State Management (React Context + Hooks)             │
│  ├── Business Logic (Pure Functions)                      │
│  └── Data Layer (Local Storage + Supabase)                │
├─────────────────────────────────────────────────────────────┤
│  Backend Services (Supabase)                               │
│  ├── Authentication                                        │
│  ├── Database (PostgreSQL)                                 │
│  ├── Real-time Subscriptions                              │
│  └── Edge Functions                                        │
├─────────────────────────────────────────────────────────────┤
│  External Integrations                                     │
│  ├── Stripe (Payments)                                     │
│  ├── MTGA Data (Static)                                    │
│  └── Analytics (Privacy-focused)                           │
└─────────────────────────────────────────────────────────────┘
```

## 🎨 Frontend Architecture

### Technology Stack Selection

#### **Next.js 14 (App Router)**
**Why Next.js 14?**
- **Zero Config**: Minimal setup, automatic optimization
- **App Router**: Modern React patterns, better performance
- **Built-in PWA Support**: Easy service worker integration
- **TypeScript Native**: First-class TypeScript support
- **Bundle Optimization**: Automatic code splitting and tree shaking

**Alternatives Considered:**
- ❌ **Vite + React**: More setup, less PWA support
- ❌ **Create React App**: Larger bundle, slower builds
- ❌ **SvelteKit**: Smaller ecosystem, learning curve

#### **State Management: React Context + Custom Hooks**
**Why This Approach?**
- **Lightweight**: No external dependencies
- **Built-in**: Native React patterns
- **Simple**: Easy to understand and maintain
- **Scalable**: Can evolve to more complex solutions

```typescript
// Example: Quest State Management
interface QuestContextType {
  quests: Quest[];
  addQuest: (quest: Quest) => void;
  updateQuest: (id: string, updates: Partial<Quest>) => void;
  removeQuest: (id: string) => void;
}

const QuestContext = createContext<QuestContextType | undefined>(undefined);

export const useQuests = () => {
  const context = useContext(QuestContext);
  if (!context) throw new Error('useQuests must be used within QuestProvider');
  return context;
};
```

**Alternatives Considered:**
- ❌ **Redux Toolkit**: Overkill for simple state, larger bundle
- ❌ **Zustand**: Good but adds dependency
- ❌ **Jotai**: Good but adds dependency

#### **Styling: Tailwind CSS**
**Why Tailwind?**
- **Utility-First**: Rapid development, consistent design
- **Purge CSS**: Automatic unused CSS removal
- **Design System**: Built-in design tokens
- **Responsive**: Mobile-first responsive utilities

**Custom Design System:**
```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
        quest: {
          daily: '#10b981',
          weekly: '#f59e0b',
          special: '#8b5cf6',
        }
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      }
    }
  }
}
```

### Component Architecture

#### **Atomic Design Pattern**
```
Atoms → Molecules → Organisms → Templates → Pages
```

**Example Component Structure:**
```typescript
// atoms/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

// molecules/QuestCard.tsx
interface QuestCardProps {
  quest: Quest;
  onEdit: () => void;
  onComplete: () => void;
}

// organisms/QuestList.tsx
interface QuestListProps {
  quests: Quest[];
  onQuestAction: (action: QuestAction) => void;
}
```

#### **Custom Hooks for Business Logic**
```typescript
// hooks/useQuestOptimization.ts
export const useQuestOptimization = () => {
  const calculateOptimalPlan = useCallback((
    quests: Quest[],
    timeBudget: number,
    winRates: WinRates
  ): Plan => {
    // Pure function for plan optimization
    return optimizeQuests(quests, timeBudget, winRates);
  }, []);

  const calculateEV = useCallback((queue: Queue, winRate: number): number => {
    // Pure function for EV calculation
    return calculateQueueEV(queue, winRate);
  }, []);

  return { calculateOptimalPlan, calculateEV };
};
```

## 🗄️ Data Architecture

### Data Flow Pattern

```
User Input → Validation → Local Storage → Business Logic → UI Update
                ↓
            Supabase Sync ← Background Process ← Conflict Resolution
```

### Local-First Data Strategy

#### **Offline-First Architecture**
- **Primary Storage**: Local Storage + IndexedDB
- **Sync Strategy**: Background sync when online
- **Conflict Resolution**: Last-write-wins with user notification
- **Data Persistence**: Automatic local backup

```typescript
// services/storage.ts
class LocalStorageService {
  private db: IDBDatabase;
  
  async saveQuest(quest: Quest): Promise<void> {
    // Save to IndexedDB
    await this.db.put('quests', quest);
    
    // Queue for sync when online
    this.queueForSync('quests', quest);
  }
  
  async syncWithCloud(): Promise<void> {
    if (!navigator.onLine) return;
    
    const pendingSyncs = await this.getPendingSyncs();
    for (const sync of pendingSyncs) {
      await this.syncItem(sync);
    }
  }
}
```

#### **Data Models (Zod Schemas)**
```typescript
// models/Quest.ts
import { z } from 'zod';

export const QuestSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['win', 'cast', 'color', 'land', 'creature']),
  target: z.number().positive(),
  current: z.number().min(0),
  color: z.enum(['white', 'blue', 'black', 'red', 'green']).optional(),
  expiresAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Quest = z.infer<typeof QuestSchema>;

// Validation function
export const validateQuest = (data: unknown): Quest => {
  return QuestSchema.parse(data);
};
```

### Database Design (Supabase)

#### **Table Structure**
```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  win_rates JSONB DEFAULT '{}',
  queues_enabled JSONB DEFAULT '{}',
  minutes_per_game INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quests table
CREATE TABLE public.quests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  target INTEGER NOT NULL,
  current INTEGER DEFAULT 0,
  color TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plans table
CREATE TABLE public.plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  horizon TEXT CHECK (horizon IN ('today', 'week')),
  time_budget INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plan steps table
CREATE TABLE public.plan_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  queue TEXT NOT NULL,
  target_wins INTEGER,
  target_games INTEGER,
  estimated_minutes INTEGER NOT NULL,
  ev_delta DECIMAL(10,2),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE
);
```

#### **Row Level Security (RLS)**
```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_steps ENABLE ROW LEVEL SECURITY;

-- Profiles policy
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Quests policies
CREATE POLICY "Users can view own quests" ON public.quests
  FOR ALL USING (auth.uid() = user_id);
```

## ⚡ Performance Architecture

### Bundle Optimization Strategy

#### **Code Splitting Strategy**
```typescript
// pages/index.tsx - Main bundle
import dynamic from 'next/dynamic';

// Lazy load heavy components
const QuestOptimizer = dynamic(() => import('../components/QuestOptimizer'), {
  loading: () => <div>Loading optimizer...</div>,
  ssr: false
});

const Analytics = dynamic(() => import('../components/Analytics'), {
  ssr: false
});
```

#### **Tree Shaking Optimization**
```typescript
// utils/ev-calculator.ts - Pure functions for tree shaking
export const calculateQueueEV = (queue: Queue, winRate: number): number => {
  // Pure function - easily tree-shakeable
  return (winRate * queue.rewards.win) + 
         ((1 - winRate) * queue.rewards.loss) - 
         queue.entryCost;
};

// Only import what you need
import { calculateQueueEV } from '../utils/ev-calculator';
```

### Caching Strategy

#### **Service Worker Caching**
```typescript
// public/sw.js
const CACHE_NAME = 'questflow-v1';
const STATIC_CACHE = 'questflow-static-v1';
const DYNAMIC_CACHE = 'questflow-dynamic-v1';

// Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/static/js/bundle.js',
        '/static/css/main.css',
        '/manifest.json'
      ]);
    })
  );
});

// Network-first strategy for API calls
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
});
```

#### **React Query for Server State**
```typescript
// hooks/useQuests.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useQuests = () => {
  const queryClient = useQueryClient();
  
  const { data: quests, isLoading } = useQuery({
    queryKey: ['quests'],
    queryFn: fetchQuests,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
  
  const addQuestMutation = useMutation({
    mutationFn: addQuest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quests'] });
    },
  });
  
  return { quests, isLoading, addQuest: addQuestMutation.mutate };
};
```

## 🔒 Security Architecture

### Authentication & Authorization

#### **Supabase Auth Integration**
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Auth hook
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  return { user, loading };
};
```

#### **Input Validation & Sanitization**
```typescript
// utils/validation.ts
import { z } from 'zod';
import DOMPurify from 'dompurify';

export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input.trim());
};

export const validateAndSanitize = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T => {
  const validated = schema.parse(data);
  
  // Recursively sanitize string fields
  const sanitized = sanitizeObject(validated);
  
  return sanitized;
};
```

### Data Protection

#### **Encryption at Rest**
- **Sensitive Data**: Encrypted using Supabase's built-in encryption
- **User Preferences**: Stored locally with optional cloud backup
- **Analytics**: Aggregated data only, no personal information

#### **API Security**
```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  // Protect API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  
  return res;
}
```

## 🧪 Testing Architecture

### Testing Strategy

#### **Testing Pyramid**
```
    /\
   /  \     E2E Tests (5%)
  /____\    Integration Tests (15%)
 /      \   Unit Tests (80%)
/________\
```

#### **Unit Testing (Jest + Testing Library)**
```typescript
// __tests__/utils/ev-calculator.test.ts
import { calculateQueueEV } from '../../utils/ev-calculator';

describe('EV Calculator', () => {
  test('calculates correct EV for winning scenario', () => {
    const queue = {
      rewards: { win: 100, loss: 0 },
      entryCost: 50
    };
    const winRate = 0.6;
    
    const ev = calculateQueueEV(queue, winRate);
    expect(ev).toBe(10); // (0.6 * 100) + (0.4 * 0) - 50 = 10
  });
});
```

#### **Integration Testing (Playwright)**
```typescript
// tests/quest-planning.spec.ts
import { test, expect } from '@playwright/test';

test('user can create and execute quest plan', async ({ page }) => {
  await page.goto('/');
  
  // Add a quest
  await page.click('[data-testid="add-quest"]');
  await page.fill('[data-testid="quest-target"]', '5');
  await page.selectOption('[data-testid="quest-type"]', 'win');
  await page.click('[data-testid="save-quest"]');
  
  // Generate plan
  await page.fill('[data-testid="time-budget"]', '60');
  await page.click('[data-testid="generate-plan"]');
  
  // Verify plan generated
  await expect(page.locator('[data-testid="plan-steps"]')).toBeVisible();
});
```

## 🚀 Deployment Architecture

### Environment Configuration

#### **Environment Variables**
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

#### **Build Optimization**
```json
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@heroicons/react', 'framer-motion'],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  swcMinify: true,
}
```

### CI/CD Pipeline

#### **GitHub Actions Workflow**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run build
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run deploy
```

## 📊 Monitoring & Observability

### Performance Monitoring

#### **Core Web Vitals Tracking**
```typescript
// lib/web-vitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function reportWebVitals(metric: Metric) {
  // Send to analytics
  if (process.env.NEXT_PUBLIC_ANALYTICS_ID) {
    gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_id: metric.id,
      metric_value: metric.value,
      metric_delta: metric.delta,
    });
  }
}

export function initWebVitals() {
  getCLS(reportWebVitals);
  getFID(reportWebVitals);
  getFCP(reportWebVitals);
  getLCP(reportWebVitals);
  getTTFB(reportWebVitals);
}
```

#### **Error Boundary & Logging**
```typescript
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Send to Sentry or similar
    }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

## 🔄 Evolution Strategy

### Architecture Evolution Path

#### **Phase 1: MVP (Current)**
- React Context + Local Storage
- Basic PWA functionality
- Simple EV calculations

#### **Phase 2: Enhanced (Future)**
- Consider Zustand for complex state
- Add Redis for caching
- Implement real-time collaboration

#### **Phase 3: Scale (Future)**
- Micro-frontends for complex features
- GraphQL for flexible data fetching
- Event-driven architecture

### Technology Migration Strategy

#### **State Management Evolution**
```typescript
// Current: React Context
const QuestContext = createContext<QuestContextType>();

// Future: Zustand (if needed)
import { create } from 'zustand';

interface QuestStore {
  quests: Quest[];
  addQuest: (quest: Quest) => void;
  // ... other actions
}

const useQuestStore = create<QuestStore>((set) => ({
  quests: [],
  addQuest: (quest) => set((state) => ({ 
    quests: [...state.quests, quest] 
  })),
}));
```

#### **Database Evolution**
```sql
-- Current: Simple tables
CREATE TABLE quests (id, user_id, type, target, current);

-- Future: Advanced features
CREATE TABLE quest_templates (id, name, type, target, color);
CREATE TABLE quest_instances (id, template_id, user_id, progress);
CREATE TABLE quest_analytics (quest_id, completion_time, success_rate);
```

---

**This architecture prioritizes simplicity, performance, and maintainability while providing a clear path for future growth. The focus on lightweight dependencies and offline-first design ensures QuestFlow remains fast and reliable even as it scales.**
