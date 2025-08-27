# QuestFlow

> **Turn your MTGA dailies/weeklies and limited time into a schedule that maximizes gold/gem EV and finishes quests efficiently.**

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Planning-orange.svg)](docs/QuestFlow_Spec.md)

## 🎯 What is QuestFlow?

QuestFlow is a **Progressive Web App (PWA)** that helps Magic: The Gathering Arena players optimize their gaming sessions. Instead of wondering what to play, QuestFlow tells you exactly what to do for the best rewards.

**One-liner:** *"Know exactly what to play tonight for the best rewards."*

## ✨ Key Features

### 🎮 Smart Quest Planning
- **Quest Integration**: Track your daily/weekly quests with remaining counts
- **Time Optimization**: Plan your gaming sessions based on available time (30-90 minutes/day)
- **EV Maximization**: Calculate expected value (gold/gems) for different queues and formats

### 📊 Intelligent Scheduling
- **Queue Selection**: Choose from Standard, Historic, Midweek Magic, Quick Draft, Premier Draft
- **Win Rate Analysis**: Input your estimated win rates for different formats
- **Progress Tracking**: Mark completed steps and see real-time progress updates

### 🔧 What-If Scenarios
- **Dynamic Planning**: Adjust win rates and time constraints to see different outcomes
- **Instant Recalculation**: Tweak parameters and see new plans instantly
- **Export Options**: Copy plans to clipboard or export as ICS calendar events

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern web browser with PWA support

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/QuestFlow.git
   cd QuestFlow
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React/Next.js PWA
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Styling**: Tailwind CSS
- **State Management**: React Context + Hooks

### Data Model
- **Users**: Authentication and settings
- **Quests**: Quest tracking with expiration dates
- **Plans**: Generated gaming schedules
- **Plan Steps**: Individual actions within plans
- **Reward Tables**: Configurable reward structures

### Core Algorithm
QuestFlow uses a sophisticated EV calculation algorithm:
```
EV(queue) = P(win) × reward_win + (1−P) × reward_loss − entry_cost/expected_runs
```

The planner optimizes for **EV per minute** while respecting quest completion constraints and time budgets.

## 📱 Usage

### 1. **Set Up Your Profile**
- Enter your estimated win rates for different formats
- Enable/disable specific queues and events
- Set your typical gaming session duration

### 2. **Input Your Quests**
- Add current daily/weekly quests
- Specify remaining progress for each quest
- Set expiration dates

### 3. **Generate Your Plan**
- Input your available time
- Click "Compute Plan" to generate your optimal gaming schedule
- Review the EV summary and time estimates

### 4. **Execute and Track**
- Follow the step-by-step plan
- Mark completed steps as you go
- See real-time progress updates

## 🔒 Privacy & Terms of Service

QuestFlow is designed to be **ToS-safe**:
- ❌ No overlays, bots, or direct client interaction
- ❌ No automation of gameplay
- ✅ Manual entry of quests and results only
- ✅ Privacy-respecting analytics (aggregates only)

## 💰 Pricing

- **Free Tier**: 5 plans per week, basic features
- **Pro ($3/month)**: Unlimited plans, history, ICS export
- **Bundle ($6/month)**: Pro + Wildcard Whisperer integration

## 🛣️ Roadmap

### Phase 1 (MVP)
- [ ] Core quest planning functionality
- [ ] EV calculation engine
- [ ] Basic PWA interface
- [ ] Supabase integration

### Phase 2
- [ ] Auto win-rate estimation from user logs
- [ ] Weekly reminder emails
- [ ] Community EV presets

### Phase 3
- [ ] Seasonal events integration
- [ ] Team sharing features
- [ ] Advanced analytics dashboard

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- Follow the existing code style
- Write tests for new functionality
- Ensure all code compiles before submission
- Update documentation for any API changes

## 📚 Documentation

- **[QuestFlow Specification](docs/QuestFlow_Spec.md)** - Detailed technical specification
- **[API Reference](docs/API.md)** - API endpoints and data structures
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Magic: The Gathering Arena community for inspiration
- Contributors and beta testers
- Open source projects that make this possible

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/QuestFlow/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/QuestFlow/discussions)
- **Email**: support@questflow.app

---

**Made with ❤️ for the MTGA community**

*QuestFlow is not affiliated with Wizards of the Coast or Magic: The Gathering Arena.*
