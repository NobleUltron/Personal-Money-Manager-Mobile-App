import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export interface StatementData {
  userName: string;
  userEmail?: string;
  currency: string;
  currencySymbol: string;
  periodLabel: string;
  generatedAt: Date;
  summary: {
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    totalBalance: number;
    transactionCount: number;
  };
  accounts: Array<{
    id: number | string;
    name: string;
    type: string;
    balance: number;
  }>;
  transactions: Array<{
    id: number | string;
    date: string;
    type: string;
    category: string;
    amount: number;
    accountName?: string;
    description?: string;
  }>;
  loans?: Array<{
    id: number | string;
    type: string;
    personName: string;
    amount: number;
    remainingAmount: number;
    dueDate?: string;
    status: string;
  }>;
}

export class StatementPdfGenerator {
  static async generateAndShare(data: StatementData): Promise<string> {
    const html = this.buildHtml(data);

    if (Platform.OS === 'web') {
      // On web, open print dialog directly
      await Print.printAsync({ html });
      return 'web-printed';
    }

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Personal Money Manager Statement - ${data.periodLabel}`,
      });
    }

    return uri;
  }

  static async printDirectly(data: StatementData): Promise<void> {
    const html = this.buildHtml(data);
    await Print.printAsync({ html });
  }

  private static buildHtml(data: StatementData): string {
    const sym = data.currencySymbol || data.currency;
    const formatMoney = (val: number) => `${sym} ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatDate = (d: string | Date) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    const accountsRows = data.accounts
      .map(
        (acc) => `
        <tr>
          <td style="font-weight: 600;">${this.escapeHtml(acc.name)}</td>
          <td style="text-transform: capitalize; color: #64748b;">${this.escapeHtml(acc.type)}</td>
          <td style="text-align: right; font-weight: 700; color: #0f172a;">${formatMoney(acc.balance)}</td>
        </tr>
      `
      )
      .join('');

    const transactionRows = data.transactions
      .map((tx) => {
        const isIncome = tx.type === 'income';
        const isExpense = tx.type === 'expense';
        const amountColor = isIncome ? '#10b981' : isExpense ? '#ef4444' : '#3b82f6';
        const amountPrefix = isIncome ? '+' : isExpense ? '-' : '';

        return `
        <tr>
          <td style="color: #64748b; font-size: 11px;">${formatDate(tx.date)}</td>
          <td>
            <div style="font-weight: 600; color: #0f172a;">${this.escapeHtml(tx.category)}</div>
            ${tx.description ? `<div style="font-size: 11px; color: #94a3b8;">${this.escapeHtml(tx.description)}</div>` : ''}
          </td>
          <td style="color: #64748b; font-size: 11px;">${this.escapeHtml(tx.accountName || '-')}</td>
          <td>
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background-color: ${isIncome ? '#dcfce7' : isExpense ? '#fee2e2' : '#dbeafe'}; color: ${amountColor};">
              ${tx.type}
            </span>
          </td>
          <td style="text-align: right; font-weight: 700; color: ${amountColor}; font-size: 13px;">
            ${amountPrefix}${formatMoney(tx.amount)}
          </td>
        </tr>
      `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Financial Statement - ${this.escapeHtml(data.periodLabel)}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 16mm 14mm 16mm 14mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.4;
          }
          .header-banner {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #6366f1;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .brand-logo {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .logo-badge {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: 900;
            font-size: 18px;
          }
          .brand-title {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
            letter-spacing: -0.5px;
          }
          .brand-sub {
            font-size: 11px;
            color: #64748b;
            margin: 0;
          }
          .doc-meta {
            text-align: right;
          }
          .doc-title {
            font-size: 16px;
            font-weight: 800;
            color: #6366f1;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .meta-line {
            font-size: 11px;
            color: #64748b;
            margin-top: 2px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 20px;
          }
          .info-block h4 {
            margin: 0 0 4px 0;
            font-size: 10px;
            text-transform: uppercase;
            color: #94a3b8;
            letter-spacing: 0.5px;
          }
          .info-block p {
            margin: 0;
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
          }
          .summary-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 24px;
          }
          .summary-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
          }
          .summary-card.primary {
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            color: #ffffff;
            border-color: #4f46e5;
          }
          .summary-card.primary .card-label {
            color: rgba(255, 255, 255, 0.8);
          }
          .summary-card.primary .card-val {
            color: #ffffff;
          }
          .card-label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 4px;
          }
          .card-val {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
          }
          .section-heading {
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            color: #334155;
            letter-spacing: 0.5px;
            margin: 20px 0 8px 0;
            padding-bottom: 4px;
            border-bottom: 1px solid #e2e8f0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          th {
            background-color: #f1f5f9;
            color: #475569;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            text-align: left;
            padding: 8px 10px;
            border-bottom: 1px solid #cbd5e1;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 12px;
          }
          tr:nth-child(even) td {
            background-color: #fafafa;
          }
          .footer {
            margin-top: 30px;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header-banner">
          <div class="brand-logo">
            <div class="logo-badge">P</div>
            <div>
              <h1 class="brand-title">Personal Money Manager</h1>
              <p class="brand-sub">Official Wealth & Financial Statement</p>
            </div>
          </div>
          <div class="doc-meta">
            <h2 class="doc-title">Account Statement</h2>
            <div class="meta-line">Period: <strong>${this.escapeHtml(data.periodLabel)}</strong></div>
            <div class="meta-line">Generated: ${formatDate(data.generatedAt)}</div>
          </div>
        </div>

        <!-- Account Holder Information -->
        <div class="info-grid">
          <div class="info-block">
            <h4>Account Holder</h4>
            <p>${this.escapeHtml(data.userName)} ${data.userEmail ? `<span style="font-weight: normal; color: #64748b; font-size: 11px;">(${this.escapeHtml(data.userEmail)})</span>` : ''}</p>
          </div>
          <div class="info-block" style="text-align: right;">
            <h4>Base Currency</h4>
            <p>${this.escapeHtml(data.currency)} (${this.escapeHtml(sym)})</p>
          </div>
        </div>

        <!-- Executive Summary Cards -->
        <div class="summary-cards">
          <div class="summary-card primary">
            <div class="card-label">Total Net Worth</div>
            <div class="card-val">${formatMoney(data.summary.totalBalance)}</div>
          </div>
          <div class="summary-card">
            <div class="card-label" style="color: #10b981;">Total Income</div>
            <div class="card-val" style="color: #10b981;">${formatMoney(data.summary.totalIncome)}</div>
          </div>
          <div class="summary-card">
            <div class="card-label" style="color: #ef4444;">Total Expenses</div>
            <div class="card-val" style="color: #ef4444;">${formatMoney(data.summary.totalExpense)}</div>
          </div>
          <div class="summary-card">
            <div class="card-label">Net Cash Flow</div>
            <div class="card-val" style="color: ${data.summary.netSavings >= 0 ? '#10b981' : '#ef4444'};">
              ${data.summary.netSavings >= 0 ? '+' : ''}${formatMoney(data.summary.netSavings)}
            </div>
          </div>
        </div>

        <!-- Accounts Breakdown -->
        <div class="section-heading">Accounts Portfolio</div>
        <table>
          <thead>
            <tr>
              <th>Account Name</th>
              <th>Type</th>
              <th style="text-align: right;">Current Balance</th>
            </tr>
          </thead>
          <tbody>
            ${accountsRows || '<tr><td colspan="3" style="text-align: center; color: #94a3b8;">No active accounts found</td></tr>'}
          </tbody>
        </table>

        <!-- Transactions Ledger -->
        <div class="section-heading">Transaction Ledger (${data.transactions.length} entries)</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category & Description</th>
              <th>Account</th>
              <th>Type</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${transactionRows || '<tr><td colspan="5" style="text-align: center; color: #94a3b8;">No transactions recorded in this period</td></tr>'}
          </tbody>
        </table>

        <!-- Footer -->
        <div class="footer">
          <div>This is an official computer-generated financial statement from Personal Money Manager.</div>
          <div>Confidential · Page 1 of 1</div>
        </div>
      </body>
      </html>
    `;
  }

  private static escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
