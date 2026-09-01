import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export interface TransferReceiptData {
  amount: number;
  currencySymbol: string;
  senderUsername: string;
  senderAccount: string;
  recipientUsername: string;
  recipientAccount?: string;
  date: string | Date;
  reason?: string;
  referenceId?: string;
}

export async function generateAndShareTransferReceipt(data: TransferReceiptData): Promise<void> {
  try {
    const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const refCode = data.referenceId || `TRX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const formattedAmount = `${data.currencySymbol} ${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transfer Receipt - ${refCode}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    body {
      background-color: #0B0F19;
      color: #F8FAFC;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 30px 15px;
      min-height: 100vh;
    }

    .receipt-card {
      background: linear-gradient(180deg, #0F172A 0%, #0B0F19 100%);
      border: 1px solid #1E293B;
      border-radius: 24px;
      width: 100%;
      max-width: 480px;
      padding: 36px 30px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      position: relative;
    }

    .header-logo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #1E293B;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }

    .brand-title {
      font-size: 16px;
      font-weight: 900;
      background: linear-gradient(135deg, #6366F1 0%, #A855F7 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.3px;
    }

    .verified-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #10B981;
      padding: 4px 10px;
      border-radius: 100px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .hero-amount-box {
      text-align: center;
      padding: 24px 0 28px 0;
      border-bottom: 1px dashed #334155;
      margin-bottom: 24px;
    }

    .hero-label {
      font-size: 12px;
      font-weight: 700;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }

    .hero-amount {
      font-size: 36px;
      font-weight: 900;
      color: #FFFFFF;
      letter-spacing: -1px;
      text-shadow: 0 0 30px rgba(99, 102, 241, 0.3);
    }

    .transfer-status {
      display: inline-block;
      margin-top: 10px;
      font-size: 12px;
      font-weight: 700;
      color: #10B981;
    }

    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 28px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }

    .info-label {
      color: #64748B;
      font-weight: 600;
    }

    .info-val {
      color: #F1F5F9;
      font-weight: 700;
      text-align: right;
    }

    .user-pill {
      background: #1E293B;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 800;
      color: #818CF8;
    }

    .footer-seal {
      border-top: 1px solid #1E293B;
      padding-top: 20px;
      text-align: center;
    }

    .ref-code {
      font-family: monospace;
      font-size: 11px;
      color: #64748B;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .security-note {
      font-size: 10px;
      color: #475569;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="header-logo">
      <div class="brand-title">PERSONAL MONEY MANAGER</div>
      <div class="verified-badge">? Verified Transfer</div>
    </div>

    <div class="hero-amount-box">
      <div class="hero-label">Amount Transferred</div>
      <div class="hero-amount">${formattedAmount}</div>
      <div class="transfer-status">? Atomic P2P Vault Transfer Complete</div>
    </div>

    <div class="info-grid">
      <div class="info-row">
        <span class="info-label">Sender</span>
        <span class="info-val"><span class="user-pill">@${data.senderUsername}</span> (${data.senderAccount})</span>
      </div>
      <div class="info-row">
        <span class="info-label">Recipient</span>
        <span class="info-val"><span class="user-pill">@${data.recipientUsername}</span> ${data.recipientAccount ? `(${data.recipientAccount})` : ''}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Date & Time</span>
        <span class="info-val">${formattedDate}</span>
      </div>
      ${data.reason ? `
      <div class="info-row">
        <span class="info-label">Note / Memo</span>
        <span class="info-val">${data.reason}</span>
      </div>` : ''}
      <div class="info-row">
        <span class="info-label">Status</span>
        <span class="info-val" style="color: #10B981;">Completed (Settled Instantly)</span>
      </div>
    </div>

    <div class="footer-seal">
      <div class="ref-code">REF: ${refCode}</div>
      <div class="security-note">?? 256-bit AES Encrypted Ledger • Official Transaction Record</div>
    </div>
  </div>
</body>
</html>
`;

    // 1. Generate PDF
    const file = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // 2. Share via Native Sheet (WhatsApp, Telegram, Email, Save)
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Transfer Receipt - ${refCode}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('Success', `Receipt generated at: ${file.uri}`);
    }
  } catch (error: any) {
    console.error('Error generating transfer receipt:', error);
    Alert.alert('Export Failed', error.message || 'Could not generate transfer receipt.');
  }
}
