# Step Tracker Bot 👣

A Telegram bot for tracking weekly steps and kilometers within groups or private chats. Users can log their steps, view statistics, and compete with others.

## Features 🌟

- Weekly step tracking
- Automatic kilometer conversion
- Group leaderboards
- Personal statistics
- Multiple tracking options:
  - Current week tracking `/steps`
  - Previous week tracking `/laststeps`
  - Custom week statistics
- Achievement system
- Group and private chat support

## Commands 📝

- `/steps [число] or /steps [число]-[км]` - Log steps for current week (e.g., /steps 50000 or /steps 50000-35)
- `/laststeps [число] or /laststeps [число]-[км]` - Log steps for previous week
- `/week` - View weekly statistics with options:
  - Current week
  - Previous week
  - Custom week (format: /[week number]-[year], e.g., /46-2024)
- `/mystats` - View personal statistics
- `/help` - Show available commands
- `/cancel` - Cancel current operation

## Installation 🛠

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- SQLite3
- PM2 (for production)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/step-tracker-bot.git
cd step-tracker-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
TELEGRAM_BOT_TOKEN=your_bot_token
PORT=3000
DB_PATH=steps.db
```

4. Build the project:
```bash
npm run build
```

5. Start development server:
```bash
npm run dev
```

### Production Deployment

1. Install PM2:
```bash
npm install -g pm2
```

2. Create ecosystem.config.js:
```javascript
module.exports = {
  apps: [{
    name: 'steps-bot',
    script: '/var/www/step-counter-bot/dist/server.js',
    watch: false,
    env_file: '.env',
    exp_backoff_restart_delay: 100,
    max_memory_restart: '300M'
  }]
};
```

3. Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Database Structure 💾

The bot uses SQLite with the following schema:

```sql
CREATE TABLE steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id BIGINT NOT NULL,
    username TEXT NOT NULL,
    steps INTEGER NOT NULL,
    km INTEGER NOT NULL,
    date TEXT NOT NULL,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    chat_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Achievement System 🏆

Users can earn achievements:
- ⭐ Month of Activity (4 weeks of tracking)
- 🦿 Super Walker (100,000+ steps in one week)
- 💫 Millionaire (1,000,000+ total steps)

## Step Limits and Conversions 📊

- Maximum steps per week: 500,000
- Kilometer conversion: steps × 0.0007
- Custom kilometer input available with format: /steps [steps]-[km]

## Development 👨‍💻

### Project Structure
```
src/
├── config/
├── services/
│   ├── telegram/
│   │   ├── commands/
│   │   ├── keyboards/
│   │   ├── messages/
│   │   └── utils/
│   └── database/
└── types/
```

### Building
```bash
npm run build
```

### Running Tests
```bash
npm test
```

## Maintenance 🔧

### Viewing Logs
```bash
pm2 logs steps-bot
```

### Updating Bot
```bash
git pull
npm install
npm run build
pm2 restart steps-bot
```

### Database Backup
```bash
cp steps.db steps.db.backup
```

## Support 💬

For issues and feature requests, please contact @your_telegram_username

## License 📄

This project is licensed under the MIT License - see the LICENSE file for details
