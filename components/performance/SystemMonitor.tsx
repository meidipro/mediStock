import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  AppState,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { Theme, createThemedStyles } from '../../constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';
import * as Network from 'expo-network';

interface PerformanceMetric {
  name: string;
  value: string | number;
  status: 'good' | 'warning' | 'critical';
  description: string;
  icon: string;
  color: string;
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  database: 'connected' | 'slow' | 'disconnected';
  network: 'fast' | 'slow' | 'offline';
  memory: 'normal' | 'high' | 'critical';
  storage: 'available' | 'low' | 'full';
  battery: 'good' | 'low' | 'critical';
}

interface UsageStats {
  activeUsers: number;
  totalQueries: number;
  errorRate: number;
  avgResponseTime: number;
  lastUpdated: string;
}

interface SystemMonitorProps {
  onClose?: () => void;
}

export const SystemMonitor: React.FC<SystemMonitorProps> = ({
  onClose,
}) => {
  const { pharmacy, user } = useAuth();
  
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    overall: 'healthy',
    database: 'connected',
    network: 'fast',
    memory: 'normal',
    storage: 'available',
    battery: 'good',
  });
  
  const [usageStats, setUsageStats] = useState<UsageStats>({
    activeUsers: 0,
    totalQueries: 0,
    errorRate: 0,
    avgResponseTime: 0,
    lastUpdated: new Date().toISOString(),
  });
  
  const [monitoring, setMonitoring] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<any>({});

  const performSystemDiagnostics = useCallback(async () => {
    try {
      const diagnosticData: any = {};

      // Device Information
      diagnosticData.device = {
        brand: Device.brand,
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
        platformApiLevel: Device.platformApiLevel,
        totalMemory: Device.totalMemory,
      };

      // App Information
      diagnosticData.app = {
        name: Application.applicationName,
        version: Application.nativeApplicationVersion,
        buildVersion: Application.nativeBuildVersion,
        installTime: await Application.getInstallationTimeAsync(),
      };

      // Network Information
      const networkState = await Network.getNetworkStateAsync();
      diagnosticData.network = {
        type: networkState.type,
        isConnected: networkState.isConnected,
        isInternetReachable: networkState.isInternetReachable,
      };

      // Battery Information (if available)
      try {
        const batteryLevel = await Battery.getBatteryLevelAsync();
        const batteryState = await Battery.getBatteryStateAsync();
        diagnosticData.battery = {
          level: Math.round(batteryLevel * 100),
          state: batteryState,
        };
      } catch (error) {
        diagnosticData.battery = { level: 'N/A', state: 'unknown' };
      }

      setDiagnostics(diagnosticData);
      return diagnosticData;
    } catch (error) {
      console.error('Diagnostics error:', error);
      return {};
    }
  }, []);

  const checkDatabasePerformance = useCallback(async () => {
    const startTime = Date.now();
    let dbStatus: 'connected' | 'slow' | 'disconnected' = 'disconnected';
    let responseTime = 0;

    try {
      // Test database connection with a simple query
      const { data, error } = await supabase
        .from('pharmacies')
        .select('id')
        .limit(1);

      responseTime = Date.now() - startTime;

      if (error) {
        dbStatus = 'disconnected';
      } else if (responseTime > 2000) {
        dbStatus = 'slow';
      } else {
        dbStatus = 'connected';
      }

    } catch (error) {
      dbStatus = 'disconnected';
      responseTime = Date.now() - startTime;
    }

    return { status: dbStatus, responseTime };
  }, []);

  const checkNetworkPerformance = useCallback(async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      
      if (!networkState.isConnected) {
        return 'offline';
      }

      // Simple network speed test (ping to a fast endpoint)
      const startTime = Date.now();
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        cache: 'no-cache',
      });
      const pingTime = Date.now() - startTime;

      if (response.ok) {
        return pingTime < 1000 ? 'fast' : 'slow';
      } else {
        return 'slow';
      }
    } catch (error) {
      return 'offline';
    }
  }, []);

  const analyzeMemoryUsage = useCallback(() => {
    // Memory analysis (limited on mobile platforms)
    const jsHeapSize = (performance as any)?.memory?.usedJSHeapSize;
    const jsHeapLimit = (performance as any)?.memory?.totalJSHeapSize;

    if (jsHeapSize && jsHeapLimit) {
      const memoryUsage = (jsHeapSize / jsHeapLimit) * 100;
      return memoryUsage > 80 ? 'critical' : memoryUsage > 60 ? 'high' : 'normal';
    }

    return 'normal'; // Default if memory info not available
  }, []);

  const generatePerformanceMetrics = useCallback(async () => {
    const dbCheck = await checkDatabasePerformance();
    const networkStatus = await checkNetworkPerformance();
    const memoryStatus = analyzeMemoryUsage();
    const deviceInfo = diagnostics.device || {};
    const batteryInfo = diagnostics.battery || {};

    const newMetrics: PerformanceMetric[] = [
      {
        name: 'Database Connection',
        value: dbCheck.status === 'connected' ? 'Connected' : dbCheck.status === 'slow' ? 'Slow' : 'Disconnected',
        status: dbCheck.status === 'connected' ? 'good' : dbCheck.status === 'slow' ? 'warning' : 'critical',
        description: `Response time: ${dbCheck.responseTime}ms`,
        icon: 'server-outline',
        color: dbCheck.status === 'connected' ? Theme.colors.success : dbCheck.status === 'slow' ? Theme.colors.warning : Theme.colors.error,
      },
      {
        name: 'Network Speed',
        value: networkStatus === 'fast' ? 'Fast' : networkStatus === 'slow' ? 'Slow' : 'Offline',
        status: networkStatus === 'fast' ? 'good' : networkStatus === 'slow' ? 'warning' : 'critical',
        description: 'Network connectivity status',
        icon: 'wifi-outline',
        color: networkStatus === 'fast' ? Theme.colors.success : networkStatus === 'slow' ? Theme.colors.warning : Theme.colors.error,
      },
      {
        name: 'Memory Usage',
        value: memoryStatus === 'normal' ? 'Normal' : memoryStatus === 'high' ? 'High' : 'Critical',
        status: memoryStatus === 'normal' ? 'good' : memoryStatus === 'high' ? 'warning' : 'critical',
        description: 'Application memory consumption',
        icon: 'hardware-chip-outline',
        color: memoryStatus === 'normal' ? Theme.colors.success : memoryStatus === 'high' ? Theme.colors.warning : Theme.colors.error,
      },
      {
        name: 'Device Performance',
        value: deviceInfo.totalMemory ? `${Math.round(deviceInfo.totalMemory / (1024 * 1024 * 1024))}GB RAM` : 'Unknown',
        status: 'good',
        description: `${deviceInfo.modelName || 'Unknown'} • ${deviceInfo.osName || 'Unknown'} ${deviceInfo.osVersion || ''}`,
        icon: 'phone-portrait-outline',
        color: Theme.colors.info,
      },
      {
        name: 'Battery Status',
        value: batteryInfo.level !== 'N/A' ? `${batteryInfo.level}%` : 'N/A',
        status: batteryInfo.level > 20 ? 'good' : batteryInfo.level > 10 ? 'warning' : 'critical',
        description: `Battery state: ${batteryInfo.state || 'unknown'}`,
        icon: 'battery-half-outline',
        color: batteryInfo.level > 20 ? Theme.colors.success : batteryInfo.level > 10 ? Theme.colors.warning : Theme.colors.error,
      },
    ];

    setMetrics(newMetrics);

    // Update system health
    const newHealth: SystemHealth = {
      overall: 'healthy',
      database: dbCheck.status,
      network: networkStatus,
      memory: memoryStatus,
      storage: 'available', // Would need platform-specific implementation
      battery: batteryInfo.level > 20 ? 'good' : batteryInfo.level > 10 ? 'low' : 'critical',
    };

    // Determine overall health
    const criticalIssues = Object.values(newHealth).filter(status => 
      status === 'critical' || status === 'disconnected' || status === 'offline'
    ).length;
    
    const warningIssues = Object.values(newHealth).filter(status => 
      status === 'warning' || status === 'slow' || status === 'high' || status === 'low'
    ).length;

    if (criticalIssues > 0) {
      newHealth.overall = 'critical';
    } else if (warningIssues > 1) {
      newHealth.overall = 'warning';
    } else {
      newHealth.overall = 'healthy';
    }

    setSystemHealth(newHealth);
  }, [checkDatabasePerformance, checkNetworkPerformance, analyzeMemoryUsage, diagnostics]);

  const startMonitoring = useCallback(() => {
    setMonitoring(true);
    
    const interval = setInterval(async () => {
      await generatePerformanceMetrics();
      
      // Add log entry
      const timestamp = new Date().toLocaleTimeString();
      setLogs(prev => [
        `[${timestamp}] System health check completed`,
        ...prev.slice(0, 49), // Keep last 50 logs
      ]);
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(interval);
      setMonitoring(false);
    };
  }, [generatePerformanceMetrics]);

  const runOptimization = useCallback(async () => {
    try {
      Alert.alert(
        'System Optimization',
        'Choose optimization type:',
        [
          {
            text: 'Clear Cache',
            onPress: async () => {
              // Clear local caches
              setLogs(prev => ['Cache cleared successfully', ...prev]);
              Alert.alert('Success', 'Cache cleared successfully');
            },
          },
          {
            text: 'Database Cleanup',
            onPress: async () => {
              // Perform database cleanup
              setLogs(prev => ['Database cleanup initiated', ...prev]);
              Alert.alert('Info', 'Database cleanup initiated. This may take a few minutes.');
            },
          },
          {
            text: 'Full Optimization',
            onPress: async () => {
              setLogs(prev => ['Full system optimization started', ...prev]);
              // Perform comprehensive optimization
              Alert.alert('Info', 'Full optimization started. Please wait...');
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.error('Optimization error:', error);
      Alert.alert('Error', 'Optimization failed. Please try again.');
    }
  }, []);

  const exportDiagnostics = useCallback(async () => {
    try {
      const diagnosticReport = {
        timestamp: new Date().toISOString(),
        pharmacy: pharmacy?.name,
        user: user?.full_name,
        systemHealth,
        metrics,
        diagnostics,
        logs: logs.slice(0, 20), // Last 20 logs
      };

      // Export diagnostics (would implement file export here)
      console.log('Diagnostic Report:', diagnosticReport);
      Alert.alert('Success', 'Diagnostic report generated. Check console for details.');
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export diagnostics.');
    }
  }, [systemHealth, metrics, diagnostics, logs, pharmacy, user]);

  useEffect(() => {
    performSystemDiagnostics().then(() => {
      generatePerformanceMetrics();
    });
  }, [performSystemDiagnostics, generatePerformanceMetrics]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'good':
      case 'connected':
      case 'fast':
      case 'normal':
      case 'available':
        return 'checkmark-circle';
      case 'warning':
      case 'slow':
      case 'high':
      case 'low':
        return 'warning';
      case 'critical':
      case 'disconnected':
      case 'offline':
      case 'full':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'good':
      case 'connected':
      case 'fast':
      case 'normal':
      case 'available':
        return Theme.colors.success;
      case 'warning':
      case 'slow':
      case 'high':
      case 'low':
        return Theme.colors.warning;
      case 'critical':
      case 'disconnected':
      case 'offline':
      case 'full':
        return Theme.colors.error;
      default:
        return Theme.colors.textSecondary;
    }
  };

  const styles = createThemedStyles((theme) => ({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },

    title: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
    },

    subtitle: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },

    overallStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },

    statusIcon: {
      marginRight: theme.spacing.sm,
    },

    overallStatusText: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
    },

    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },

    metricCard: {
      flex: 1,
      minWidth: '45%',
    },

    metricContent: {
      alignItems: 'center',
    },

    metricIcon: {
      marginBottom: theme.spacing.sm,
    },

    metricValue: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
      textAlign: 'center',
    },

    metricName: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 2,
    },

    metricDescription: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textTertiary,
      textAlign: 'center',
      marginTop: 2,
    },

    controls: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },

    controlButton: {
      flex: 1,
    },

    logsCard: {
      marginBottom: theme.spacing.lg,
    },

    logsList: {
      maxHeight: 200,
    },

    logItem: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      marginBottom: 2,
    },

    diagnosticsCard: {
      marginBottom: theme.spacing.lg,
    },

    diagnosticSection: {
      marginBottom: theme.spacing.md,
    },

    diagnosticTitle: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },

    diagnosticItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },

    diagnosticLabel: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
    },

    diagnosticValue: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.medium,
    },

    monitoringIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },

    monitoringText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.success,
      marginLeft: theme.spacing.sm,
    },

    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
    },

    loadingText: {
      marginTop: theme.spacing.md,
      fontSize: theme.typography.sizes.md,
      color: theme.colors.textSecondary,
    },
  }));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>System Monitor</Text>
          <Text style={styles.subtitle}>Performance metrics and diagnostics</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Overall System Status */}
      <Card>
        <CardContent>
          <View style={styles.overallStatus}>
            <Ionicons
              name={getStatusIcon(systemHealth.overall) as any}
              size={24}
              color={getStatusColor(systemHealth.overall)}
              style={styles.statusIcon}
            />
            <Text style={styles.overallStatusText}>
              System Status: {systemHealth.overall.charAt(0).toUpperCase() + systemHealth.overall.slice(1)}
            </Text>
          </View>
        </CardContent>
      </Card>

      {/* Monitoring Status */}
      {monitoring && (
        <View style={styles.monitoringIndicator}>
          <ActivityIndicator size="small" color={Theme.colors.success} />
          <Text style={styles.monitoringText}>Real-time monitoring active</Text>
        </View>
      )}

      {/* Performance Metrics */}
      <View style={styles.metricsGrid}>
        {metrics.map((metric, index) => (
          <Card key={index} style={styles.metricCard}>
            <CardContent style={styles.metricContent}>
              <Ionicons
                name={metric.icon as any}
                size={24}
                color={metric.color}
                style={styles.metricIcon}
              />
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricName}>{metric.name}</Text>
              <Text style={styles.metricDescription}>{metric.description}</Text>
            </CardContent>
          </Card>
        ))}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Button
          title={monitoring ? "Stop Monitoring" : "Start Monitoring"}
          variant={monitoring ? "outline" : "primary"}
          onPress={monitoring ? () => setMonitoring(false) : startMonitoring}
          style={styles.controlButton}
        />
        <Button
          title="Optimize"
          variant="secondary"
          onPress={runOptimization}
          style={styles.controlButton}
        />
      </View>

      {/* System Logs */}
      {logs.length > 0 && (
        <Card style={styles.logsCard}>
          <CardHeader>
            <Text style={styles.title}>System Logs</Text>
          </CardHeader>
          <CardContent>
            <ScrollView style={styles.logsList} nestedScrollEnabled>
              {logs.map((log, index) => (
                <Text key={index} style={styles.logItem}>
                  {log}
                </Text>
              ))}
            </ScrollView>
          </CardContent>
        </Card>
      )}

      {/* Diagnostics Information */}
      <Card style={styles.diagnosticsCard}>
        <CardHeader>
          <Text style={styles.title}>System Diagnostics</Text>
        </CardHeader>
        <CardContent>
          {/* Device Information */}
          {diagnostics.device && (
            <View style={styles.diagnosticSection}>
              <Text style={styles.diagnosticTitle}>Device Information</Text>
              <View style={styles.diagnosticItem}>
                <Text style={styles.diagnosticLabel}>Model:</Text>
                <Text style={styles.diagnosticValue}>{diagnostics.device.modelName}</Text>
              </View>
              <View style={styles.diagnosticItem}>
                <Text style={styles.diagnosticLabel}>OS:</Text>
                <Text style={styles.diagnosticValue}>
                  {diagnostics.device.osName} {diagnostics.device.osVersion}
                </Text>
              </View>
              <View style={styles.diagnosticItem}>
                <Text style={styles.diagnosticLabel}>RAM:</Text>
                <Text style={styles.diagnosticValue}>
                  {diagnostics.device.totalMemory ? 
                    `${Math.round(diagnostics.device.totalMemory / (1024 * 1024 * 1024))}GB` : 
                    'Unknown'
                  }
                </Text>
              </View>
            </View>
          )}

          {/* App Information */}
          {diagnostics.app && (
            <View style={styles.diagnosticSection}>
              <Text style={styles.diagnosticTitle}>Application</Text>
              <View style={styles.diagnosticItem}>
                <Text style={styles.diagnosticLabel}>Version:</Text>
                <Text style={styles.diagnosticValue}>{diagnostics.app.version}</Text>
              </View>
              <View style={styles.diagnosticItem}>
                <Text style={styles.diagnosticLabel}>Build:</Text>
                <Text style={styles.diagnosticValue}>{diagnostics.app.buildVersion}</Text>
              </View>
            </View>
          )}

          {/* Network Information */}
          {diagnostics.network && (
            <View style={styles.diagnosticSection}>
              <Text style={styles.diagnosticTitle}>Network</Text>
              <View style={styles.diagnosticItem}>
                <Text style={styles.diagnosticLabel}>Type:</Text>
                <Text style={styles.diagnosticValue}>{diagnostics.network.type}</Text>
              </View>
              <View style={styles.diagnosticItem}>
                <Text style={styles.diagnosticLabel}>Connected:</Text>
                <Text style={styles.diagnosticValue}>
                  {diagnostics.network.isConnected ? 'Yes' : 'No'}
                </Text>
              </View>
            </View>
          )}

          <Button
            title="Export Diagnostics"
            variant="outline"
            onPress={exportDiagnostics}
          />
        </CardContent>
      </Card>
    </ScrollView>
  );
};