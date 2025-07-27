const { google } = require('googleapis');

class GoogleSheetsService {
  constructor() {
    this.sheetsId = process.env.GOOGLE_SHEETS_ID;
    
    // Support both file path and JSON string
    let authConfig;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      // Use JSON string from environment variable (for Docker/production)
      let jsonString = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      
      // Handle double-escaped JSON from environment variables
      if (jsonString.startsWith('{"') && jsonString.includes('\\"')) {
        // Remove escape characters for properly formatted JSON
        jsonString = jsonString.replace(/\\"/g, '"').replace(/\\n/g, '\n');
      }
      
      authConfig = {
        credentials: JSON.parse(jsonString),
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      };
    } else {
      // Fall back to key file path (for local development)
      authConfig = {
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      };
    }

    this.auth = new google.auth.GoogleAuth(authConfig);
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  async addTransaction(transaction) {
    const values = [[
      transaction.date,
      transaction.amount,
      transaction.description,
      transaction.category,
      transaction.tags,
      transaction.source,
      transaction.type,
      transaction.account,
      transaction.status || 'confirmed',
      transaction.originalId || ''
    ]];

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.sheetsId,
      range: 'Transactions!A:J',
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    });
  }

  async getTransactions(limit = 10) {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetsId,
      range: `Transactions!A2:J${limit + 1}`
    });

    return response.data.values || [];
  }

  async getCategories() {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetsId,
      range: 'Categories!A:D'
    });

    return response.data.values || [];
  }

  async addCategory(category, keywords, budget, color) {
    const values = [[category, keywords, budget, color]];

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.sheetsId,
      range: 'Categories!A:D',
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    });
  }

  async getSetting(settingName) {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetsId,
      range: 'Settings!A:B'
    });

    const settings = response.data.values || [];
    const setting = settings.find(row => row[0] === settingName);
    return setting ? setting[1] : null;
  }

  async getMonthlyBalance(month, year) {
    const transactions = await this.getTransactions(1000);
    const monthTransactions = transactions.filter(row => {
      const date = new Date(row[0]);
      return date.getMonth() === month && date.getFullYear() === year;
    });

    return monthTransactions.reduce((sum, row) => {
      return sum + parseFloat(row[1] || 0);
    }, 0);
  }
}

module.exports = { GoogleSheetsService };