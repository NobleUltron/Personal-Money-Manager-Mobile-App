# ⚡ Personal Money Manager — REST API (NestJS + Prisma + PostgreSQL)

High-performance, type-safe REST API built with **NestJS 11**, **Prisma ORM 6**, **TypeScript**, and **Swagger OpenAPI**.

---

## 📚 Interactive API Documentation (Swagger)
When the server is running, explore and test all endpoints interactively at:
👉 **`http://localhost:3000/api/docs`**

---

## 🛠️ API Modules & Routes

| Module | Route Prefix | Description |
| :--- | :--- | :--- |
| **Auth** | `/api/auth` | Register, Login, 2FA verify/resend, Forgot/Reset password, Me |
| **Users** | `/api/users` | Profile, Currency preferences, 2FA toggle, Change password |
| **Accounts** | `/api/accounts` | Multi-wallet CRUD with authoritative balance calculations |
| **Transactions** | `/api/transactions` | Paginated transactions with date/type/category filtering |
| **Transfers** | `/api/transfers` | Atomic money transfers between user accounts |
| **Budgets** | `/api/budgets` | Monthly category spending limits & gauge calculations |
| **Subscriptions**| `/api/subscriptions` | Recurring subscriptions with due date sorting |
| **Loans** | `/api/loans` | Lent & borrowed debt management with repayment tracking |
| **Goals** | `/api/goals` | Savings goals with progress percentages and deposit records |
| **Analytics** | `/api/analytics` | 30-day cash flow, averages, peak spending day, category breakdown |
| **Backup** | `/api/backup` | Complete user data JSON export and atomic validation import |

---

## 🚀 Running Locally

```bash
# Generate Prisma Client
npx prisma generate

# Start in Development Watch Mode
npm run start:dev
```
