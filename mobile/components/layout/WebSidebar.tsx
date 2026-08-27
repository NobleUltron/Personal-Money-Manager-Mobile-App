import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LayoutDashboard,
  Landmark,
  PieChart,
  Settings,
  Plus,
  LogOut,
  Wallet
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useQuickEntry } from '../../context/QuickEntryContext';
import { useAuth } from '../../context/AuthContext';
import { Radius, Spacing, Typography, Gradients } from '../../constants/theme';
import { triggerHaptic } from '../../utils/haptics';

export const WebSidebar = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { openQuickEntry } = useQuickEntry();
  const { logout } = useAuth();

  const NAV_ITEMS = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Accounts', path: '/accounts', icon: Landmark },
    { name: 'Budgets', path: '/budgets', icon: PieChart },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderRightColor: colors.border }]}> 
      {/* Brand */}
      <View style={styles.brandContainer}>
        <View style={styles.logoIcon}>
          <Wallet size={24} color="#FFFFFF" />
        </View>
        <Text style={[styles.brandText, { color: colors.text }]}>PMM</Text>
      </View>

      {/* Main Action */}
      <TouchableOpacity 
        style={styles.quickEntryBtnWrapper} 
        activeOpacity={0.8}
        onPress={() => {
          triggerHaptic.medium();
          openQuickEntry();
        }}
      >
        <LinearGradient
          colors={Gradients.primary as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.quickEntryBtn}
        >
          <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.quickEntryText}>Quick Entry</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Nav Links */}
      <ScrollView style={styles.navContainer} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.path}
              style={[
                styles.navItem,
                isActive && { backgroundColor: 'rgba(99, 102, 241, 0.15)' }
              ]}
              onPress={() => {
                triggerHaptic.light();
                router.push(item.path as any);
              }}
            >
              <Icon 
                size={22} 
                color={isActive ? colors.primary : colors.textMuted} 
                strokeWidth={isActive ? 2.5 : 2} 
              />
              <Text style={[
                styles.navText,
                { color: isActive ? colors.primary : colors.textMuted },
                isActive && { fontWeight: '700' }
              ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer / Logout */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={20} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 260,
    height: '100%',
    borderRightWidth: 1,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xl * 1.5,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  quickEntryBtnWrapper: {
    marginBottom: Spacing.xl,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  quickEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.lg,
  },
  quickEntryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  navContainer: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
  },
  navText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: Spacing.lg,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
  }
});