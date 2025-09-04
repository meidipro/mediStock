import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Share,
} from 'react-native';
import { IconSymbol } from '../ui/IconSymbol';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { createThemedStyles } from '../../constants/Theme';
import { AnalyzedPrescription, PrescribedMedication, PrescriptionWarning } from './PrescriptionScanner';
import { useLanguage } from '../../contexts/LanguageContext';

interface PrescriptionAnalysisViewProps {
  prescription: AnalyzedPrescription;
  onAddToCart: (medications: PrescribedMedication[]) => void;
  onClose: () => void;
  onRetake: () => void;
}

export default function PrescriptionAnalysisView({
  prescription,
  onAddToCart,
  onClose,
  onRetake,
}: PrescriptionAnalysisViewProps) {
  const { t } = useLanguage();
  const [selectedMedications, setSelectedMedications] = useState<string[]>(
    prescription.medications.map(med => med.name)
  );
  const [showRawText, setShowRawText] = useState(false);

  const toggleMedicationSelection = (medicationName: string) => {
    setSelectedMedications(prev =>
      prev.includes(medicationName)
        ? prev.filter(name => name !== medicationName)
        : [...prev, medicationName]
    );
  };

  const handleAddToCart = () => {
    const selectedMeds = prescription.medications.filter(med =>
      selectedMedications.includes(med.name)
    );
    
    if (selectedMeds.length === 0) {
      Alert.alert('No Selection', 'Please select at least one medication to add to cart.');
      return;
    }

    onAddToCart(selectedMeds);
  };

  const handleShare = async () => {
    try {
      const shareContent = `
Prescription Analysis - MediStock BD

Patient: ${prescription.patientInfo.name || 'Not specified'}
Doctor: ${prescription.doctorInfo.name || 'Not specified'}
Date: ${prescription.date}

Medications:
${prescription.medications.map(med => 
  `• ${med.name} ${med.dosage}\n  ${med.frequency} - ${med.duration}\n  ${med.instructions}`
).join('\n\n')}

${prescription.warnings.length > 0 ? 
  `\nWarnings:\n${prescription.warnings.map(w => `• ${w.message}`).join('\n')}` : 
  ''
}

Analyzed by MediStock BD AI
      `;

      await Share.share({
        message: shareContent,
        title: 'Prescription Analysis',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#FF3B30';
      case 'high': return '#FF9500';
      case 'medium': return '#FFCC00';
      case 'low': return '#34C759';
      default: return '#007AFF';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return 'exclamationmark.triangle.fill';
      case 'high': return 'exclamationmark.circle.fill';
      case 'medium': return 'info.circle.fill';
      case 'low': return 'checkmark.circle.fill';
      default: return 'info.circle.fill';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
          <IconSymbol name="chevron.left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prescription Analysis</Text>
        <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
          <IconSymbol name="square.and.arrow.up.fill" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Confidence Score */}
        <Card style={styles.confidenceCard}>
          <CardContent>
            <View style={styles.confidenceHeader}>
              <IconSymbol name="checkmark.circle.fill" size={24} color="#34C759" />
              <Text style={styles.confidenceTitle}>Analysis Complete</Text>
              <Text style={styles.confidenceScore}>
                {Math.round(prescription.confidence * 100)}% confidence
              </Text>
            </View>
            <Text style={styles.confidenceText}>
              AI successfully analyzed the prescription with high accuracy
            </Text>
          </CardContent>
        </Card>

        {/* Prescription Image */}
        <Card style={styles.imageCard}>
          <CardContent>
            <View style={styles.imageHeader}>
              <Text style={styles.sectionTitle}>Original Prescription</Text>
              <TouchableOpacity onPress={onRetake} style={styles.retakeButton}>
                <IconSymbol name="camera.fill" size={16} color="#007AFF" />
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
            </View>
            <Image source={{ uri: prescription.imageUri }} style={styles.prescriptionImage} />
          </CardContent>
        </Card>

        {/* Patient & Doctor Info */}
        <Card style={styles.infoCard}>
          <CardContent>
            <Text style={styles.sectionTitle}>Prescription Details</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Patient</Text>
                <Text style={styles.infoValue}>
                  {prescription.patientInfo.name || 'Not specified'}
                </Text>
                {prescription.patientInfo.age && (
                  <Text style={styles.infoDetail}>Age: {prescription.patientInfo.age} years</Text>
                )}
              </View>
              
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Doctor</Text>
                <Text style={styles.infoValue}>
                  {prescription.doctorInfo.name || 'Not specified'}
                </Text>
                {prescription.doctorInfo.clinic && (
                  <Text style={styles.infoDetail}>{prescription.doctorInfo.clinic}</Text>
                )}
              </View>
            </View>
            
            <Text style={styles.dateText}>Date: {prescription.date}</Text>
          </CardContent>
        </Card>

        {/* Warnings */}
        {prescription.warnings.length > 0 && (
          <Card style={styles.warningsCard}>
            <CardContent>
              <View style={styles.warningsHeader}>
                <IconSymbol name="exclamationmark.triangle.fill" size={24} color="#FF9500" />
                <Text style={styles.sectionTitle}>Safety Alerts</Text>
              </View>
              
              {prescription.warnings.map((warning, index) => (
                <View key={index} style={[styles.warningItem, { borderLeftColor: getSeverityColor(warning.severity) }]}>
                  <View style={styles.warningHeader}>
                    <IconSymbol 
                      name={getSeverityIcon(warning.severity)} 
                      size={20} 
                      color={getSeverityColor(warning.severity)} 
                    />
                    <Text style={[styles.warningType, { color: getSeverityColor(warning.severity) }]}>
                      {warning.type.toUpperCase()} - {warning.severity.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.warningMessage}>{warning.message}</Text>
                  {warning.medications.length > 0 && (
                    <Text style={styles.warningMeds}>
                      Affects: {warning.medications.join(', ')}
                    </Text>
                  )}
                </View>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Medications */}
        <Card style={styles.medicationsCard}>
          <CardContent>
            <View style={styles.medicationsHeader}>
              <Text style={styles.sectionTitle}>Prescribed Medications</Text>
              <Text style={styles.medicationsCount}>
                {selectedMedications.length} of {prescription.medications.length} selected
              </Text>
            </View>

            {prescription.medications.map((medication, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.medicationItem,
                  selectedMedications.includes(medication.name) && styles.medicationSelected
                ]}
                onPress={() => toggleMedicationSelection(medication.name)}
              >
                <View style={styles.medicationHeader}>
                  <View style={styles.medicationInfo}>
                    <Text style={styles.medicationName}>{medication.name}</Text>
                    {medication.genericName && medication.genericName !== medication.name && (
                      <Text style={styles.medicationGeneric}>({medication.genericName})</Text>
                    )}
                  </View>
                  
                  <View style={styles.medicationStatus}>
                    {medication.found_in_stock ? (
                      <View style={styles.stockBadge}>
                        <IconSymbol name="checkmark.circle.fill" size={16} color="#34C759" />
                        <Text style={styles.stockText}>In Stock ({medication.stock_quantity})</Text>
                      </View>
                    ) : (
                      <View style={[styles.stockBadge, styles.outOfStockBadge]}>
                        <IconSymbol name="xmark.circle.fill" size={16} color="#FF3B30" />
                        <Text style={[styles.stockText, styles.outOfStockText]}>Out of Stock</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.medicationDetails}>
                  <Text style={styles.medicationDosage}>{medication.dosage}</Text>
                  <Text style={styles.medicationFrequency}>{medication.frequency}</Text>
                  <Text style={styles.medicationDuration}>{medication.duration}</Text>
                </View>

                {medication.instructions && (
                  <Text style={styles.medicationInstructions}>{medication.instructions}</Text>
                )}

                {!medication.found_in_stock && medication.alternative_medicines && 
                 medication.alternative_medicines.length > 0 && (
                  <View style={styles.alternativesSection}>
                    <Text style={styles.alternativesLabel}>Alternatives available:</Text>
                    <Text style={styles.alternativesText}>
                      {medication.alternative_medicines.join(', ')}
                    </Text>
                  </View>
                )}

                <View style={styles.selectionIndicator}>
                  {selectedMedications.includes(medication.name) ? (
                    <IconSymbol name="checkmark.circle.fill" size={24} color="#007AFF" />
                  ) : (
                    <IconSymbol name="circle" size={24} color="#C7C7CC" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </CardContent>
        </Card>

        {/* Instructions */}
        {prescription.instructions.length > 0 && (
          <Card style={styles.instructionsCard}>
            <CardContent>
              <Text style={styles.sectionTitle}>General Instructions</Text>
              {prescription.instructions.map((instruction, index) => (
                <Text key={index} style={styles.instructionText}>
                  • {instruction}
                </Text>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Raw Text Toggle */}
        <Card style={styles.rawTextCard}>
          <CardContent>
            <TouchableOpacity 
              style={styles.rawTextToggle}
              onPress={() => setShowRawText(!showRawText)}
            >
              <Text style={styles.rawTextTitle}>Extracted Text</Text>
              <IconSymbol 
                name={showRawText ? "chevron.up" : "chevron.down"} 
                size={20} 
                color="#007AFF" 
              />
            </TouchableOpacity>
            
            {showRawText && (
              <View style={styles.rawTextContainer}>
                <Text style={styles.rawText}>{prescription.rawText}</Text>
              </View>
            )}
          </CardContent>
        </Card>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button
          title="Retake Photo"
          variant="outline"
          onPress={onRetake}
          style={styles.actionButton}
        />
        <Button
          title={`Add to Cart (${selectedMedications.length})`}
          onPress={handleAddToCart}
          style={styles.actionButton}
          disabled={selectedMedications.length === 0}
        />
      </View>
    </View>
  );
}

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingTop: 50,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  
  headerButton: {
    padding: theme.spacing.sm,
  },
  
  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
  },
  
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  
  confidenceCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: '#F0F9FF',
  },
  
  confidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  
  confidenceTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  
  confidenceScore: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold as any,
    color: '#34C759',
  },
  
  confidenceText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  
  imageCard: {
    marginBottom: theme.spacing.md,
  },
  
  imageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: '#F0F9FF',
    borderRadius: theme.borderRadius.sm,
  },
  
  retakeText: {
    fontSize: theme.typography.sizes.sm,
    color: '#007AFF',
    marginLeft: theme.spacing.xs,
  },
  
  prescriptionImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
  },
  
  infoCard: {
    marginBottom: theme.spacing.md,
  },
  
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  infoSection: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  
  infoLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  
  infoValue: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },
  
  infoDetail: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  
  dateText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  
  warningsCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: '#FFF8F0',
  },
  
  warningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  
  warningItem: {
    borderLeftWidth: 4,
    paddingLeft: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: theme.borderRadius.sm,
  },
  
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  
  warningType: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold as any,
    marginLeft: theme.spacing.sm,
  },
  
  warningMessage: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  
  warningMeds: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  
  medicationsCard: {
    marginBottom: theme.spacing.md,
  },
  
  medicationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  
  medicationsCount: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold as any,
  },
  
  medicationItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    position: 'relative',
  },
  
  medicationSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  
  medicationInfo: {
    flex: 1,
  },
  
  medicationName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
  },
  
  medicationGeneric: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  
  medicationStatus: {
    alignItems: 'flex-end',
  },
  
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: theme.borderRadius.sm,
  },
  
  outOfStockBadge: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  
  stockText: {
    fontSize: theme.typography.sizes.xs,
    color: '#34C759',
    marginLeft: theme.spacing.xs,
  },
  
  outOfStockText: {
    color: '#FF3B30',
  },
  
  medicationDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.sm,
  },
  
  medicationDosage: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold as any,
    marginRight: theme.spacing.md,
  },
  
  medicationFrequency: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.md,
  },
  
  medicationDuration: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  
  medicationInstructions: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    fontStyle: 'italic',
    marginBottom: theme.spacing.sm,
  },
  
  alternativesSection: {
    backgroundColor: 'rgba(255, 204, 0, 0.1)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  
  alternativesLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.semibold as any,
  },
  
  alternativesText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  
  selectionIndicator: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
  },
  
  instructionsCard: {
    marginBottom: theme.spacing.md,
  },
  
  instructionText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  
  rawTextCard: {
    marginBottom: theme.spacing.md,
  },
  
  rawTextToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  rawTextTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },
  
  rawTextContainer: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.sm,
  },
  
  rawText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  
  bottomActions: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    paddingBottom: 40,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  
  actionButton: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
  },
}));