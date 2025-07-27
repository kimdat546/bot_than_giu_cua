const moment = require('moment');
const { CreditCardService } = require('./creditCard');

class TelegramService {
  constructor(bot, googleSheets, gemini) {
    this.bot = bot;
    this.googleSheets = googleSheets;
    this.gemini = gemini;
    this.creditCard = new CreditCardService(googleSheets, gemini);
    this.setupCommands();
  }

  setupCommands() {
    // Set bot commands
    this.bot.setMyCommands([
      { command: 'start', description: 'Start the bot' },
      { command: 'add', description: 'Add transaction: /add 25.50 Coffee at Starbucks' },
      { command: 'balance', description: 'Show current balance' },
      { command: 'report', description: 'Monthly report' },
      { command: 'categories', description: 'View categories' },
      { command: 'refund', description: 'Process refund: /refund 25.50 Starbucks refund' },
      { command: 'ccreport', description: 'Credit card summary' },
      { command: 'help', description: 'Show help' }
    ]);
  }

  async handleUpdate(update) {
    if (update.message) {
      await this.handleMessage(update.message);
    }
  }

  async handleMessage(message) {
    const chatId = message.chat.id;
    const text = message.text;

    if (!text) return;

    try {
      if (text.startsWith('/start')) {
        await this.handleStart(chatId);
      } else if (text.startsWith('/add')) {
        await this.handleAddTransaction(chatId, text);
      } else if (text.startsWith('/balance')) {
        await this.handleBalance(chatId);
      } else if (text.startsWith('/report')) {
        await this.handleReport(chatId);
      } else if (text.startsWith('/categories')) {
        await this.handleCategories(chatId);
      } else if (text.startsWith('/refund')) {
        await this.handleRefund(chatId, text);
      } else if (text.startsWith('/ccreport')) {
        await this.handleCreditCardReport(chatId);
      } else if (text.startsWith('/help')) {
        await this.handleHelp(chatId);
      } else {
        // Try to parse as transaction
        await this.handleQuickTransaction(chatId, text);
      }
    } catch (error) {
      console.error('Message handling error:', error);
      await this.bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again.');
    }
  }

  async handleStart(chatId) {
    const message = `
🤖 Welcome to your Personal Finance Bot!

Commands:
• /add [amount] [description] - Add transaction
• /balance - Current balance
• /report - Monthly report
• /categories - View categories

You can also just type: "25.50 Coffee" to add quickly!
    `;
    await this.bot.sendMessage(chatId, message);
  }

  async handleAddTransaction(chatId, text) {
    const parts = text.split(' ').slice(1);
    if (parts.length < 2) {
      await this.bot.sendMessage(chatId, 'Usage: /add [amount] [description]\nExample: /add 25.50 Coffee at Starbucks');
      return;
    }

    const amount = parseFloat(parts[0]);
    const description = parts.slice(1).join(' ');

    if (isNaN(amount)) {
      await this.bot.sendMessage(chatId, 'Please provide a valid amount.');
      return;
    }

    await this.processTransaction(chatId, amount, description, 'manual');
  }

  async handleQuickTransaction(chatId, text) {
    // Try to parse "25.50 Coffee" format
    const match = text.match(/^(-?\d+(?:\.\d{2})?)\s+(.+)$/);
    if (match) {
      const amount = parseFloat(match[1]);
      const description = match[2];
      await this.processTransaction(chatId, amount, description, 'manual');
    }
  }

  async processTransaction(chatId, amount, description, source) {
    try {
      // Get AI categorization
      const aiResult = await this.gemini.categorizeTransaction(description, amount);
      
      const transaction = {
        date: moment().format('YYYY-MM-DD'),
        amount: amount,
        description: description,
        category: aiResult.category,
        tags: aiResult.tags.join(', '),
        source: source,
        type: aiResult.type,
        account: 'default'
      };

      await this.googleSheets.addTransaction(transaction);

      const message = `
✅ Transaction added!
💰 Amount: $${amount}
📝 Description: ${description}
🏷️ Category: ${aiResult.category}
🔖 Tags: ${aiResult.tags.join(', ')}
      `;

      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('Transaction processing error:', error);
      await this.bot.sendMessage(chatId, 'Failed to add transaction. Please try again.');
    }
  }

  async handleBalance(chatId) {
    try {
      const currentMonth = moment().month();
      const currentYear = moment().year();
      const balance = await this.googleSheets.getMonthlyBalance(currentMonth, currentYear);

      const message = `
📊 Monthly Balance (${moment().format('MMMM YYYY')})
💰 Total: $${balance.toFixed(2)}
      `;

      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('Balance error:', error);
      await this.bot.sendMessage(chatId, 'Failed to get balance.');
    }
  }

  async handleReport(chatId) {
    try {
      const transactions = await this.googleSheets.getTransactions(50);
      const currentMonth = moment().month();
      const currentYear = moment().year();

      const monthTransactions = transactions.filter(row => {
        const date = moment(row[0]);
        return date.month() === currentMonth && date.year() === currentYear;
      });

      let expenses = 0;
      let income = 0;
      const categories = {};

      monthTransactions.forEach(row => {
        const amount = parseFloat(row[1] || 0);
        const category = row[3] || 'Other';

        if (amount < 0) {
          expenses += Math.abs(amount);
          categories[category] = (categories[category] || 0) + Math.abs(amount);
        } else {
          income += amount;
        }
      });

      let report = `📈 Monthly Report (${moment().format('MMMM YYYY')})\n\n`;
      report += `💰 Income: $${income.toFixed(2)}\n`;
      report += `💸 Expenses: $${expenses.toFixed(2)}\n`;
      report += `📊 Net: $${(income - expenses).toFixed(2)}\n\n`;
      
      if (Object.keys(categories).length > 0) {
        report += `📋 Top Categories:\n`;
        Object.entries(categories)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([cat, amount]) => {
            report += `• ${cat}: $${amount.toFixed(2)}\n`;
          });
      }

      await this.bot.sendMessage(chatId, report);
    } catch (error) {
      console.error('Report error:', error);
      await this.bot.sendMessage(chatId, 'Failed to generate report.');
    }
  }

  async handleCategories(chatId) {
    try {
      const categories = await this.googleSheets.getCategories();
      
      let message = '🏷️ Categories:\n\n';
      categories.forEach((cat, index) => {
        if (index > 0) { // Skip header row
          message += `• ${cat[0]}\n`;
        }
      });

      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('Categories error:', error);
      await this.bot.sendMessage(chatId, 'Failed to get categories.');
    }
  }

  async handleHelp(chatId) {
    const message = `
🤖 Personal Finance Bot Help

📝 Adding Transactions:
• /add 25.50 Coffee at Starbucks
• 25.50 Coffee (quick format)
• -100 Grocery shopping (negative for expenses)

📊 Reports:
• /balance - Current month balance
• /report - Detailed monthly report
• /categories - View all categories

🤖 AI Features:
• Automatic categorization
• Smart tagging
• Email transaction parsing

The bot automatically categorizes your transactions and can parse bank emails when integrated with n8n workflows.
    `;

    await this.bot.sendMessage(chatId, message);
  }

  async handleEmailTransaction(subject, body, from) {
    try {
      const parsed = await this.gemini.parseEmailTransaction(subject, body);
      
      if (parsed) {
        const aiResult = await this.gemini.categorizeTransaction(parsed.description, parsed.amount);
        
        const transaction = {
          date: parsed.date || moment().format('YYYY-MM-DD'),
          amount: parsed.amount,
          description: parsed.description,
          category: aiResult.category,
          tags: aiResult.tags.join(', '),
          source: 'email',
          type: aiResult.type,
          account: parsed.account || 'email_parsed'
        };

        await this.googleSheets.addTransaction(transaction);

        // Notify user via Telegram
        const userId = await this.googleSheets.getSetting('telegram_user_id');
        if (userId) {
          const message = `
🏦 Bank Transaction Detected!
💰 Amount: $${parsed.amount}
📝 Description: ${parsed.description}
🏷️ Category: ${aiResult.category}
📧 Source: ${from}
          `;
          await this.bot.sendMessage(userId, message);
        }
      }
    } catch (error) {
      console.error('Email transaction error:', error);
    }
  }

  async handleRefund(chatId, text) {
    const parts = text.split(' ').slice(1);
    if (parts.length < 2) {
      await this.bot.sendMessage(chatId, 'Usage: /refund [amount] [description]\nExample: /refund 25.50 Starbucks refund');
      return;
    }

    const amount = parseFloat(parts[0]);
    const description = parts.slice(1).join(' ');

    if (isNaN(amount)) {
      await this.bot.sendMessage(chatId, 'Please provide a valid amount.');
      return;
    }

    try {
      const refundTransaction = await this.creditCard.handleRefund(
        amount, 
        description, 
        moment().format('YYYY-MM-DD'), 
        'default'
      );

      const message = `
✅ Refund processed!
💰 Amount: +$${amount}
📝 Description: ${description}
🏷️ Category: ${refundTransaction.category}
🔗 Type: Refund
      `;

      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('Refund processing error:', error);
      await this.bot.sendMessage(chatId, 'Failed to process refund. Please try again.');
    }
  }

  async handleCreditCardReport(chatId) {
    try {
      const startOfMonth = moment().startOf('month').format('YYYY-MM-DD');
      const endOfMonth = moment().endOf('month').format('YYYY-MM-DD');
      
      const summary = await this.creditCard.getCreditCardSummary('default', startOfMonth, endOfMonth);

      let report = `💳 Credit Card Report (${moment().format('MMMM YYYY')})\n\n`;
      report += `💸 Total Spent: $${summary.totalSpent.toFixed(2)}\n`;
      report += `💰 Total Refunds: $${summary.totalRefunds.toFixed(2)}\n`;
      report += `📊 Net Spent: $${summary.netSpent.toFixed(2)}\n`;
      report += `🔢 Transactions: ${summary.transactionCount}\n\n`;
      
      if (Object.keys(summary.categoryBreakdown).length > 0) {
        report += `📋 Category Breakdown:\n`;
        Object.entries(summary.categoryBreakdown)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([cat, amount]) => {
            report += `• ${cat}: $${amount.toFixed(2)}\n`;
          });
      }

      await this.bot.sendMessage(chatId, report);
    } catch (error) {
      console.error('Credit card report error:', error);
      await this.bot.sendMessage(chatId, 'Failed to generate credit card report.');
    }
  }
}

module.exports = { TelegramService };