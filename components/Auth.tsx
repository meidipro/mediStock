import { Platform } from 'react-native';
// Only import GoogleSignin on mobile platforms
let GoogleSignin: any = null;
if (Platform.OS !== 'web') {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
}
import React, { useState } from 'react';
import { Alert, View, Text, ScrollView, KeyboardAvoidingView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent } from './ui/Card';
import { createThemedStyles } from '../constants/Theme';

// Configure Google Sign-In (only on mobile platforms)
if (Platform.OS !== 'web' && GoogleSignin) {
  GoogleSignin.configure({
    webClientId: '799784424825-f4dl3epb4h24kfq3betngaup42ompk4p.apps.googleusercontent.com',
  });
}

export default function Auth() {
  const { user, signIn, signUpWithPharmacy, createPharmacyForUser, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [pharmacyName, setPharmacyName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  // Check if user is authenticated but needs pharmacy setup
  const needsPharmacySetup = user && !user.pharmacy_id;
  
  // Pre-fill user data if they're signed in via Google but need pharmacy setup
  React.useEffect(() => {
    if (needsPharmacySetup) {
      setEmail(user.email || '');
      setFullName(user.full_name || '');
      setIsSignUp(true); // Show the pharmacy setup form
    }
  }, [needsPharmacySetup, user]);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setFormLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      Alert.alert('Sign In Failed', error);
    }
    setFormLoading(false);
  };

  const handleSignUp = async () => {
    // For existing users who need pharmacy setup, don't require password/email validation
    if (needsPharmacySetup) {
      if (!pharmacyName || !address) {
        Alert.alert('Error', 'Please fill in all required fields (marked with *)');
        return;
      }

      setFormLoading(true);
      const { error } = await createPharmacyForUser({
        name: pharmacyName,
        license_number: licenseNumber,
        address: address,
        phone: phone,
        email: email,
      });

      if (error) {
        Alert.alert('Pharmacy Setup Failed', error);
      } else {
        Alert.alert(
          'Pharmacy Setup Complete!',
          'Welcome to MediStock BD! Your pharmacy has been set up and you can now start managing your inventory.',
          [{ text: 'Get Started' }]
        );
      }
      setFormLoading(false);
      return;
    }

    // For new users - full validation
    if (!email || !password || !fullName || !pharmacyName || !address) {
      Alert.alert('Error', 'Please fill in all required fields (marked with *)');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setFormLoading(true);
    const { error } = await signUpWithPharmacy(
      email, 
      password, 
      fullName, 
      {
        name: pharmacyName,
        license_number: licenseNumber,
        address: address,
        phone: phone,
        email: email, // Use same email for pharmacy
      }
    );
    
    if (error) {
      Alert.alert('Sign Up Failed', error);
    } else {
      Alert.alert(
        'Account Created Successfully!',
        'Welcome to MediStock BD! Your pharmacy has been set up and you can now start managing your inventory.',
        [{ text: 'Get Started', onPress: () => setIsSignUp(false) }]
      );
    }
    setFormLoading(false);
  };

  const handleGoogleSignIn = async () => {
    try {
      setFormLoading(true);
      
      if (Platform.OS === 'web') {
        // Web OAuth flow
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          }
        });
        
        if (error) {
          throw new Error('Google sign-in failed: ' + error.message);
        }
      } else {
        // Mobile OAuth flow
        if (!GoogleSignin) {
          throw new Error('Google Sign-In not available');
        }
        
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        const idToken = userInfo.data?.idToken;

        if (idToken) {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
          });
          if (error) {
            throw new Error('Authentication failed: ' + error.message);
          }
        } else {
          throw new Error('Google sign-in failed: No ID token present');
        }
      }
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      Alert.alert('Google Sign-In Error', error.message || 'An unexpected error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Email Required', 'Please enter your email address first.');
      return;
    }

    setFormLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://your-app.com/reset-password', // Replace with your app's reset URL
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'Password Reset Email Sent',
        'Check your email for a password reset link.',
        [{ text: 'OK' }]
      );
    }
    setFormLoading(false);
  };

  const isLoading = loading || formLoading;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>MediStock BD</Text>
          <Text style={styles.subtitle}>
            Modern Pharmacy Management System
          </Text>
        </View>

        <Card style={styles.card} shadow="lg">
          <CardContent>
            <View style={styles.form}>
              <Text style={styles.formTitle}>
                {needsPharmacySetup ? 'Complete Setup' : isSignUp ? 'Create Account' : 'Welcome Back'}
              </Text>
              <Text style={styles.formSubtitle}>
                {needsPharmacySetup 
                  ? 'Set up your pharmacy to get started with MediStock BD'
                  : isSignUp 
                    ? 'Sign up to get started with MediStock BD' 
                    : 'Sign in to your account'
                }
              </Text>

              {(isSignUp || needsPharmacySetup) && (
                <>
                  {/* Personal Information - only for new users */}
                  {!needsPharmacySetup && (
                    <>
                      <Text style={styles.sectionHeader}>Personal Information</Text>
                      <Input
                        label="Full Name *"
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Enter your full name"
                        required
                        autoCapitalize="words"
                      />
                    </>
                  )}
                  
                  {/* Pharmacy Information */}
                  <Text style={styles.sectionHeader}>Pharmacy Information</Text>
                  <Input
                    label="Pharmacy Name *"
                    value={pharmacyName}
                    onChangeText={setPharmacyName}
                    placeholder="Enter your pharmacy name"
                    required
                    autoCapitalize="words"
                  />
                  
                  <Input
                    label="License Number"
                    value={licenseNumber}
                    onChangeText={setLicenseNumber}
                    placeholder="Enter license number (optional)"
                    autoCapitalize="characters"
                  />
                  
                  <Input
                    label="Address *"
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Enter pharmacy address"
                    required
                    multiline
                    numberOfLines={2}
                  />
                  
                  <Input
                    label="Phone Number"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Enter phone number (optional)"
                    keyboardType="phone-pad"
                  />
                </>
              )}

              {/* Email and Password - only for new users and sign in */}
              {!needsPharmacySetup && (
                <>
                  <Input
                    label="Email *"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    required
                  />

                  <Input
                    label="Password *"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    secureTextEntry
                    autoCapitalize="none"
                    required
                    hint={isSignUp ? "Password must be at least 6 characters" : undefined}
                  />
                </>
              )}

              <View style={styles.buttonContainer}>
                <Button
                  title={needsPharmacySetup ? 'Complete Pharmacy Setup' : isSignUp ? 'Create Account' : 'Sign In'}
                  onPress={isSignUp || needsPharmacySetup ? handleSignUp : handleSignIn}
                  loading={isLoading}
                  fullWidth
                  size="lg"
                />

                {!needsPharmacySetup && (
                  <Button
                    title="Continue with Google"
                    onPress={handleGoogleSignIn}
                    variant="outline"
                    loading={isLoading}
                    fullWidth
                    size="lg"
                  />
                )}

                {!isSignUp && !needsPharmacySetup && (
                  <Button
                    title="Forgot Password?"
                    onPress={handleForgotPassword}
                    variant="ghost"
                    loading={isLoading}
                    fullWidth
                    size="sm"
                  />
                )}
              </View>

              {!needsPharmacySetup && (
                <View style={styles.switchContainer}>
                  <Text style={styles.switchText}>
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                  </Text>
                  <Button
                    title={isSignUp ? 'Sign In' : 'Sign Up'}
                    variant="ghost"
                    onPress={() => setIsSignUp(!isSignUp)}
                    disabled={isLoading}
                  />
                </View>
              )}
            </View>
          </CardContent>
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Secure • Modern • Efficient
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center' as const,
    padding: theme.spacing.md,
  },
  
  header: {
    alignItems: 'center' as const,
    marginBottom: theme.spacing.xl,
  },
  
  title: {
    fontSize: theme.typography.sizes.display,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.primary,
    textAlign: 'center' as const,
    marginBottom: theme.spacing.sm,
  },
  
  subtitle: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  
  card: {
    marginBottom: theme.spacing.xl,
  },
  
  form: {
    gap: theme.spacing.md,
  },
  
  formTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
    textAlign: 'center' as const,
  },
  
  formSubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: theme.spacing.md,
  },
  
  sectionHeader: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  
  buttonContainer: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  
  switchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: theme.spacing.md,
  },
  
  switchText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
  },
  
  footer: {
    alignItems: 'center' as const,
  },
  
  footerText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textTertiary,
    textAlign: 'center' as const,
  },
}));