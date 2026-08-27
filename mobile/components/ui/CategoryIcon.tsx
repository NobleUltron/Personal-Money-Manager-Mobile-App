import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import {
  Utensils,
  Home,
  Car,
  Zap,
  ShoppingBag,
  HeartPulse,
  Film,
  Banknote,
  TrendingUp,
  Coins,
  ArrowLeftRight,
  CreditCard,
  HandCoins,
  Tag,
  Package,
  Sparkles,
} from 'lucide-react-native';
import { getCategoryConfig } from '../../constants/categories';

interface CategoryIconProps {
  categoryName?: string | null;
  size?: number;
  iconSize?: number;
  showBackground?: boolean;
  style?: ViewStyle;
  customColor?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  categoryName,
  size = 32,
  iconSize,
  showBackground = true,
  style,
  customColor,
}) => {
  const config = getCategoryConfig(categoryName);
  const color = customColor || config.color;
  const iSize = iconSize || Math.round(size * 0.52);

  const renderIcon = () => {
    switch (config.iconName) {
      case 'Utensils':
        return <Utensils size={iSize} color={color} />;
      case 'Home':
        return <Home size={iSize} color={color} />;
      case 'Car':
        return <Car size={iSize} color={color} />;
      case 'Zap':
        return <Zap size={iSize} color={color} />;
      case 'ShoppingBag':
        return <ShoppingBag size={iSize} color={color} />;
      case 'HeartPulse':
        return <HeartPulse size={iSize} color={color} />;
      case 'Film':
        return <Film size={iSize} color={color} />;
      case 'Banknote':
        return <Banknote size={iSize} color={color} />;
      case 'TrendingUp':
        return <TrendingUp size={iSize} color={color} />;
      case 'Coins':
        return <Coins size={iSize} color={color} />;
      case 'ArrowLeftRight':
        return <ArrowLeftRight size={iSize} color={color} />;
      case 'CreditCard':
        return <CreditCard size={iSize} color={color} />;
      case 'HandCoins':
        return <HandCoins size={iSize} color={color} />;
      case 'Package':
        return <Package size={iSize} color={color} />;
      default:
        return <Tag size={iSize} color={color} />;
    }
  };

  if (!showBackground) {
    return <View style={style}>{renderIcon()}</View>;
  }

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.3),
          backgroundColor: config.bgColor,
        },
        style,
      ]}
    >
      {renderIcon()}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});