# Implementation Plan

- [x] 1. Set up core data models and validation
  - Create TypeScript interfaces and Zod schemas for Quest, Plan, and Settings models
  - Implement data validation functions with comprehensive error handling
  - Write unit tests for all data model validation scenarios
  - _Requirements: 1.2, 1.3, 5.1_

- [x] 2. Implement static reward tables and queue definitions
  - Create comprehensive MTGA queue reward data structure
  - Define QueueType enum and QueueRewards interfaces
  - Implement reward lookup functions with fallback handling
  - Write tests for reward calculations with known MTGA values
  - _Requirements: 5.1, 5.2_

- [x] 3. Build EV calculation engine
  - Implement core EV formula: P(win)×reward_win + (1-P)×reward_loss - entry_cost
  - Create quest progress rate calculator for different quest types and queues
  - Build completion time estimator based on win rates and queue characteristics
  - Write comprehensive unit tests for all EV calculation scenarios
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 4. Create plan optimization algorithm
  - Implement greedy optimization algorithm that prioritizes EV per minute
  - Add quest completion constraint checking (must finish before expiration)
  - Build time budget constraint enforcement
  - Create plan step generation with clear queue recommendations
  - Write tests for optimization with various quest combinations and time constraints
  - _Requirements: 1.6, 2.1, 2.2, 5.3_

- [x] 5. Implement local storage management
  - Create StorageManager class with save/load functionality for quests and settings
  - Add error handling for storage quota exceeded and corrupted data
  - Implement data migration for future schema changes
  - Write tests for storage persistence and retrieval scenarios
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 6. Build Quest input form component
  - Create QuestInputForm component with quest type selection and progress inputs
  - Implement add/edit/delete quest functionality with validation
  - Add time budget slider with real-time plan updates
  - Build win rate input with helpful guidance tooltips
  - Write component tests for all user interactions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1_

- [x] 7. Create plan display component
  - Build PlanDisplay component showing ordered steps with queue recommendations
  - Implement step completion checkboxes with progress tracking
  - Add expected rewards summary and total time estimates
  - Create quest progress indicators showing which quests will be completed
  - Write tests for plan rendering and step completion interactions
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 8. Implement real-time plan recalculation
  - Connect form inputs to optimization engine with debounced updates
  - Add loading states during plan computation
  - Implement error handling for impossible plans (insufficient time)
  - Ensure recalculation completes within 200ms performance target
  - Write integration tests for real-time updates
  - _Requirements: 1.5, 3.1, 3.2, 3.4_

- [x] 9. Build settings panel component
  - Create collapsible SettingsPanel with win rate adjustment
  - Implement queue preference toggles (enable/disable specific queues)
  - Add default time estimates configuration
  - Build settings persistence with immediate plan updates
  - Write tests for settings changes and plan recalculation
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 10. Create responsive mobile layout
  - Implement single-page layout with mobile-first responsive design
  - Add touch-friendly interactions with minimum 44px touch targets
  - Create collapsible sections for optimal mobile experience
  - Ensure readable text with minimum 16px font sizes
  - Test responsive behavior across different screen sizes
  - _Requirements: 6.1, 6.2_

- [ ] 11. Implement PWA functionality
  - Configure Next.js PWA with manifest file and service worker
  - Add offline capability with app shell caching
  - Implement install prompts and native app experience
  - Create offline indicator showing connection status
  - Test PWA installation and offline functionality
  - _Requirements: 4.4, 6.3, 6.4_

- [ ] 12. Add error boundaries and error handling
  - Implement React error boundaries with fallback UI
  - Add input validation with user-friendly error messages
  - Create graceful degradation for edge cases (no quests, impossible plans)
  - Implement console-based error logging for debugging
  - Write tests for error scenarios and recovery
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 13. Integrate components into main application
  - Wire QuestInputForm and PlanDisplay components together
  - Connect local storage to form state management
  - Implement app-level state management with React Context
  - Add loading states and smooth transitions between states
  - Write end-to-end integration tests for complete user flows
  - _Requirements: 1.5, 2.5, 4.1, 4.2_

- [ ] 14. Optimize performance and bundle size
  - Implement code splitting for settings panel and advanced features
  - Add lazy loading for non-critical components
  - Optimize Tailwind CSS with purging unused styles
  - Ensure bundle size stays under performance budget
  - Test Core Web Vitals and optimize for mobile performance
  - _Requirements: 3.4, 6.1, 6.2_

- [ ] 15. Create comprehensive test suite
  - Write integration tests for complete quest-to-plan user journey
  - Add accessibility tests ensuring ARIA labels and keyboard navigation
  - Create performance tests validating optimization speed requirements
  - Implement visual regression tests for UI consistency
  - Ensure test coverage meets quality standards
  - _Requirements: 1.5, 3.4, 6.1, 6.2_