import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Text } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useLanguage } from '@/contexts/LanguageContext';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useLanguage();

  return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              position: 'absolute',
            },
            default: {},
          }),
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: t('dashboard'),
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: t('medicines'),
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="pill.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            title: t('inventory'),
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="cube.box.fill" color={color} />,
          }}
        />

        <Tabs.Screen
          name="prescriptions"
          options={{
            title: t('prescriptions'),
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>📄</Text>,
          }}
        />
        <Tabs.Screen
          name="ai-insights"
          options={{
            title: 'AI Insights',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🧠</Text>,
          }}
        />
      </Tabs>
  );
}
