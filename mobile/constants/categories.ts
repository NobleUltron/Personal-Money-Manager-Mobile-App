export interface CategoryConfig {
  name: string;
  color: string;
  bgColor: string;
  iconName: string;
}

export const CATEGORIES: CategoryConfig[] = [
  { name: 'Food & Dining', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)', iconName: 'Utensils' },
  { name: 'Housing & Rent', color: '#6366F1', bgColor: 'rgba(99, 102, 241, 0.15)', iconName: 'Home' },
  { name: 'Transportation', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)', iconName: 'Car' },
  { name: 'Utilities', color: '#EAB308', bgColor: 'rgba(234, 179, 8, 0.15)', iconName: 'Zap' },
  { name: 'Shopping', color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.15)', iconName: 'ShoppingBag' },
  { name: 'Healthcare', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)', iconName: 'HeartPulse' },
  { name: 'Entertainment', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.15)', iconName: 'Film' },
  { name: 'Salary & Wages', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)', iconName: 'Banknote' },
  { name: 'Business Income', color: '#14B8A6', bgColor: 'rgba(20, 184, 166, 0.15)', iconName: 'TrendingUp' },
  { name: 'Investments', color: '#F97316', bgColor: 'rgba(249, 115, 22, 0.15)', iconName: 'Coins' },
  { name: 'Transfer', color: '#06B6D4', bgColor: 'rgba(6, 182, 212, 0.15)', iconName: 'ArrowLeftRight' },
  { name: 'Loan / Borrowed', color: '#D946EF', bgColor: 'rgba(217, 70, 239, 0.15)', iconName: 'CreditCard' },
  { name: 'Loan / Lent', color: '#84CC16', bgColor: 'rgba(132, 204, 22, 0.15)', iconName: 'HandCoins' },
  { name: 'Other', color: '#64748B', bgColor: 'rgba(100, 116, 139, 0.15)', iconName: 'Tag' },
];

export const getCategoryConfig = (categoryName?: string | null): CategoryConfig => {
  if (!categoryName) return CATEGORIES[CATEGORIES.length - 1]; // Other
  const found = CATEGORIES.find(
    (c) => c.name.toLowerCase() === categoryName.trim().toLowerCase()
  );
  return (
    found || {
      name: categoryName,
      color: '#64748B',
      bgColor: 'rgba(100, 116, 139, 0.15)',
      iconName: 'Tag',
    }
  );
};