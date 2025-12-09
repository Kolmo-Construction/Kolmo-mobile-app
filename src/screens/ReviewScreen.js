import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { uploadReceipt } from '../services/kolmoApiService';
import { processReceiptImage, normalizeReceiptData } from '../services/taggunService';
import { colors } from '../theme';

export default function ReviewScreen({ route, navigation }) {
  const { imageUri, receiptId, selectedProject } = route.params || {};
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [editableData, setEditableData] = useState({
    merchant: '',
    total: '',
    tax: '',
    currency: '',
    date: '',
    time: '',
  });
  const [lineItems, setLineItems] = useState([]);
  const [categories, setCategories] = useState(['Food', 'Transportation', 'Office Supplies', 'Equipment', 'Other']);
  const [selectedCategory, setSelectedCategory] = useState('Other');
  const [notes, setNotes] = useState('');

  const projectId = selectedProject?.id || selectedProject?._id || 'default-project';

  const processReceipt = useCallback(async () => {
    setIsLoading(true);
    try {
      if (imageUri) {
        const metadata = {
          projectId: projectId,
          timestamp: new Date().toISOString(),
        };
        
        const backendResponse = await processReceiptImage(imageUri, metadata);
        const normalizedData = normalizeReceiptData(backendResponse);
        
        if (normalizedData) {
          setReceiptData(backendResponse);
          setEditableData({
            merchant: normalizedData.merchant,
            total: normalizedData.total,
            tax: normalizedData.tax,
            currency: normalizedData.currency,
            date: normalizedData.date,
            time: normalizedData.time,
          });
          if (normalizedData.lineItems && normalizedData.lineItems.length > 0) {
            setLineItems(normalizedData.lineItems.map(item => ({
              ...item,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              category: selectedCategory
            })));
          } else {
            setLineItems([{
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              description: '',
              quantity: 1,
              amount: '',
              category: selectedCategory
            }]);
          }
        } else {
          throw new Error('No data received from backend');
        }
      } 
      else if (receiptId) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const mockBackendResponse = {
          success: true,
          receiptId: receiptId,
          data: {
            merchant: { name: 'Saved Store', confidence: 0.95 },
            totalAmount: { data: 50.00, confidence: 0.98 },
            taxAmount: { data: 4.00, confidence: 0.90 },
            currency: 'USD',
            date: { data: '2024-12-01', confidence: 0.85 },
            time: { data: '10:30:00', confidence: 0.80 },
            confidence: 0.90,
          },
          metadata: {
            projectId: 'default-project',
            processedAt: '2024-12-01T10:30:00Z'
          }
        };
        const normalizedData = normalizeReceiptData(mockBackendResponse);
        setReceiptData(mockBackendResponse);
        setEditableData({
          merchant: normalizedData.merchant,
          total: normalizedData.total,
          tax: normalizedData.tax,
          currency: normalizedData.currency,
          date: normalizedData.date,
          time: normalizedData.time,
        });
        setLineItems([{
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          description: '',
          quantity: 1,
          amount: '',
          category: selectedCategory
        }]);
      }
    } catch (error) {
      Alert.alert('Processing Error', 'Failed to load receipt data. Please try again.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [imageUri, receiptId, projectId, selectedCategory]);

  useEffect(() => {
    if (imageUri || receiptId) {
      processReceipt();
    }
  }, [imageUri, receiptId, processReceipt]);

  const handleSave = async () => {
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
      const notesText = notes || `${editableData.merchant} - $${editableData.total} - ${editableData.date}`;
      
      await uploadReceipt(projectId, imageUri, selectedCategory, notesText);
      
      Alert.alert(
        'Receipt Uploaded',
        'The receipt has been successfully uploaded to the project.',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
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

  const handleLineItemChange = (id, field, value) => {
    setLineItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      description: '',
      quantity: 1,
      amount: '',
      category: selectedCategory
    }]);
  };

  const removeLineItem = (id) => {
    if (lineItems.length > 1) {
      setLineItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const updateCategoryForAllItems = (category) => {
    setSelectedCategory(category);
    setLineItems(prev => prev.map(item => ({ ...item, category })));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Review & Edit</Text>
        
        {imageUri ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.image} />
            <Text style={styles.imageCaption}>Captured Receipt</Text>
          </View>
        ) : receiptId ? (
          <View style={styles.imageContainer}>
            <Text style={styles.savedReceiptText}>Saved Receipt</Text>
            <Text style={styles.savedReceiptSubtext}>Receipt ID: {receiptId}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Processing receipt with OCR...</Text>
          </View>
        ) : receiptData ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Project Information</Text>
              
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Project</Text>
                <View style={styles.projectDisplay}>
                  <Text style={styles.projectName}>
                    {selectedProject?.name || selectedProject?.title || projectId}
                  </Text>
                  {selectedProject?.client && (
                    <Text style={styles.projectClient}>{selectedProject.client}</Text>
                  )}
                </View>
                <Text style={styles.helpText}>
                  This receipt will be uploaded to this project
                </Text>
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
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Receipt Details</Text>
              
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Merchant</Text>
                <TextInput
                  style={styles.input}
                  value={editableData.merchant}
                  onChangeText={(text) => handleFieldChange('merchant', text)}
                  placeholder="Merchant name"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Total Amount</Text>
                <TextInput
                  style={styles.input}
                  value={editableData.total}
                  onChangeText={(text) => handleFieldChange('total', text)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Tax</Text>
                <TextInput
                  style={styles.input}
                  value={editableData.tax}
                  onChangeText={(text) => handleFieldChange('tax', text)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Currency</Text>
                <TextInput
                  style={styles.input}
                  value={editableData.currency}
                  onChangeText={(text) => handleFieldChange('currency', text)}
                  placeholder="USD"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={editableData.date}
                  onChangeText={(text) => handleFieldChange('date', text)}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Time</Text>
                <TextInput
                  style={styles.input}
                  value={editableData.time}
                  onChangeText={(text) => handleFieldChange('time', text)}
                  placeholder="HH:MM"
                />
              </View>

              {(() => {
                const confidence = receiptData?.confidence ?? receiptData?.data?.confidence ?? 0.5;
                return (
                <View style={styles.confidenceContainer}>
                  <Text style={styles.confidenceLabel}>OCR Confidence:</Text>
                  <View style={styles.confidenceBar}>
                    <View 
                      style={[
                        styles.confidenceFill, 
                        { 
                          width: `${(confidence * 100).toFixed(0)}%`,
                          backgroundColor: confidence > 0.8 ? colors.success : 
                                         confidence > 0.6 ? colors.accent : colors.error
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.confidenceText}>
                    {(confidence * 100).toFixed(1)}%
                  </Text>
                </View>
                );
              })()}

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
                      onPress={() => updateCategoryForAllItems(category)}
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
                <View style={styles.lineItemsHeader}>
                  <Text style={styles.fieldLabel}>Line Items</Text>
                  <TouchableOpacity onPress={addLineItem}>
                    <Text style={styles.addItemText}>+ Add Item</Text>
                  </TouchableOpacity>
                </View>
                
                {lineItems.map((item, index) => (
                  <View key={item.id} style={styles.lineItemContainer}>
                    <View style={styles.lineItemHeader}>
                      <Text style={styles.lineItemNumber}>Item {index + 1}</Text>
                      {lineItems.length > 1 && (
                        <TouchableOpacity onPress={() => removeLineItem(item.id)}>
                          <Text style={styles.removeItemText}>Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    <TextInput
                      style={styles.input}
                      placeholder="Description"
                      value={item.description}
                      onChangeText={(text) => handleLineItemChange(item.id, 'description', text)}
                    />
                    
                    <View style={styles.lineItemRow}>
                      <TextInput
                        style={[styles.input, styles.smallInput]}
                        placeholder="Qty"
                        value={item.quantity.toString()}
                        onChangeText={(text) => handleLineItemChange(item.id, 'quantity', parseInt(text) || 1)}
                        keyboardType="numeric"
                      />
                      <TextInput
                        style={[styles.input, styles.amountInput]}
                        placeholder="Amount"
                        value={item.amount}
                        onChangeText={(text) => handleLineItemChange(item.id, 'amount', text)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                ))}
                
                {lineItems.length > 0 && (
                  <View style={styles.lineItemsTotal}>
                    <Text style={styles.totalLabel}>Line Items Total:</Text>
                    <Text style={styles.totalAmount}>
                      ${lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]}
                onPress={() => navigation.goBack()}
                disabled={isUploading}
              >
                <Text style={styles.secondaryButtonText}>Retake Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, isUploading && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isUploading}
              >
                {isUploading ? (
                  <View style={styles.uploadingContainer}>
                    <ActivityIndicator color={colors.white} size="small" />
                    <Text style={[styles.buttonText, { marginLeft: 8 }]}>Uploading...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Upload Receipt</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Text style={styles.noDataText}>No receipt data available.</Text>
        )}
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
  confidenceContainer: {
    marginTop: 15,
    marginBottom: 20,
  },
  confidenceLabel: {
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 5,
  },
  confidenceBar: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 5,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 5,
  },
  confidenceText: {
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
