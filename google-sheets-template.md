# Google Sheets Database Template

## Sheet 1: Transactions
| Column | Type | Description |
|--------|------|-------------|
| A | Date | Transaction date (YYYY-MM-DD) |
| B | Amount | Transaction amount (positive/negative) |
| C | Description | Transaction description |
| D | Category | AI-generated category |
| E | Tags | AI-generated tags (comma-separated) |
| F | Source | Source (manual, email, credit_card) |
| G | Type | Type (expense, income, refund) |
| H | Account | Bank account or credit card |
| I | Status | Status (pending, confirmed) |
| J | Original_ID | For linking refunds to original transactions |

## Sheet 2: Categories
| Column | Type | Description |
|--------|------|-------------|
| A | Category | Category name |
| B | Keywords | Keywords for auto-categorization |
| C | Budget | Monthly budget for category |
| D | Color | Color code for visualization |

## Sheet 3: Settings
| Column | Type | Description |
|--------|------|-------------|
| A | Setting | Setting name |
| B | Value | Setting value |

### Default Settings:
- default_currency: USD
- timezone: UTC
- monthly_budget: 2000
- telegram_user_id: YOUR_TELEGRAM_ID

## Sheet 4: Email_Rules
| Column | Type | Description |
|--------|------|-------------|
| A | Bank | Bank name |
| B | From_Email | Sender email pattern |
| C | Subject_Pattern | Subject line pattern |
| D | Amount_Regex | Regex to extract amount |
| E | Description_Regex | Regex to extract description |