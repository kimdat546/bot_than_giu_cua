const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async categorizeTransaction(description, amount) {
    const prompt = `
    Analyze this transaction and provide category and tags:
    Description: "${description}"
    Amount: ${amount}

    Please respond in JSON format:
    {
      "category": "category_name",
      "tags": ["tag1", "tag2"],
      "type": "expense|income|refund"
    }

    Common categories: Food, Transport, Entertainment, Shopping, Bills, Healthcare, Income, Refund
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback if JSON parsing fails
      return {
        category: 'Other',
        tags: ['unclassified'],
        type: amount < 0 ? 'expense' : 'income'
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      return {
        category: 'Other',
        tags: ['error'],
        type: amount < 0 ? 'expense' : 'income'
      };
    }
  }

  async parseEmailTransaction(subject, body) {
    const prompt = `
    Extract transaction information from this bank email:
    Subject: "${subject}"
    Body: "${body}"

    Please respond in JSON format:
    {
      "amount": number,
      "description": "merchant/description",
      "date": "YYYY-MM-DD",
      "account": "account_info",
      "type": "expense|income|refund"
    }

    If no transaction found, return null.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.amount ? parsed : null;
      }
      
      return null;
    } catch (error) {
      console.error('Gemini email parsing error:', error);
      return null;
    }
  }
}

module.exports = { GeminiService };