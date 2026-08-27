import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import {
  X,
  ShieldCheck,
  QrCode,
  Copy,
  CheckCircle2,
  KeyRound,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { settingsApi } from '../../services/api';
import { triggerHaptic } from '../../utils/haptics';
import { Button } from './Button';
import { OtpPinInput } from './OtpPinInput';
import { Radius, Spacing, Typography } from '../../constants/theme';

interface TwoFactorSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors, isDark } = useTheme();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

  // Setup Data
  const [secret, setSecret] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');

  useEffect(() => {
    if (visible) {
      setStep(1);
      setError('');
      setVerificationCode('');
      setConfirmedSaved(false);
      setCopiedKey(false);
      setCopiedCodes(false);
      fetchSetupData();
    }
  }, [visible]);

  const fetchSetupData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await settingsApi.setup2FA();
      setSecret(data.secret);
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setBackupCodes(data.backupCodes);
    } catch (e: any) {
      setError(e.message || 'Failed to initialize 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecretKey = async () => {
    if (!secret) return;
    triggerHaptic.selection();
    await Clipboard.setStringAsync(secret);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCopyBackupCodes = async () => {
    if (backupCodes.length === 0) return;
    triggerHaptic.selection();
    const formatted = `Personal Money Manager - 2FA Emergency Backup Codes:\n${backupCodes.join('\n')}\n\nKeep these codes private. Each code can be used once.`;
    await Clipboard.setStringAsync(formatted);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2500);
  };

  const handleVerifyCode = async (codeToVerify = verificationCode) => {
    if (codeToVerify.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setVerifying(true);
    setError('');
    try {
      await settingsApi.enable2FA({
        code: codeToVerify,
        secret,
        backupCodes,
      });
      triggerHaptic.success();
      setStep(3); // Go to Backup Codes presentation step
    } catch (e: any) {
      triggerHaptic.error();
      setError(e.message || 'Invalid code. Check your authenticator app time.');
    } finally {
      setVerifying(false);
    }
  };

  const handleFinish = () => {
    if (!confirmedSaved) {
      triggerHaptic.error();
      Alert.alert(
        'Save Backup Codes',
        'Please confirm that you have copied or saved your emergency recovery codes before completing setup.',
      );
      return;
    }
    triggerHaptic.success();
    onSuccess();
    onClose();
  };

  return (
    <RNModal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.stepBadge, { backgroundColor: colors.primaryLight }]}>
              <ShieldCheck size={16} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {step === 1
                  ? 'Connect Authenticator'
                  : step === 2
                  ? 'Verify 6-Digit Code'
                  : 'Emergency Backup Codes'}
              </Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                Step {step} of 3 • TOTP Security
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic.light();
              onClose();
            }}
            style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
          >
            <X size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Generating secure keypair...
              </Text>
            </View>
          ) : error && step === 1 ? (
            <View style={[styles.errorCardFull, { backgroundColor: colors.dangerLight }]}>
              <AlertTriangle size={28} color={colors.danger} />
              <Text style={[styles.errorTextFull, { color: colors.danger }]}>{error}</Text>
              <Button title="Retry Connection" onPress={fetchSetupData} size="md" style={{ width: '100%', marginTop: 8 }} />
            </View>
          ) : (
            <>
              {/* STEP 1: Scan QR or Copy Key */}
              {step === 1 && (
                <View style={styles.stepContainer}>
                  <Text style={[styles.instruction, { color: colors.textSecondary }]}>
                    Scan the QR code with <Text style={{ fontWeight: '800', color: colors.text }}>Google Authenticator</Text>, <Text style={{ fontWeight: '800', color: colors.text }}>Microsoft Authenticator</Text>, or <Text style={{ fontWeight: '800', color: colors.text }}>Authy</Text>.
                  </Text>

                  {qrCodeDataUrl ? (
                    <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
                      <Image
                        source={{ uri: qrCodeDataUrl }}
                        style={styles.qrImage}
                        resizeMode="contain"
                      />
                    </View>
                  ) : null}

                  {/* Manual Key Box */}
                  <View style={[styles.keyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.keyLabel, { color: colors.textMuted }]}>CAN'T SCAN? USE MANUAL KEY</Text>
                      <Text style={[styles.keyValue, { color: colors.text }]} selectable>
                        {secret}
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleCopySecretKey}
                      style={[styles.copyBtn, { backgroundColor: copiedKey ? colors.successLight : colors.surfaceElevated }]}
                    >
                      {copiedKey ? (
                        <CheckCircle2 size={16} color={colors.success} />
                      ) : (
                        <Copy size={16} color={colors.primary} />
                      )}
                      <Text style={[styles.copyBtnText, { color: copiedKey ? colors.success : colors.primary }]}>
                        {copiedKey ? 'Copied' : 'Copy'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Button
                    title="Next: Verify Code"
                    onPress={() => {
                      triggerHaptic.selection();
                      setStep(2);
                    }}
                    size="lg"
                    style={{ marginTop: Spacing.md }}
                  />
                </View>
              )}

              {/* STEP 2: Verify 6-Digit Code */}
              {step === 2 && (
                <View style={styles.stepContainer}>
                  <Text style={[styles.instruction, { color: colors.textSecondary }]}>
                    Enter the 6-digit rolling code shown in your Authenticator app to confirm setup.
                  </Text>

                  {error ? (
                    <View style={[styles.errorCard, { backgroundColor: colors.dangerLight }]}>
                      <AlertTriangle size={18} color={colors.danger} />
                      <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                    </View>
                  ) : null}

                  <OtpPinInput
                    value={verificationCode}
                    onChange={(val) => {
                      setVerificationCode(val);
                      setError('');
                    }}
                    onComplete={(code) => handleVerifyCode(code)}
                    disabled={verifying}
                  />

                  <Button
                    title="Verify & Enable 2FA"
                    loading={verifying}
                    onPress={() => handleVerifyCode()}
                    size="lg"
                    style={{ marginTop: Spacing.sm }}
                  />

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      triggerHaptic.light();
                      setStep(1);
                    }}
                    style={styles.backBtn}
                  >
                    <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>
                      ← Back to QR Code
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 3: Emergency Backup Codes */}
              {step === 3 && (
                <View style={styles.stepContainer}>
                  <View style={[styles.alertBanner, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7', borderColor: '#F59E0B' }]}>
                    <ShieldAlert size={20} color="#F59E0B" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.alertBannerTitle, { color: '#F59E0B' }]}>
                        Save Emergency Recovery Codes
                      </Text>
                      <Text style={[styles.alertBannerSub, { color: colors.textSecondary }]}>
                        If you lose access to your phone or authenticator app, each code can be used once to log in.
                      </Text>
                    </View>
                  </View>

                  {/* 2-Column Backup Codes Grid */}
                  <View style={[styles.codesGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {backupCodes.map((code, idx) => (
                      <View key={code} style={styles.codeCell}>
                        <Text style={[styles.codeIndex, { color: colors.textMuted }]}>{idx + 1}.</Text>
                        <Text style={[styles.codeValue, { color: colors.text }]}>{code}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Copy All Codes Button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleCopyBackupCodes}
                    style={[styles.copyAllBtn, { backgroundColor: copiedCodes ? colors.successLight : colors.surfaceElevated, borderColor: copiedCodes ? colors.success : colors.border }]}
                  >
                    {copiedCodes ? (
                      <CheckCircle2 size={16} color={colors.success} />
                    ) : (
                      <Copy size={16} color={colors.primary} />
                    )}
                    <Text style={[styles.copyAllBtnText, { color: copiedCodes ? colors.success : colors.primary }]}>
                      {copiedCodes ? 'Backup Codes Copied to Clipboard!' : 'Copy All Backup Codes'}
                    </Text>
                  </TouchableOpacity>

                  {/* Confirmation Checkbox */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      triggerHaptic.selection();
                      setConfirmedSaved(!confirmedSaved);
                    }}
                    style={styles.checkRow}
                  >
                    <View style={[styles.checkBox, { borderColor: confirmedSaved ? colors.primary : colors.border, backgroundColor: confirmedSaved ? colors.primary : 'transparent' }]}>
                      {confirmedSaved && <CheckCircle2 size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.checkLabel, { color: colors.text }]}>
                      I have safely saved my 8 recovery backup codes.
                    </Text>
                  </TouchableOpacity>

                  <Button
                    title="Complete 2FA Activation"
                    onPress={handleFinish}
                    size="lg"
                    style={{ marginTop: Spacing.md }}
                  />
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl * 2,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  stepContainer: {
    gap: 12,
  },
  instruction: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
  qrContainer: {
    alignSelf: 'center',
    padding: 12,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginVertical: Spacing.xs,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  keyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: 10,
  },
  keyLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  keyValue: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  errorCardFull: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: Spacing.md,
  },
  errorTextFull: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  backBtn: {
    alignSelf: 'center',
    marginTop: Spacing.sm,
    padding: Spacing.xs,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  alertBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  alertBannerSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 15,
  },
  codesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginVertical: Spacing.xs,
  },
  codeCell: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  codeIndex: {
    fontSize: 12,
    fontWeight: '700',
    width: 20,
  },
  codeValue: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 0.8,
  },
  copyAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  copyAllBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: Spacing.sm,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});