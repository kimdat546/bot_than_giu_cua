require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { GoogleSheetsService } = require('./services/googleSheets');
const { GeminiService } = require('./services/gemini');
const { TelegramService } = require('./services/telegram');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const googleSheets = new GoogleSheetsService();
const gemini = new GeminiService();
const telegramService = new TelegramService(bot, googleSheets, gemini);

// Webhook endpoint for n8n
app.post('/webhook/telegram', async (req, res) => {
  try {
    await telegramService.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

// Webhook endpoint for n8n email processing
app.post('/webhook/email', async (req, res) => {
  try {
    const { subject, body, from } = req.body;
    await telegramService.handleEmailTransaction(subject, body, from);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Email webhook error:', error);
    res.status(500).send('Error');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Personal Finance Bot server running on port ${port}`);
});