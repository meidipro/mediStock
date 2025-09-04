import { Camera, CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { createThemedStyles } from '../../constants/Theme';
import { prescriptionAnalysisService } from '../../lib/prescription-analysis-service';
import { prescriptionOCRService } from '../../lib/prescription-ocr-service';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { IconSymbol } from '../ui/IconSymbol';

const { width: screenWidth } = Dimensions.get('window');

interface PrescriptionScannerProps {
  onPrescriptionAnalyzed: (prescription: AnalyzedPrescription) => void;
  onClose: () => void;
}

export interface AnalyzedPrescription {
  id: string;
  patientInfo: {
    name?: string;
    age?: number;
    gender?: string;
    weight?: number;
  };
  doctorInfo: {
    name?: string;
    license?: string;
    clinic?: string;
  };
  medications: PrescribedMedication[];
  instructions: string[];
  date: string;
  confidence: number;
  warnings: PrescriptionWarning[];
  rawText: string;
  imageUri: string;
}

export interface PrescribedMedication {
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  confidence: number;
  found_in_stock: boolean;
  stock_quantity?: number;
  alternative_medicines?: string[];
}

export interface PrescriptionWarning {
  type: 'interaction' | 'dosage' | 'allergy' | 'age_restriction' | 'pregnancy';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  medications: string[];
}

export default function PrescriptionScanner({ onPrescriptionAnalyzed, onClose }: PrescriptionScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(true);
  const [processingStep, setProcessingStep] = useState<string>('');

  const cameraRef = useRef<CameraView>(null);

  // Request camera permissions
  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = useCallback(async () => {
    if (cameraRef.current) {
      try {
        setIsProcessing(true);
        setProcessingStep('📸 Capturing prescription...');

        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });

        setCapturedImage(photo.uri);
        setShowCamera(false);
        
        // Process the prescription
        await processPrescriptionImage(photo.uri);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to capture prescription image');
        setIsProcessing(false);
      }
    }
  }, []);

  const pickImageFromGallery = useCallback(async () => {
    try {
      setIsProcessing(true);
      setProcessingStep('📱 Loading image...');

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
        setShowCamera(false);
        await processPrescriptionImage(result.assets[0].uri);
      } else {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to load image from gallery');
      setIsProcessing(false);
    }
  }, []);

  const processPrescriptionImage = async (imageUri: string) => {
    try {
      // Step 1: OCR Text Extraction
      setProcessingStep('🔍 Extracting text from prescription...');
      const ocrResult = await prescriptionOCRService.extractText(imageUri);
      
      if (!ocrResult.success) {
        throw new Error(ocrResult.error || 'Failed to extract text');
      }

      // Step 2: AI Analysis
      setProcessingStep('🧠 Analyzing prescription with AI...');
      const analysisResult = await prescriptionAnalysisService.analyzePrescription(
        ocrResult.extractedText!,
        imageUri
      );

      if (!analysisResult.success) {
        throw new Error(analysisResult.error || 'Failed to analyze prescription');
      }

      // Step 3: Drug Interaction Check
      setProcessingStep('⚠️ Checking drug interactions...');
      const medicationNames = analysisResult.prescription!.medications.map(med => med.name);
      const interactionCheck = await prescriptionAnalysisService.checkDrugInteractions(medicationNames);

      // Step 4: Dosage Verification
      setProcessingStep('📊 Verifying dosages...');
      const dosageWarnings = await prescriptionAnalysisService.verifyDosages(
        analysisResult.prescription!.medications,
        analysisResult.prescription!.patientInfo
      );

      // Combine all warnings
      const allWarnings = [
        ...analysisResult.prescription!.warnings,
        ...interactionCheck.warnings,
        ...dosageWarnings
      ];

      const finalPrescription: AnalyzedPrescription = {
        ...analysisResult.prescription!,
        warnings: allWarnings,
        rawText: ocrResult.extractedText!,
        imageUri,
      };

      setProcessingStep('✅ Analysis complete!');
      
      // Show success message with prescription summary
      const medicationCount = finalPrescription.medications.length;
      const warningCount = finalPrescription.warnings.length;
      
      console.log('📋 Prescription processed successfully:', {
        medications: medicationCount,
        warnings: warningCount,
        confidence: finalPrescription.confidence
      });
      
      // Small delay to show completion message
      setTimeout(() => {
        setIsProcessing(false);
        onPrescriptionAnalyzed(finalPrescription);
      }, 1000);

    } catch (error) {
      console.error('Error processing prescription:', error);
      setIsProcessing(false);
      
      Alert.alert(
        'Processing Error',
        `Failed to process prescription: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [
          { text: 'Retry', onPress: () => retakePicture() },
          { text: 'Cancel', onPress: onClose }
        ]
      );
    }
  };

  const retakePicture = () => {
    setCapturedImage(null);
    setShowCamera(true);
    setIsProcessing(false);
    setProcessingStep('');
  };

  const toggleFlash = () => {
    setFlashMode(flashMode === 'off' ? 'on' : 'off');
  };

  const toggleCameraType = () => {
    setCameraFacing(cameraFacing === 'back' ? 'front' : 'back');
  };

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <IconSymbol name="camera.fill" size={64} color="#ccc" />
        <Text style={styles.permissionText}>Camera permission is required</Text>
        <Button title="Grant Permission" onPress={Camera.requestCameraPermissionsAsync} />
      </View>
    );
  }

  if (isProcessing) {
    return (
      <View style={styles.processingContainer}>
        <Card style={styles.processingCard}>
          <CardContent>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.processingTitle}>Processing Prescription</Text>
            <Text style={styles.processingStep}>{processingStep}</Text>
            
            {capturedImage && (
              <Image source={{ uri: capturedImage }} style={styles.processingImage} />
            )}
            
            <Text style={styles.processingNote}>
              Our AI is analyzing the prescription for medicines, dosages, and potential interactions.
              This may take a few moments...
            </Text>
          </CardContent>
        </Card>
      </View>
    );
  }

  if (showCamera) {
    return (
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={cameraFacing}
          flash={flashMode}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={onClose}>
              <IconSymbol name="xmark.circle.fill" size={32} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan Prescription</Text>
            <TouchableOpacity style={styles.headerButton} onPress={toggleFlash}>
              <IconSymbol 
                name={flashMode === 'on' ? "bolt.fill" : "bolt.slash.fill"} 
                size={28} 
                color="white" 
              />
            </TouchableOpacity>
          </View>

          {/* Overlay with scanning frame */}
          <View style={styles.overlay}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            
            <Text style={styles.instructionText}>
              Position the prescription within the frame
            </Text>
          </View>

          {/* Bottom controls */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={pickImageFromGallery}>
              <IconSymbol name="photo.fill" size={32} color="white" />
              <Text style={styles.controlText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={toggleCameraType}>
              <IconSymbol name="arrow.triangle.2.circlepath.camera" size={32} color="white" />
              <Text style={styles.controlText}>Flip</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  return null;
}

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  
  camera: {
    flex: 1,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  
  headerButton: {
    padding: 8,
  },
  
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  scanFrame: {
    width: screenWidth * 0.8,
    height: screenWidth * 0.6,
    position: 'relative',
  },
  
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  
  instructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 50,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  
  controlButton: {
    alignItems: 'center',
  },
  
  controlText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
    color: theme.colors.text,
  },
  
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
  },
  
  processingCard: {
    width: '100%',
    maxWidth: 400,
  },
  
  processingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
    color: theme.colors.text,
  },
  
  processingStep: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: theme.colors.primary,
  },
  
  processingImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginVertical: 16,
  },
  
  processingNote: {
    fontSize: 14,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
}));