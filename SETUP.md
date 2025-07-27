# Detailed Setup Guide

## Step-by-Step Setup

### 1. Create Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Choose a name and username for your bot
4. Copy the bot token to your `.env` file
5. Set webhook URL: `https://your-domain.com/webhook/telegram`

### 2. Google Cloud Setup

#### Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google Sheets API
4. Create Service Account:
   - IAM & Admin → Service Accounts
   - Create Service Account
      - Add role: "Editor" (or "Google Sheets API" for minimal permissions)
      - Click "CONTINUE" → "DONE"
   - Download JSON key file:
      - Click the 3 dots (⋮) → "Manage keys"
      - Click "ADD KEY" → "Create new key"
      - Select "JSON" format
      - Click "CREATE"
      - File automatically downloads to your computer
5. Share your Google Sheet with the service account email

#### Google Sheets Structure

Create sheets with these exact names and columns:

**Transactions Sheet:**
```
A: Date | B: Amount | C: Description | D: Category | E: Tags | F: Source | G: Type | H: Account | I: Status | J: Original_ID
```

**Categories Sheet:**
```
A: Category | B: Keywords | C: Budget | D: Color
```

**Settings Sheet:**
```
A: Setting | B: Value
```

Add these settings:
- `default_currency` → `USD`
- `timezone` → `UTC`
- `monthly_budget` → `2000`
- `telegram_user_id` → `YOUR_TELEGRAM_ID`

### 3. Gemini AI Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Add to `.env` file

### 4. n8n Setup

#### Option A: Self-hosted n8n

```bash
npx n8n
```

#### Option B: n8n Cloud

1. Sign up at [n8n.cloud](https://n8n.cloud)
2. Import workflows from `n8n-workflows/` folder

#### Configure Workflows

1. **Telegram Integration:**
   - Set webhook URL in workflow
   - Configure HTTP request to your bot server

2. **Email Monitor:**
   - Add Gmail credentials
   - Set IMAP settings
   - Configure Google Sheets credentials

### 5. Email Integration (Optional)

For bank transaction monitoring:

1. Enable 2FA on Gmail
2. Generate App Password
3. Configure IMAP settings in n8n workflow
4. Add bank email patterns to `Email_Rules` sheet

### 6. Deployment Options

#### Option A: Local Development
```bash
npm run dev
```

#### Option B: Railway
1. Connect GitHub repo
2. Add environment variables
3. Deploy

#### Option C: Heroku
```bash
heroku create your-app-name
heroku config:set TELEGRAM_BOT_TOKEN=your_token
git push heroku main
```

### 7. Testing

1. Start the bot server
2. Send `/start` to your bot
3. Try adding a transaction: `/add 10.50 Test coffee`
4. Check Google Sheets for the new entry

## Troubleshooting

### Common Issues

**Bot not responding:**
- Check webhook URL is correct
- Verify bot token
- Check n8n workflow is active

**Google Sheets errors:**
- Verify service account has edit permissions
- Check sheet ID is correct
- Ensure all required sheets exist

**Gemini AI errors:**
- Verify API key is valid
- Check quota limits
- Test with simple requests first

### Logs

Check logs in:
- Bot console output
- n8n execution logs
- Google Cloud Logs (if deployed)

## Security Notes

- Never commit `.env` file
- Use environment variables in production
- Restrict service account permissions
- Enable 2FA on all accounts
- Use HTTPS for webhooks

## Next Steps

After setup:

1. Customize categories for your spending habits
2. Set up bank email rules
3. Configure budget alerts
4. Add more automation workflows
5. Create custom reports
