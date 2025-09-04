import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useLanguage } from '../../contexts/LanguageContext';
import { useColorScheme } from '../../hooks/useColorScheme';
import { IconSymbol } from './IconSymbol';

export const CustomTabBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const { t } = useLanguage();

  const tabs = [
    {
      name: '/',
      title: t('dashboard'),
      icon: 'house.fill',
      route: '/(tabs)/',
    },
    {
      name: '/explore',
      title: t('medicines'),
      icon: 'pill.fill',
      route: '/(tabs)/explore',
    },
    {
      name: '/inventory',
      title: t('inventory'),
      icon: 'cube.box.fill',
      route: '/(tabs)/inventory',
    },
    {
      name: '/prescriptions',
      title: t('prescriptions'),
      icon: null, // Use emoji instead of IconSymbol
      emoji: '📄',
      route: '/(tabs)/prescriptions',
    },
    {
      name: '/ai-insights',
      title: 'AI Insights',
      icon: null, // Special case for emoji
      emoji: '🧠',
      route: '/(tabs)/ai-insights',
    },
  ];

  const handleTabPress = (route: string) => {
    router.push(route as any);
  };

  const isActiveTab = (tabName: string) => {
    if (tabName === '/') {
      return pathname === '/(tabs)' || pathname === '/(tabs)/';
    }
    return pathname.includes(tabName);
  };

  const getTabColor = (tabName: string) => {
    const isActive = isActiveTab(tabName);
    const currentColors = Colors[colorScheme ?? 'light'];
    
    if (isActive) {
      return currentColors.tint; // Blue for active tabs
    }
    
    // Use a consistent gray color that provides good contrast on white background
    return '#6B7280';
  };

  return (
    <View style={[
      styles.container, 
      Platform.OS === 'ios' && styles.iosContainer,
      { 
        backgroundColor: '#FFFFFF', // Always use white background for consistency
        borderTopColor: '#E5E7EB'
      }
    ]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.name}
          style={styles.tab}
          onPress={() => handleTabPress(tab.route)}
          activeOpacity={0.7}
        >
          {tab.icon ? (
            <IconSymbol
              size={24}
              name={tab.icon}
              color={getTabColor(tab.name)}
            />
          ) : (
            <Text style={[styles.emoji, { color: getTabColor(tab.name) }]}>
              {tab.emoji}
            </Text>
          )}
          <Text
            style={[
              styles.tabText,
              {
                color: getTabColor(tab.name),
                fontWeight: isActiveTab(tab.name) ? '600' : '400',
              },
            ]}
          >
            {tab.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  iosContainer: {
    paddingBottom: 20, // Extra padding for iOS home indicator
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  emoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabText: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
});