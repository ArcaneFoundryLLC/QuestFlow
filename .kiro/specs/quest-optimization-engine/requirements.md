# Requirements Document

## Introduction

QuestFlow is a lightweight micro-SaaS web application that helps Magic: The Gathering Arena (MTGA) players optimize their daily quest completion to maximize gold and gem rewards. The application provides a simple interface where users input their quests and time budget to receive an optimized play schedule.

The core value proposition is answering: "What should I play tonight for the best rewards?" for time-constrained players with 30-90 minutes available.

## Requirements

### Requirement 1

**User Story:** As a time-constrained MTGA player, I want to quickly input my quests and available time, so that I can get a simple optimized schedule.

#### Acceptance Criteria

1. WHEN a user accesses the application THEN the system SHALL display a single-page quest input form
2. WHEN a user adds a quest THEN the system SHALL capture quest type (win games, cast spells, play colors), remaining count, and days until expiration
3. WHEN a user sets time budget THEN the system SHALL accept minutes available for today
4. WHEN a user sets win rate THEN the system SHALL accept a single overall win rate percentage
5. WHEN required inputs are provided THEN the system SHALL generate a simple play plan instantly

### Requirement 2

**User Story:** As an MTGA player, I want to see a clear "tonight's plan" with expected rewards, so that I know exactly what to play.

#### Acceptance Criteria

1. WHEN the system generates a plan THEN it SHALL display 3-5 ordered steps with queue names and target games
2. WHEN displaying each step THEN the system SHALL show estimated minutes to complete
3. WHEN showing the plan THEN the system SHALL display total expected gold/gems earned
4. WHEN viewing quest progress THEN the system SHALL show which quests will be completed
5. WHEN a step is completed THEN the system SHALL allow simple checkoff and recalculate remaining steps

### Requirement 3

**User Story:** As an MTGA player, I want to adjust my win rate and see how it changes my plan, so that I can account for my actual skill level.

#### Acceptance Criteria

1. WHEN a user adjusts win rate THEN the system SHALL recalculate the plan immediately
2. WHEN win rate changes THEN the system SHALL update expected rewards and time estimates
3. WHEN the plan updates THEN the system SHALL maintain the same simple interface
4. WHEN parameters change THEN the system SHALL complete recalculation within 200ms

### Requirement 4

**User Story:** As an MTGA player, I want my quest data saved locally, so that I don't have to re-enter everything each time.

#### Acceptance Criteria

1. WHEN a user enters quest data THEN the system SHALL save it to browser local storage
2. WHEN a user returns to the app THEN the system SHALL restore their last quest list and settings
3. WHEN quest progress is updated THEN the system SHALL persist the changes locally
4. WHEN the app loads THEN it SHALL work completely offline with saved data

### Requirement 5

**User Story:** As an MTGA player, I want accurate EV calculations using current reward data, so that the recommendations are trustworthy.

#### Acceptance Criteria

1. WHEN calculating EV THEN the system SHALL use current MTGA reward tables for Standard, Historic, and Draft queues
2. WHEN estimating quest completion THEN the system SHALL use realistic progress rates per game type
3. WHEN optimizing THEN the system SHALL prioritize highest EV per minute while ensuring quest completion before expiration
4. WHEN reward data needs updating THEN the system SHALL use a simple JSON configuration file

### Requirement 6

**User Story:** As a mobile MTGA player, I want the app to work well on my phone, so that I can check my plan while playing.

#### Acceptance Criteria

1. WHEN using on mobile THEN the system SHALL provide a responsive, touch-friendly interface
2. WHEN viewing on small screens THEN all inputs and plan display SHALL be easily readable and interactive
3. WHEN installed as PWA THEN the system SHALL work offline and feel like a native app
4. WHEN switching between devices THEN the local storage SHALL maintain quest data per device