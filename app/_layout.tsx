import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import 'react-native-reanimated';

import Auth from '@/components/Auth';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Theme } from '@/constants/Theme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useColorScheme } from '@/hooks/useColorScheme';

function AppContent() {
  const { user, pharmacy, loading } = useAuth();
  const [loadingTime, setLoadingTime] = useState(0);
  const [showForceButton, setShowForceButton] = useState(false);

  // Track loading time to detect stuck states
  useEffect(() => {
    let interval: number;
    
    if (loading) {
      setLoadingTime(0);
      interval = window.setInterval(() => {
        setLoadingTime(prev => {
          const newTime = prev + 1;
          // Show force button after 10 seconds of loading
          if (newTime >= 10) {
            setShowForceButton(true);
          }
          return newTime;
        });
      }, 1000);
    } else {
      setLoadingTime(0);
      setShowForceButton(false);
      if (interval) {
        window.clearInterval(interval);
      }
    }

    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [loading]);

  const forceRefresh = () => {
    console.log('🔄 Force refresh triggered by user');
    window.location.reload();
  };

  console.log('AppContent render - Loading:', loading, 'User:', !!user, 'Pharmacy:', !!pharmacy);
  console.log('User details:', user ? { id: user.id, email: user.email, pharmacy_id: user.pharmacy_id } : null);
  console.log('Pharmacy details:', pharmacy ? { id: pharmacy.id, name: pharmacy.name } : null);

  if (loading) {
    console.log('Showing loading screen');
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: Theme.colors.backgroundSecondary,
        padding: 20
      }}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={{ 
          marginTop: 16, 
          color: Theme.colors.text, 
          fontSize: 16 
        }}>
          Loading MediStock BD...
        </Text>
        {loadingTime > 5 && (
          <Text style={{ 
            marginTop: 8, 
            color: Theme.colors.textSecondary, 
            fontSize: 14 
          }}>
            Loading for {loadingTime} seconds...
          </Text>
        )}
        {showForceButton && (
          <TouchableOpacity 
            onPress={forceRefresh}
            style={{
              marginTop: 20,
              paddingHorizontal: 20,
              paddingVertical: 12,
              backgroundColor: Theme.colors.primary,
              borderRadius: 8,
            }}
          >
            <Text style={{ 
              color: 'white', 
              fontWeight: 'bold' 
            }}>
              Taking too long? Refresh App
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!user) {
    console.log('No user, showing Auth component');
    return <Auth />;
  }

  // If user exists but doesn't have a pharmacy, they need to sign up again with pharmacy details
  // This shouldn't happen with the new flow, but just in case, show auth screen
  if (user && !pharmacy) {
    console.log('User exists but no pharmacy - this should not happen with new flow');
    console.log('User needs to complete registration with pharmacy details');
    return <Auth />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="Account" options={{ headerShown: false }} />
      <Stack.Screen name="Profile" options={{ headerShown: false }} />
      <Stack.Screen name="InvoiceManagement" options={{ headerShown: false, presentation: 'card' }} />
      <Stack.Screen name="DueInvoices" options={{ headerShown: false, presentation: 'card' }} />
      <Stack.Screen name="subscription" options={{ headerShown: false, presentation: 'card' }} />
      <Stack.Screen name="payment" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <LanguageProvider>
          <AuthProvider>
            <AppContent />
            <StatusBar style="auto" />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
