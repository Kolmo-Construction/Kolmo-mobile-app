import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { uploadReceipt } from '../services/kolmoApiService';
import { colors } from '../theme';

export default function ReviewScreen({ route, navigation }) {
  const { imageUri, selectedProject } = route.params || {};
  const [isUploading, setIsUploading] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [editableData, setEditableData] = useState({
    merchant: '',
    total: '',
    tax: '',
    currency: 'USD',
    date: '',
    time: '',
  });
  const [categories] = useState(['materials', 'labor', 'equipment', 'other']);
  const [selectedCategory, setSelectedCategory] = useState('other');
  const [notes, setNotes] = useState('');

  const projectId = selectedProject?.id || selectedProject?._id;

  const handleUploadAndProcess = async () => {
    if (!selectedProject) {
      Alert.alert('Error', 'No project selected. Please go back and select a project.');
      return;
    }

    if (!imageUri) {
      Alert.alert('Error', 'No image to upload.');
      return;
    }

    setIsUploading(true);
    try {
      console.log('Uploading receipt with OCR processing...');

      // Upload to backend - backend will process OCR and return results
      const response = await uploadReceipt(projectId, imageUri, selectedCategory, notes);

      console.log('Receipt uploaded, OCR response:', JSON.stringify(response, null, 2));

      // Extract OCR data from backend response
      if (response && response.receipt) {
        const receipt = response.receipt;
        setReceiptData(response);
        setEditableData({
          merchant: receipt.vendorName || '',
          total: receipt.totalAmount ? receipt.totalAmount.toString() : '',
          tax: '', // Add if backend returns tax
          currency: receipt.currency || 'USD',
          date: receipt.receiptDate ? new Date(receipt.receiptDate).toISOString().split('T')[0] : '',
          time: '',
        });

        // Show success message but DON'T navigate away so user can see OCR results
        Alert.alert(
          'Success!',
          `Receipt uploaded and processed!\n\nMerchant: ${receipt.vendorName || 'N/A'}\nAmount: $${receipt.totalAmount || '0.00'}\nConfidence: ${receipt.ocrConfidence ? (parseFloat(receipt.ocrConfidence) * 100).toFixed(1) + '%' : 'N/A'}`,
          [{ text: 'OK' }]
        );
      } else {
        // If no OCR data, still show success but navigate home
        Alert.alert(
          'Receipt Uploaded',
          'The receipt has been uploaded successfully.',
          [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
        );
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload receipt. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setEditableData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Review Receipt</Text>

        {imageUri && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.image} />
            <Text style={styles.imageCaption}>Captured Receipt</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload Details</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Project</Text>
            <View style={styles.projectDisplay}>
              <Text style={styles.projectName}>
                {selectedProject?.name || selectedProject?.title || 'No project'}
              </Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryContainer}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category && styles.categoryButtonSelected
                  ]}
                  onPress={() => setSelectedCategory(category)}
                  disabled={isUploading}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    selectedCategory === category && styles.categoryButtonTextSelected
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes about this receipt"
              multiline
              numberOfLines={3}
              editable={!isUploading}
            />
          </View>
        </View>

        {receiptData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✓ OCR Results</Text>

            <View style={styles.ocrDataDisplay}>
              <View style={styles.ocrRow}>
                <Text style={styles.ocrLabel}>Merchant:</Text>
                <Text style={styles.ocrValue}>{editableData.merchant || 'N/A'}</Text>
              </View>
              <View style={styles.ocrRow}>
                <Text style={styles.ocrLabel}>Total:</Text>
                <Text style={styles.ocrValue}>${editableData.total || '0.00'}</Text>
              </View>
              <View style={styles.ocrRow}>
                <Text style={styles.ocrLabel}>Date:</Text>
                <Text style={styles.ocrValue}>{editableData.date || 'N/A'}</Text>
              </View>
              <View style={styles.ocrRow}>
                <Text style={styles.ocrLabel}>Currency:</Text>
                <Text style={styles.ocrValue}>{editableData.currency || 'USD'}</Text>
              </View>
            </View>

            {receiptData.receipt?.ocrConfidence && (
              <View style={styles.confidenceContainer}>
                <Text style={styles.confidenceLabel}>
                  OCR Confidence: {(parseFloat(receiptData.receipt.ocrConfidence) * 100).toFixed(1)}%
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, { marginTop: 20 }]}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.buttonText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.goBack()}
            disabled={isUploading}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isUploading && styles.buttonDisabled]}
            onPress={handleUploadAndProcess}
            disabled={isUploading}
          >
            {isUploading ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator color={colors.white} size="small" />
                <Text style={[styles.buttonText, { marginLeft: 8 }]}>Uploading...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Upload & Process</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.muted,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: colors.primary,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginBottom: 10,
  },
  imageCaption: {
    fontSize: 14,
    color: colors.secondary,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: colors.secondary,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    color: colors.primary,
  },
  field: {
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
    color: colors.secondary,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.muted,
  },
  helpText: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 5,
    fontStyle: 'italic',
  },
  projectDisplay: {
    backgroundColor: '#fff9f0',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.accent,
  },
  projectClient: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ocrDataDisplay: {
    backgroundColor: colors.muted,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  ocrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ocrLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  ocrValue: {
    fontSize: 14,
    color: colors.foreground,
  },
  confidenceContainer: {
    marginTop: 10,
  },
  confidenceLabel: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.muted,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryButtonSelected: {
    backgroundColor: colors.accent,
  },
  categoryButtonText: {
    fontSize: 14,
    color: colors.secondary,
  },
  categoryButtonTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  lineItemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addItemText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  lineItemContainer: {
    backgroundColor: colors.muted,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  lineItemNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  removeItemText: {
    color: colors.error,
    fontSize: 12,
  },
  lineItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  smallInput: {
    flex: 1,
    marginRight: 10,
  },
  amountInput: {
    flex: 2,
  },
  lineItemsTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.accent,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  secondaryButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  savedReceiptText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.accent,
    marginBottom: 5,
  },
  savedReceiptSubtext: {
    fontSize: 14,
    color: colors.secondary,
    fontStyle: 'italic',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.secondary,
    marginTop: 40,
  },
});
