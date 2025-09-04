import { Ionicons } from '@expo/vector-icons';
import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    Vibration,
    View
} from 'react-native';
import { Theme, createThemedStyles } from '../../constants/Theme';
import { BarcodeLookupResult, barcodeService } from '../../lib/barcode-service';

interface BarcodeScannerProps {
  isVisible: boolean;
  onClose: () => void;
  onScanSuccess: (result: BarcodeLookupResult) => void;
  onScanError?: (error: string) => void;
  title?: string;
  pharmacyId?: string;
  allowManualEntry?: boolean;
  showTorch?: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  isVisible,
  onClose,
  onScanSuccess,
  onScanError,
  title = 'Scan Barcode',
  pharmacyId,
  allowManualEntry = true,
  showTorch = true,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [lastScanTime, setLastScanTime] = useState(0);
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    if (isVisible) {
      requestPermissions();
      setScanned(false);
      setTorchOn(false);
      setManualEntry(false);
      setManualBarcode('');
    }
  }, [isVisible]);

  const requestPermissions = async () => {
    const granted = await barcodeService.requestPermissions();
    setHasPermission(granted);
  };

  const handleBarCodeScanned = async ({ type, data }: BarCodeScannerResult) => {
    // Prevent rapid-fire scanning
    const now = Date.now();
    if (now - lastScanTime < 1500) {
      return;
    }
    setLastScanTime(now);

    if (scanned) return;
    
    setScanned(true);
    setScanning(true);

    // Provide enhanced haptic feedback
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Fallback to vibration
        Vibration.vibrate(100);
      }
    }

    console.log('📱 Barcode scanned:', type, data);

    try {
      const result = await barcodeService.processScanResult({ type, data }, pharmacyId);
      
      if (result.found && result.medicine) {
        // Success - medicine found
        if (Platform.OS !== 'web') {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error) {
            Vibration.vibrate([100, 50, 100]);
          }
        }
        
        onScanSuccess(result);
        onClose();
      } else if (result.suggestions && result.suggestions.length > 0) {
        // Show enhanced suggestions with medicine details
        const suggestionText = result.suggestions
          .slice(0, 3)
          .map(med => `${med.generic_name} (${med.brand_name || 'Generic'})`)
          .join('\n• ');
        
        Alert.alert(
          'Medicine Not Found',
          `No exact match for barcode ${data}.\n\nSimilar medicines found:\n• ${suggestionText}\n\nWould you like to see all suggestions?`,
          [
            {
              text: 'Show All Suggestions',
              onPress: () => {
                onScanSuccess(result);
                onClose();
              }
            },
            {
              text: 'Manual Entry',
              onPress: () => setManualEntry(true)
            },
            {
              text: 'Try Again',
              style: 'cancel',
              onPress: () => {
                setScanned(false);
                setScanning(false);
              }
            }
          ]
        );
      } else {
        // No results found
        Alert.alert(
          'Barcode Not Found',
          `No medicine found for barcode: ${data}${result.error ? `\n\nError: ${result.error}` : ''}`,
          [
            {
              text: 'Try Again',
              onPress: () => {
                setScanned(false);
                setScanning(false);
              }
            },
            {
              text: 'Manual Entry',
              onPress: () => setManualEntry(true),
              style: 'default'
            },
            {
              text: 'Cancel',
              onPress: onClose,
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error) {
      console.error('Barcode processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process barcode';
      
      if (onScanError) {
        onScanError(errorMessage);
      } else {
        Alert.alert('Scan Error', errorMessage);
      }
      
      setScanned(false);
      setScanning(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualBarcode.trim()) {
      Alert.alert('Invalid Input', 'Please enter a barcode');
      return;
    }

    setScanning(true);

    try {
      const result = await barcodeService.lookupMedicineByBarcode(manualBarcode.trim(), pharmacyId);
      onScanSuccess(result);
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to lookup barcode';
      if (onScanError) {
        onScanError(errorMessage);
      } else {
        Alert.alert('Lookup Error', errorMessage);
      }
    } finally {
      setScanning(false);
    }
  };

  const toggleTorch = () => {
    setTorchOn(!torchOn);
  };

  if (hasPermission === null) {
    return (
      <Modal visible={isVisible} transparent animationType="slide">
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal visible={isVisible} transparent animationType="slide">
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Camera permission is required to scan barcodes.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  if (manualEntry) {
    return (
      <Modal visible={isVisible} transparent animationType="slide">
        <View style={styles.manualContainer}>
          <View style={styles.manualContent}>
            <Text style={styles.manualTitle}>Enter Barcode Manually</Text>
            <TextInput
              style={styles.manualInput}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              placeholder="Enter barcode number"
              keyboardType="default"
              autoCapitalize="characters"
              autoFocus
            />
            <View style={styles.manualButtons}>
              <TouchableOpacity
                style={[styles.manualButton, styles.submitButton]}
                onPress={handleManualSubmit}
                disabled={scanning}
              >
                <Text style={styles.submitButtonText}>
                  {scanning ? 'Looking up...' : 'Submit'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.manualButton, styles.backButton]}
                onPress={() => setManualEntry(false)}
              >
                <Text style={styles.backButtonText}>Back to Scanner</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={isVisible} transparent={false} animationType="slide">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.headerActions}>
            {showTorch && Platform.OS !== 'web' && (
              <TouchableOpacity style={styles.torchButton} onPress={toggleTorch}>
                <Ionicons 
                  name={torchOn ? "flash" : "flash-off"} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Camera View */}
        <View style={styles.cameraContainer}>
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={styles.camera}
            barCodeTypes={barcodeService.getSupportedBarcodeTypes()}
          />
          
          {/* Scanning Overlay */}
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanInstruction}>
                {scanning ? 'Processing...' : 'Position barcode within the frame'}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer Actions */}
        <View style={styles.footer}>
          {allowManualEntry && (
            <TouchableOpacity 
              style={styles.manualEntryButton} 
              onPress={() => setManualEntry(true)}
            >
              <Ionicons name="create-outline" size={20} color={Theme.colors.primary} />
              <Text style={styles.manualEntryText}>Manual Entry</Text>
            </TouchableOpacity>
          )}
          
          {scanned && (
            <TouchableOpacity 
              style={styles.scanAgainButton} 
              onPress={() => setScanned(false)}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.scanAgainText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingTop: 50,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },

  closeButton: {
    padding: theme.spacing.sm,
  },

  title: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center' as const,
  },

  headerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },

  torchButton: {
    padding: theme.spacing.sm,
  },

  cameraContainer: {
    flex: 1,
    position: 'relative' as const,
  },

  camera: {
    flex: 1,
  },

  overlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  scanArea: {
    alignItems: 'center' as const,
  },

  scanFrame: {
    width: screenWidth * 0.7,
    height: screenWidth * 0.5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'transparent',
  },

  scanInstruction: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.md,
    textAlign: 'center' as const,
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },

  footer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    alignItems: 'center' as const,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },

  manualEntryButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },

  manualEntryText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
  },

  scanAgainButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },

  scanAgainText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
  },

  // Permission screen styles
  permissionContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: theme.spacing.xl,
  },

  permissionText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.lg,
    textAlign: 'center' as const,
    marginBottom: theme.spacing.xl,
  },

  permissionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },

  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
  },

  cancelButton: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },

  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.md,
  },

  // Manual entry styles
  manualContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: theme.spacing.lg,
  },

  manualContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
  },

  manualTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center' as const,
    marginBottom: theme.spacing.lg,
  },

  manualInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    marginBottom: theme.spacing.lg,
  },

  manualButtons: {
    gap: theme.spacing.md,
  },

  manualButton: {
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center' as const,
  },

  submitButton: {
    backgroundColor: theme.colors.primary,
  },

  submitButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
  },

  backButton: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  backButtonText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
  },
}));