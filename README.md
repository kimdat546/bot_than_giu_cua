# Personal Finance Telegram Bot

A comprehensive personal finance tracking bot that integrates with n8n, Google Sheets, and Gemini AI for intelligent transaction management.

## Features

- 🤖 **Telegram Bot Interface** - Easy transaction logging via chat
- 📊 **Google Sheets Integration** - Cloud-based database with real-time sync
- 🧠 **AI-Powered Categorization** - Automatic transaction tagging with Gemini AI
- 📧 **Email Transaction Parsing** - Auto-import bank transactions from emails
- 💳 **Credit Card Support** - Handle purchases and refunds with linking
- 🔄 **n8n Workflow Integration** - Extensible automation platform

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- Google Cloud account with Sheets API enabled
- Telegram Bot Token
- Gemini AI API key
- n8n instance

### 2. Installation

```bash
npm install
cp .env.example .env
```

### 3. Configuration

Edit `.env` file with your credentials:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
GOOGLE_SHEETS_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_KEY=path_to_service_account.json
GEMINI_API_KEY=your_gemini_key
```

### 4. Google Sheets Setup

1. Create a new Google Sheet
2. Add these sheets: `Transactions`, `Categories`, `Settings`, `Email_Rules`, `Email_Log`
3. Use the structure from `google-sheets-template.md`

### 5. n8n Workflows

Import the workflows from `n8n-workflows/`:

1. **telegram-integration.json** - Handles Telegram webhook
2. **email-monitoring.json** - Monitors bank emails

### 6. Start the Bot

```bash
npm start
# or for development
npm run dev
```

## Bot Commands

- `/start` - Initialize the bot
- `/add 25.50 Coffee` - Add a transaction
- `/balance` - Show current month balance
- `/report` - Generate monthly report
- `/refund 25.50 Starbucks` - Process a refund
- `/ccreport` - Credit card summary
- `/categories` - View all categories
- `/help` - Show help

## Quick Usage

Just type: `25.50 Coffee at Starbucks` to quickly add transactions!

## Architecture

```
Telegram → n8n → Bot Server → Google Sheets
                    ↓
                Gemini AI (categorization)
                    ↓
Email → n8n → Bot Server → Google Sheets
```

## API Endpoints

- `POST /webhook/telegram` - Telegram updates
- `POST /webhook/email` - Email transaction processing
- `GET /health` - Health check

## Development

The bot uses modular services:

- `TelegramService` - Bot commands and responses
- `GoogleSheetsService` - Database operations
- `GeminiService` - AI categorization
- `CreditCardService` - Refund and credit card handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License