const moment = require('moment');

class CreditCardService {
  constructor(googleSheets, gemini) {
    this.googleSheets = googleSheets;
    this.gemini = gemini;
  }

  async processCreditCardTransaction(transactionData) {
    const { amount, description, date, account, originalTransactionId } = transactionData;
    
    // Determine if this is a refund (positive amount for credit card)
    const isRefund = amount > 0;
    
    if (isRefund) {
      return await this.handleRefund(amount, description, date, account, originalTransactionId);
    } else {
      return await this.handlePurchase(Math.abs(amount), description, date, account);
    }
  }

  async handlePurchase(amount, description, date, account) {
    // Get AI categorization for purchase
    const aiResult = await this.gemini.categorizeTransaction(description, -amount);
    
    const transaction = {
      date: date || moment().format('YYYY-MM-DD'),
      amount: -amount, // Negative for expenses
      description: description,
      category: aiResult.category,
      tags: aiResult.tags.join(', '),
      source: 'credit_card',
      type: 'expense',
      account: account,
      status: 'confirmed'
    };

    await this.googleSheets.addTransaction(transaction);
    return transaction;
  }

  async handleRefund(amount, description, date, account, originalTransactionId) {
    // Try to find the original transaction to link
    let originalTransaction = null;
    
    if (originalTransactionId) {
      originalTransaction = await this.findTransactionById(originalTransactionId);
    } else {
      // Try to find by description and amount
      originalTransaction = await this.findOriginalTransaction(description, amount, date);
    }

    const refundTransaction = {
      date: date || moment().format('YYYY-MM-DD'),
      amount: amount, // Positive for refunds
      description: `REFUND: ${description}`,
      category: originalTransaction?.category || 'Refund',
      tags: originalTransaction?.tags || 'refund',
      source: 'credit_card',
      type: 'refund',
      account: account,
      status: 'confirmed',
      originalId: originalTransaction?.id || ''
    };

    await this.googleSheets.addTransaction(refundTransaction);
    return refundTransaction;
  }

  async findOriginalTransaction(description, amount, refundDate) {
    // Get recent transactions to find matching original
    const transactions = await this.googleSheets.getTransactions(100);
    
    // Look for transaction with same amount (but negative) within last 90 days
    const cutoffDate = moment(refundDate).subtract(90, 'days');
    
    const candidates = transactions.filter(row => {
      const transactionDate = moment(row[0]);
      const transactionAmount = Math.abs(parseFloat(row[1] || 0));
      const transactionDesc = (row[2] || '').toLowerCase();
      const searchDesc = description.toLowerCase();
      
      return (
        transactionDate.isAfter(cutoffDate) &&
        Math.abs(transactionAmount - amount) < 0.01 && // Match amount
        (transactionDesc.includes(searchDesc) || searchDesc.includes(transactionDesc)) // Similar description
      );
    });

    return candidates.length > 0 ? {
      id: candidates[0].id,
      category: candidates[0][3],
      tags: candidates[0][4]
    } : null;
  }

  async findTransactionById(transactionId) {
    const transactions = await this.googleSheets.getTransactions(1000);
    const found = transactions.find(row => row.id === transactionId);
    
    return found ? {
      id: found.id,
      category: found[3],
      tags: found[4]
    } : null;
  }

  async parseCreditCardStatement(statementText) {
    const prompt = `
    Parse this credit card statement and extract all transactions:
    ${statementText}

    Return JSON array of transactions:
    [
      {
        "date": "YYYY-MM-DD",
        "amount": number (negative for purchases, positive for refunds),
        "description": "merchant name",
        "category": "auto-detected category",
        "isRefund": boolean
      }
    ]

    Only include actual transactions, not fees or interest charges.
    `;

    try {
      const result = await this.gemini.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return [];
    } catch (error) {
      console.error('Credit card statement parsing error:', error);
      return [];
    }
  }

  async importCreditCardStatement(statementText, accountName) {
    const transactions = await this.parseCreditCardStatement(statementText);
    const results = [];

    for (const transaction of transactions) {
      try {
        const processedTransaction = await this.processCreditCardTransaction({
          amount: transaction.amount,
          description: transaction.description,
          date: transaction.date,
          account: accountName
        });
        
        results.push(processedTransaction);
      } catch (error) {
        console.error('Error processing transaction:', transaction, error);
      }
    }

    return results;
  }

  // Generate summary of credit card spending
  async getCreditCardSummary(accountName, startDate, endDate) {
    const transactions = await this.googleSheets.getTransactions(1000);
    
    const creditCardTransactions = transactions.filter(row => {
      const transactionDate = moment(row[0]);
      const account = row[7] || '';
      
      return (
        account === accountName &&
        transactionDate.isBetween(startDate, endDate, 'day', '[]')
      );
    });

    let totalSpent = 0;
    let totalRefunds = 0;
    const categoryBreakdown = {};

    creditCardTransactions.forEach(row => {
      const amount = parseFloat(row[1] || 0);
      const category = row[3] || 'Other';
      
      if (amount < 0) {
        totalSpent += Math.abs(amount);
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + Math.abs(amount);
      } else {
        totalRefunds += amount;
      }
    });

    return {
      account: accountName,
      period: `${startDate} to ${endDate}`,
      totalSpent,
      totalRefunds,
      netSpent: totalSpent - totalRefunds,
      categoryBreakdown,
      transactionCount: creditCardTransactions.length
    };
  }
}

module.exports = { CreditCardService };