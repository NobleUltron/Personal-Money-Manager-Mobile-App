import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { StatementData } from './pdfGenerator';

export class StatementExcelGenerator {
  static async generateAndShare(data: StatementData): Promise<string> {
    const csvContent = this.buildCsv(data);

    if (Platform.OS === 'web') {
      // Trigger browser download on web
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Statement_${data.periodLabel.replace(/\s+/g, '_')}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return 'web-downloaded';
    }

    const fileName = `Financial_Statement_${data.periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`;
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

    // Write with UTF-8 BOM for Microsoft Excel compatibility
    await FileSystem.writeAsStringAsync(fileUri, '\uFEFF' + csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: `Export Financial Statement (${data.periodLabel})`,
      });
    }

    return fileUri;
  }

  private static buildCsv(data: StatementData): string {
    const lines: string[] = [];

    const escapeCsv = (str: string | number | undefined | null) => {
      if (str === undefined || str === null) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    // Header Meta
    lines.push(escapeCsv('PERSONAL MONEY MANAGER - FINANCIAL STATEMENT'));
    lines.push(`${escapeCsv('Account Holder:')},${escapeCsv(data.userName)},${escapeCsv('Email:')},${escapeCsv(data.userEmail || 'N/A')}`);
    lines.push(`${escapeCsv('Period:')},${escapeCsv(data.periodLabel)},${escapeCsv('Base Currency:')},${escapeCsv(data.currency)}`);
    lines.push(`${escapeCsv('Generated Date:')},${escapeCsv(data.generatedAt.toISOString().split('T')[0])}`);
    lines.push(''); // Empty line

    // Section 1: Executive Summary
    lines.push(escapeCsv('--- EXECUTIVE FINANCIAL SUMMARY ---'));
    lines.push(`${escapeCsv('Total Net Worth')},${escapeCsv(data.summary.totalBalance)}`);
    lines.push(`${escapeCsv('Total Income')},${escapeCsv(data.summary.totalIncome)}`);
    lines.push(`${escapeCsv('Total Expenses')},${escapeCsv(data.summary.totalExpense)}`);
    lines.push(`${escapeCsv('Net Cash Flow')},${escapeCsv(data.summary.netSavings)}`);
    lines.push(`${escapeCsv('Total Transactions')},${escapeCsv(data.summary.transactionCount)}`);
    lines.push('');

    // Section 2: Accounts Breakdown
    lines.push(escapeCsv('--- ACCOUNTS BREAKDOWN ---'));
    lines.push(`${escapeCsv('Account Name')},${escapeCsv('Account Type')},${escapeCsv('Current Balance')}`);
    data.accounts.forEach((acc) => {
      lines.push(`${escapeCsv(acc.name)},${escapeCsv(acc.type)},${escapeCsv(acc.balance)}`);
    });
    lines.push('');

    // Section 3: Detailed Transactions Ledger
    lines.push(escapeCsv('--- TRANSACTION LEDGER ---'));
    lines.push(
      [
        escapeCsv('Transaction ID'),
        escapeCsv('Date'),
        escapeCsv('Type'),
        escapeCsv('Category'),
        escapeCsv('Amount'),
        escapeCsv('Currency'),
        escapeCsv('Account'),
        escapeCsv('Description'),
      ].join(',')
    );

    data.transactions.forEach((tx) => {
      const typeStr = String(tx.type || '').toLowerCase();
      const isIncome = typeStr === 'income' || typeStr === 'deposit';
      const isExpense = typeStr === 'expense' || typeStr === 'withdrawal';
      const typeDisplay = isIncome ? 'Income' : isExpense ? 'Expense' : tx.type;
      const signedAmount = isExpense ? -Math.abs(tx.amount) : tx.amount;

      lines.push(
        [
          escapeCsv(tx.id),
          escapeCsv(tx.date ? new Date(tx.date).toISOString().split('T')[0] : ''),
          escapeCsv(typeDisplay),
          escapeCsv(tx.category),
          escapeCsv(signedAmount),
          escapeCsv(data.currency),
          escapeCsv(tx.accountName || ''),
          escapeCsv(tx.description || ''),
        ].join(',')
      );
    });

    return lines.join('\r\n');
  }
}

