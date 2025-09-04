import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Sidebar } from '../components/ui/Sidebar';
import { Theme, createThemedStyles } from '../constants/Theme';

export default function ProfileScreen() {
  const { user, pharmacy, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    pharmacyName: pharmacy?.name || '',
    pharmacyAddress: pharmacy?.address || '',
    pharmacyPhone: pharmacy?.phone || '',
    pharmacyEmail: pharmacy?.email || '',
    licenseNumber: pharmacy?.license_number || '',
  });

  const handleSave = async () => {
    try {
      // Here you would implement the actual save functionality
      // For now, we'll just show a success message
      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut }
      ]
    );
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'bn' : 'en');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Sidebar */}
      <Sidebar 
        isVisible={sidebarVisible} 
        onToggle={() => setSidebarVisible(!sidebarVisible)}
        currentRoute="profile"
      />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => setSidebarVisible(true)} 
            style={styles.menuButton}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Profile Management</Text>
            <Text style={styles.headerSubtitle}>Manage your account and pharmacy settings</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Personal Information */}
        <Card style={styles.card}>
          <CardHeader>
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardTitle}>👤 Personal Information</Text>
              <TouchableOpacity
                onPress={() => setIsEditing(!isEditing)}
                style={styles.editButton}
              >
                <Text style={styles.editButtonText}>
                  {isEditing ? 'Cancel' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>
          </CardHeader>
          <CardContent>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name</Text>
              {isEditing ? (
                <Input
                  value={profileData.fullName}
                  onChangeText={(text) => setProfileData({...profileData, fullName: text})}
                  placeholder="Enter your full name"
                />
              ) : (
                <Text style={styles.value}>{profileData.fullName || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{profileData.email}</Text>
              <Text style={styles.hint}>Email cannot be changed</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone</Text>
              {isEditing ? (
                <Input
                  value={profileData.phone}
                  onChangeText={(text) => setProfileData({...profileData, phone: text})}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.value}>{profileData.phone || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Role</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{user?.role?.toUpperCase() || 'OWNER'}</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Pharmacy Information */}
        {pharmacy && (
          <Card style={styles.card}>
            <CardHeader>
              <Text style={styles.cardTitle}>🏥 Pharmacy Information</Text>
            </CardHeader>
            <CardContent>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Pharmacy Name</Text>
                {isEditing ? (
                  <Input
                    value={profileData.pharmacyName}
                    onChangeText={(text) => setProfileData({...profileData, pharmacyName: text})}
                    placeholder="Enter pharmacy name"
                  />
                ) : (
                  <Text style={styles.value}>{profileData.pharmacyName}</Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>License Number</Text>
                {isEditing ? (
                  <Input
                    value={profileData.licenseNumber}
                    onChangeText={(text) => setProfileData({...profileData, licenseNumber: text})}
                    placeholder="Enter license number"
                  />
                ) : (
                  <Text style={styles.value}>{profileData.licenseNumber || 'Not set'}</Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Address</Text>
                {isEditing ? (
                  <Input
                    value={profileData.pharmacyAddress}
                    onChangeText={(text) => setProfileData({...profileData, pharmacyAddress: text})}
                    placeholder="Enter pharmacy address"
                    multiline
                    numberOfLines={3}
                  />
                ) : (
                  <Text style={styles.value}>{profileData.pharmacyAddress || 'Not set'}</Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone</Text>
                {isEditing ? (
                  <Input
                    value={profileData.pharmacyPhone}
                    onChangeText={(text) => setProfileData({...profileData, pharmacyPhone: text})}
                    placeholder="Enter pharmacy phone"
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={styles.value}>{profileData.pharmacyPhone || 'Not set'}</Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                {isEditing ? (
                  <Input
                    value={profileData.pharmacyEmail}
                    onChangeText={(text) => setProfileData({...profileData, pharmacyEmail: text})}
                    placeholder="Enter pharmacy email"
                    keyboardType="email-address"
                  />
                ) : (
                  <Text style={styles.value}>{profileData.pharmacyEmail || 'Not set'}</Text>
                )}
              </View>
            </CardContent>
          </Card>
        )}

        {/* App Settings */}
        <Card style={styles.card}>
          <CardHeader>
            <Text style={styles.cardTitle}>⚙️ App Settings</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Language</Text>
                <Text style={styles.settingSubtitle}>
                  Current: {language === 'en' ? 'English' : 'বাংলা'}
                </Text>
              </View>
              <TouchableOpacity onPress={toggleLanguage} style={styles.settingButton}>
                <Text style={styles.settingButtonText}>
                  {language === 'en' ? 'বাংলা' : 'English'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Theme</Text>
                <Text style={styles.settingSubtitle}>Light mode (Dark mode coming soon)</Text>
              </View>
              <TouchableOpacity style={[styles.settingButton, styles.disabledButton]}>
                <Text style={[styles.settingButtonText, styles.disabledText]}>Auto</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Notifications</Text>
                <Text style={styles.settingSubtitle}>Low stock alerts and reminders</Text>
              </View>
              <TouchableOpacity style={styles.settingButton}>
                <Text style={styles.settingButtonText}>On</Text>
              </TouchableOpacity>
            </View>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card style={styles.card}>
          <CardContent>
            {isEditing && (
              <Button
                title="Save Changes"
                onPress={handleSave}
                variant="primary"
                style={styles.actionButton}
              />
            )}
            
            <Button
              title="Change Password"
              onPress={() => Alert.alert('Coming Soon', 'Password change feature will be available soon')}
              variant="outline"
              style={styles.actionButton}
            />
            
            <Button
              title="Sign Out"
              onPress={handleSignOut}
              variant="outline"
              style={[styles.actionButton, { borderColor: Theme.colors.error }]}
            />
          </CardContent>
        </Card>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },

  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 35,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },

  headerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },

  menuButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  menuIcon: {
    fontSize: 18,
    color: theme.colors.background,
    fontWeight: theme.typography.weights.bold,
  },

  headerInfo: {
    flex: 1,
  },

  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
  },

  headerSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.background,
    opacity: 0.8,
    marginTop: 1,
  },

  content: {
    flex: 1,
    padding: theme.spacing.md,
  },

  card: {
    marginBottom: theme.spacing.lg,
  },

  cardTitleContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },

  cardTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },

  editButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },

  editButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.background,
  },

  formGroup: {
    marginBottom: theme.spacing.lg,
  },

  label: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  value: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },

  hint: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic' as const,
  },

  roleBadge: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.full,
  },

  roleText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
  },

  settingItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },

  settingInfo: {
    flex: 1,
  },

  settingTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  settingSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  settingButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },

  settingButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.background,
  },

  disabledButton: {
    backgroundColor: theme.colors.borderLight,
  },

  disabledText: {
    color: theme.colors.textTertiary,
  },

  actionButton: {
    marginBottom: theme.spacing.md,
  },

  bottomSpacing: {
    height: theme.spacing.xxl,
  },
}));