/**
 * MEDICINE KNOWLEDGE BASE MANAGER
 * Admin component for managing the 1000+ medicine knowledge base
 * Handles syncing, monitoring, and maintenance operations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Theme, createThemedStyles } from '../../constants/Theme';
import { useMedicineKnowledgeSync } from '../../hooks/useMedicineKnowledgeSync';
import { masterMedicineDatabase, databaseStats } from '../../lib/medicine-database-master';

const { width } = Dimensions.get('window');

interface MedicineKnowledgeManagerProps {
  onClose?: () => void;
}

export const MedicineKnowledgeManager: React.FC<MedicineKnowledgeManagerProps> = ({
  onClose
}) => {
  const [state, actions] = useMedicineKnowledgeSync();
  const [activeTab, setActiveTab] = useState<'overview' | 'sync' | 'maintenance'>('overview');

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const formatDate = (dateString: string): string => {
    if (dateString === 'Never') return dateString;
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const handleSyncConfirmation = () => {
    Alert.alert(
      'Sync Medicine Knowledge Base',
      `This will sync ${formatNumber(masterMedicineDatabase.length)} medicines to the database. This may take several minutes. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sync', 
          style: 'default',
          onPress: actions.syncAllMedicines
        }
      ]
    );
  };

  const handleClearConfirmation = () => {
    Alert.alert(
      '⚠️ Clear Knowledge Base',
      'This will permanently delete all medicine knowledge base data. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete All', 
          style: 'destructive',
          onPress: actions.clearKnowledgeBase
        }
      ]
    );
  };

  const renderOverviewTab = () => (
    <View>
      {/* Database Status */}
      <Card style={styles.statusCard}>
        <CardHeader>
          <View style={styles.cardHeaderWithIcon}>
            <Ionicons 
              name={state.syncStatus?.is_synced ? "checkmark-circle" : "alert-circle"} 
              size={20} 
              color={state.syncStatus?.is_synced ? Theme.colors.success : Theme.colors.warning} 
            />
            <Text style={styles.cardTitle}>Database Status</Text>
          </View>
        </CardHeader>
        <CardContent>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Sync Status</Text>
              <View style={styles.statusBadge}>
                <Text style={[
                  styles.statusValue,
                  { color: state.syncStatus?.is_synced ? Theme.colors.success : Theme.colors.warning }
                ]}>
                  {state.syncStatus?.is_synced ? 'Synced' : 'Not Synced'}
                </Text>
              </View>
            </View>
            
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Total Medicines</Text>
              <Text style={styles.statusValue}>
                {formatNumber(state.syncStatus?.total_medicines || 0)}
              </Text>
            </View>
            
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Therapeutic Classes</Text>
              <Text style={styles.statusValue}>
                {formatNumber(state.syncStatus?.therapeutic_classes || 0)}
              </Text>
            </View>
            
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Manufacturers</Text>
              <Text style={styles.statusValue}>
                {formatNumber(state.syncStatus?.manufacturers || 0)}
              </Text>
            </View>
          </View>
          
          <View style={styles.lastUpdated}>
            <Text style={styles.lastUpdatedLabel}>Last Updated:</Text>
            <Text style={styles.lastUpdatedValue}>
              {formatDate(state.syncStatus?.last_updated || 'Never')}
            </Text>
          </View>
        </CardContent>
      </Card>

      {/* Master Database Stats */}
      <Card style={styles.statsCard}>
        <CardHeader>
          <View style={styles.cardHeaderWithIcon}>
            <Ionicons name="library" size={20} color={Theme.colors.primary} />
            <Text style={styles.cardTitle}>Master Database Statistics</Text>
          </View>
        </CardHeader>
        <CardContent>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{formatNumber(databaseStats.totalEntries)}</Text>
              <Text style={styles.statLabel}>Total Medicines</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{databaseStats.coverage.length}</Text>
              <Text style={styles.statLabel}>Categories</Text>
            </View>
          </View>
          
          <View style={styles.categoriesList}>
            <Text style={styles.categoriesTitle}>Therapeutic Coverage:</Text>
            {databaseStats.coverage.slice(0, 6).map((category, index) => (
              <View key={index} style={styles.categoryItem}>
                <Ionicons name="medical" size={14} color={Theme.colors.primary} />
                <Text style={styles.categoryText}>{category}</Text>
              </View>
            ))}
            {databaseStats.coverage.length > 6 && (
              <Text style={styles.moreCategories}>
                +{databaseStats.coverage.length - 6} more categories
              </Text>
            )}
          </View>
        </CardContent>
      </Card>

      {/* Schema Validation */}
      <Card style={styles.validationCard}>
        <CardHeader>
          <View style={styles.cardHeaderWithIcon}>
            <Ionicons 
              name={state.schemaValid ? "shield-checkmark" : "shield-outline"} 
              size={20} 
              color={state.schemaValid ? Theme.colors.success : Theme.colors.error} 
            />
            <Text style={styles.cardTitle}>Schema Validation</Text>
          </View>
        </CardHeader>
        <CardContent>
          <View style={styles.validationStatus}>
            <Text style={[
              styles.validationText,
              { color: state.schemaValid ? Theme.colors.success : Theme.colors.error }
            ]}>
              {state.schemaValid ? 'Schema is valid ✓' : 'Schema has issues ✗'}
            </Text>
            
            {state.schemaIssues && state.schemaIssues.length > 0 && (
              <View style={styles.issuesList}>
                {state.schemaIssues.map((issue, index) => (
                  <Text key={index} style={styles.issueText}>• {issue}</Text>
                ))}
              </View>
            )}
          </View>
          
          <Button
            title="Validate Schema"
            variant="outline"
            onPress={actions.validateSchema}
            disabled={state.isLoading}
            style={styles.validateButton}
          />
        </CardContent>
      </Card>
    </View>
  );

  const renderSyncTab = () => (
    <View>
      {/* Sync Progress */}
      {state.isSyncing && state.syncProgress && (
        <Card style={styles.progressCard}>
          <CardHeader>
            <Text style={styles.cardTitle}>Sync Progress</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.progressContainer}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressStatus}>{state.syncProgress.status}</Text>
                <Text style={styles.progressCounter}>
                  {formatNumber(state.syncProgress.current)} / {formatNumber(state.syncProgress.total)}
                </Text>
              </View>
              
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { width: `${state.syncProgress.percentage}%` }
                  ]} 
                />
              </View>
              
              <Text style={styles.progressPercentage}>
                {state.syncProgress.percentage}%
              </Text>
            </View>
          </CardContent>
        </Card>
      )}

      {/* Sync Results */}
      {state.lastSyncResult && (
        <Card style={styles.resultCard}>
          <CardHeader>
            <View style={styles.cardHeaderWithIcon}>
              <Ionicons 
                name={state.lastSyncResult.success ? "checkmark-circle" : "alert-circle"} 
                size={20} 
                color={state.lastSyncResult.success ? Theme.colors.success : Theme.colors.error} 
              />
              <Text style={styles.cardTitle}>Last Sync Result</Text>
            </View>
          </CardHeader>
          <CardContent>
            <View style={styles.resultGrid}>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Status</Text>
                <Text style={[
                  styles.resultValue,
                  { color: state.lastSyncResult.success ? Theme.colors.success : Theme.colors.error }
                ]}>
                  {state.lastSyncResult.success ? 'Success' : 'Failed'}
                </Text>
              </View>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Processed</Text>
                <Text style={styles.resultValue}>
                  {formatNumber(state.lastSyncResult.total_processed)}
                </Text>
              </View>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Inserted</Text>
                <Text style={[styles.resultValue, { color: Theme.colors.success }]}>
                  {formatNumber(state.lastSyncResult.inserted)}
                </Text>
              </View>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Updated</Text>
                <Text style={[styles.resultValue, { color: Theme.colors.info }]}>
                  {formatNumber(state.lastSyncResult.updated)}
                </Text>
              </View>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Errors</Text>
                <Text style={[styles.resultValue, { color: Theme.colors.error }]}>
                  {formatNumber(state.lastSyncResult.errors)}
                </Text>
              </View>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Duration</Text>
                <Text style={styles.resultValue}>
                  {formatDuration(state.lastSyncResult.duration_ms)}
                </Text>
              </View>
            </View>

            {state.lastSyncResult.error_details && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details:</Text>
                <ScrollView style={styles.errorScroll} nestedScrollEnabled>
                  {state.lastSyncResult.error_details.slice(0, 5).map((error, index) => (
                    <Text key={index} style={styles.errorText}>
                      • {error.error || error.context}
                    </Text>
                  ))}
                  {state.lastSyncResult.error_details.length > 5 && (
                    <Text style={styles.moreErrors}>
                      +{state.lastSyncResult.error_details.length - 5} more errors
                    </Text>
                  )}
                </ScrollView>
              </View>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sync Actions */}
      <Card style={styles.actionsCard}>
        <CardHeader>
          <Text style={styles.cardTitle}>Sync Actions</Text>
        </CardHeader>
        <CardContent>
          <Button
            title="Sync All Medicines"
            variant="primary"
            onPress={handleSyncConfirmation}
            disabled={state.isSyncing || state.isLoading}
            style={styles.actionButton}
            icon={state.isSyncing ? undefined : "sync"}
          />
          
          <Button
            title="Refresh Status"
            variant="outline"
            onPress={actions.refreshSyncStatus}
            disabled={state.isLoading}
            style={styles.actionButton}
            icon="refresh"
          />
        </CardContent>
      </Card>
    </View>
  );

  const renderMaintenanceTab = () => (
    <View>
      {/* Danger Zone */}
      <Card style={styles.dangerCard}>
        <CardHeader>
          <View style={styles.cardHeaderWithIcon}>
            <Ionicons name="warning" size={20} color={Theme.colors.error} />
            <Text style={[styles.cardTitle, { color: Theme.colors.error }]}>Danger Zone</Text>
          </View>
        </CardHeader>
        <CardContent>
          <Text style={styles.dangerWarning}>
            These actions are irreversible and should only be performed by system administrators.
          </Text>
          
          <Button
            title="Clear Knowledge Base"
            variant="outline"
            onPress={handleClearConfirmation}
            disabled={state.isLoading}
            style={[styles.actionButton, { borderColor: Theme.colors.error }]}
            icon="trash"
          />
        </CardContent>
      </Card>

      {/* System Information */}
      <Card style={styles.systemCard}>
        <CardHeader>
          <View style={styles.cardHeaderWithIcon}>
            <Ionicons name="information-circle" size={20} color={Theme.colors.info} />
            <Text style={styles.cardTitle}>System Information</Text>
          </View>
        </CardHeader>
        <CardContent>
          <View style={styles.systemInfo}>
            <Text style={styles.systemLabel}>Master Database Version:</Text>
            <Text style={styles.systemValue}>v2.0</Text>
          </View>
          
          <View style={styles.systemInfo}>
            <Text style={styles.systemLabel}>Total Categories:</Text>
            <Text style={styles.systemValue}>{Object.keys(databaseStats.categories).length}</Text>
          </View>
          
          <View style={styles.systemInfo}>
            <Text style={styles.systemLabel}>Last Master Update:</Text>
            <Text style={styles.systemValue}>{new Date().toLocaleDateString()}</Text>
          </View>
        </CardContent>
      </Card>
    </View>
  );

  const styles = createThemedStyles((theme) => ({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },

    headerTitle: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
    },

    closeButton: {
      padding: theme.spacing.xs,
    },

    tabContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      paddingHorizontal: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },

    tab: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      marginRight: theme.spacing.md,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },

    tabActive: {
      borderBottomColor: theme.colors.primary,
    },

    tabText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.weights.medium,
    },

    tabTextActive: {
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.semiBold,
    },

    content: {
      flex: 1,
      padding: theme.spacing.md,
    },

    statusCard: {
      marginBottom: theme.spacing.md,
    },

    cardHeaderWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },

    cardTitle: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
    },

    statusGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },

    statusItem: {
      flex: 1,
      minWidth: width / 2 - theme.spacing.xl,
      alignItems: 'center',
    },

    statusLabel: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },

    statusValue: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
    },

    statusBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.borderRadius.sm,
    },

    lastUpdated: {
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
      alignItems: 'center',
    },

    lastUpdatedLabel: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },

    lastUpdatedValue: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.medium,
    },

    statsCard: {
      marginBottom: theme.spacing.md,
    },

    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: theme.spacing.md,
    },

    statItem: {
      alignItems: 'center',
    },

    statNumber: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.primary,
    },

    statLabel: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },

    categoriesList: {
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
    },

    categoriesTitle: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },

    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },

    categoryText: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
    },

    moreCategories: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textTertiary,
      fontStyle: 'italic',
      marginTop: theme.spacing.xs,
    },

    validationCard: {
      marginBottom: theme.spacing.md,
    },

    validationStatus: {
      marginBottom: theme.spacing.md,
    },

    validationText: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      marginBottom: theme.spacing.sm,
    },

    issuesList: {
      backgroundColor: theme.colors.backgroundSecondary,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
    },

    issueText: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.error,
      marginBottom: theme.spacing.xs,
    },

    validateButton: {
      alignSelf: 'flex-start',
    },

    progressCard: {
      marginBottom: theme.spacing.md,
    },

    progressContainer: {
      gap: theme.spacing.sm,
    },

    progressInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    progressStatus: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
    },

    progressCounter: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.weights.medium,
    },

    progressBar: {
      height: 8,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.borderRadius.sm,
      overflow: 'hidden',
    },

    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
    },

    progressPercentage: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.semiBold,
      textAlign: 'center',
    },

    resultCard: {
      marginBottom: theme.spacing.md,
    },

    resultGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },

    resultItem: {
      flex: 1,
      minWidth: width / 3 - theme.spacing.lg,
      alignItems: 'center',
    },

    resultLabel: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },

    resultValue: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
    },

    errorDetails: {
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
    },

    errorTitle: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.error,
      marginBottom: theme.spacing.sm,
    },

    errorScroll: {
      maxHeight: 100,
      backgroundColor: theme.colors.backgroundSecondary,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
    },

    errorText: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.error,
      marginBottom: theme.spacing.xs,
    },

    moreErrors: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textTertiary,
      fontStyle: 'italic',
    },

    actionsCard: {
      marginBottom: theme.spacing.md,
    },

    actionButton: {
      marginBottom: theme.spacing.sm,
    },

    dangerCard: {
      marginBottom: theme.spacing.md,
      borderColor: theme.colors.error,
    },

    dangerWarning: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },

    systemCard: {
      marginBottom: theme.spacing.md,
    },

    systemInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },

    systemLabel: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
    },

    systemValue: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.medium,
    },

    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },

    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },

    errorText: {
      fontSize: theme.typography.sizes.md,
      color: theme.colors.error,
      textAlign: 'center',
      marginTop: theme.spacing.md,
    },
  }));

  if (state.isLoading && !state.syncStatus) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.errorText}>Loading medicine knowledge base status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Medicine Knowledge Base</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={Theme.colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Error Display */}
      {state.error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={Theme.colors.error} />
          <Text style={styles.errorText}>{state.error}</Text>
          <Button
            title="Retry"
            variant="outline"
            onPress={actions.clearError}
            style={{ marginTop: Theme.spacing.md }}
          />
        </View>
      )}

      {!state.error && (
        <>
          {/* Tabs */}
          <View style={styles.tabContainer}>
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'sync', label: 'Sync' },
              { key: 'maintenance', label: 'Maintenance' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key as any)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'sync' && renderSyncTab()}
            {activeTab === 'maintenance' && renderMaintenanceTab()}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
};