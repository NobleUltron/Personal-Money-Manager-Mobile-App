import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Landmark, Smartphone, Wallet, CreditCard, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { Account } from '../../types';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Radius, Spacing, Typography } from '../../constants/theme';

interface AssetAllocationCardProps {
  accounts: Account[];
  currencySymbol?: string;
}

export const AssetAllocationCard: React.FC<AssetAllocationCardProps> = ({
  accounts = [],
  currencySymbol = 'UGX',
}) => {
  const { colors, isDark } = useTheme();
  const { formatAmount } = usePrivacy();

  const totalLiquid = accounts.reduce((sum, acc) => sum + Math.max(0, Number(acc.balance || 0)), 0);

  const getAccountConfig = (type: string) => {
    switch (type.toLowerCase()) {
      case 'bank':
        return {
          icon: <Landmark size={15} color="#6366F1" />,
          color: '#6366F1',
          bg: 'rgba(99, 102, 241, 0.15)',
        };
      case 'mobile_money':
      case 'mobile money':
        return {
          icon: <Smartphone size={15} color="#10B981" />,
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.15)',
        };
      case 'credit_card':
      case 'credit':
        return {
          icon: <CreditCard size={15} color="#F59E0B" />,
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.15)',
        };
      default:
        return {
          icon: <Wallet size={15} color="#3B82F6" />,
          color: '#3B82F6',
          bg: 'rgba(59, 130, 246, 0.15)',
        };
    }
  };

  if (accounts.length === 0) return null;

  return (
    <Card style={styles.card}>
      {/* Card Header with Safe Flex Constraints */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
            <Wallet size={17} color="#6366F1" />
          </View>
          <View style={styles.headerTextWrapper}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
              Liquid Asset Allocation
            </Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
              Distribution across {accounts.length} active {accounts.length === 1 ? 'wallet' : 'wallets'}
            </Text>
          </View>
        </View>

        <View style={[styles.totalPill, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
          <Text
            style={[styles.totalAmountText, { color: colors.primary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formatAmount(totalLiquid, currencySymbol)}
          </Text>
        </View>
      </View>

      {/* Account Items List */}
      <View style={{ gap: 12, marginTop: Spacing.sm }}>
        {accounts.map((acc) => {
          const bal = Math.max(0, Number(acc.balance || 0));
          const pct = totalLiquid > 0 ? Math.round((bal / totalLiquid) * 1000) / 10 : 0;
          const config = getAccountConfig(acc.type);

          return (
            <View key={acc.id} style={styles.itemRow}>
              <View style={styles.itemHeader}>
                <View style={styles.itemLeft}>
                  <View style={[styles.accIconBox, { backgroundColor: config.bg }]}>
                    {config.icon}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.accName, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                      {acc.name}
                    </Text>
                    {acc.bank_name && (
                      <Text style={[styles.accBank, { color: colors.textMuted }]} numberOfLines={1}>
                        {acc.bank_name}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.itemRight}>
                  <Text
                    style={[styles.accBalance, { color: colors.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {formatAmount(bal, currencySymbol)}
                  </Text>
                  <Text style={[styles.accPct, { color: config.color }]}>
                    {pct}% of wealth
                  </Text>
                </View>
              </View>

              <ProgressBar
                progress={Math.max(2, Math.min(100, Math.round(pct)))}
                color={config.color}
                height={5}
              />
            </View>
          );
        })}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: Radius.xl,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  headerTextWrapper: {
    flex: 1,
    minWidth: 0,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  sub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  totalPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.md,
    maxWidth: '40%',
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
  },
  totalAmountText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  itemRow: {
    gap: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  accIconBox: {
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  accName: {
    fontSize: 13,
    fontWeight: '700',
  },
  accBank: {
    fontSize: 10,
    fontWeight: '500',
  },
  itemRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  accBalance: {
    fontSize: 13,
    fontWeight: '800',
  },
  accPct: {
    fontSize: 10,
    fontWeight: '800',
  },
});