# 📱 Personal Money Manager — Mobile Application (React Native + Expo)

A native, mobile-first personal finance application for iOS and Android, built with **React Native**, **Expo SDK 52**, **TypeScript**, and **Expo Router**.

---

## 🚀 Key Features
- **Mobile-First UX**: Responsive card-based layout, bottom tab navigation, haptic feedback, dark & light themes.
- **Authentication**: JWT access & refresh token storage using **Expo SecureStore** with optional 2FA OTP flow.
- **Multi-Account Tracking**: Bank, Mobile Money, Cash, Savings, and Credit Cards with real-time balance computation.
- **Income & Expense Tracking**: Paginated transaction history with category filtering, search, and date ranges.
- **Inter-Account Transfers**: Atomic fund movement between accounts.
- **Budget Gauges**: Category monthly limits with real-time progress indicators and over-budget alerts.
- **Recurring Subscriptions**: Renewal tracking sorted by due date.
- **Debt & Loan Manager**: Lent vs borrowed records with partial/full repayments and optional wallet synchronization.
- **Savings Goals**: Milestone progress, color customization, and instant deposits.
- **Visual Analytics**: 30-day cash flow bar chart, spending trends, and category distribution.
- **Data Backup & Security**: Currency preference, password update, and JSON data backup export.

---

## 🛠️ Getting Started

### 1. Configure Environment
Create a `.env` file in the `mobile/` directory:
```bash
EXPO_PUBLIC_API_URL="http://localhost:3000"
```
> **Note for Local Testing:**
> - **Android Emulator**: Use `http://10.0.2.2:3000`
> - **iOS Simulator / Web**: Use `http://localhost:3000`
> - **Physical Phone (Expo Go)**: Use your local Wi-Fi IP address (e.g. `http://192.168.1.100:3000`)

### 2. Start the Application
```bash
npm start
```
- Press `a` for **Android** emulator.
- Press `i` for **iOS** simulator.
- Press `w` for **Web** preview.
- Scan the QR code with **Expo Go** on a physical phone.
