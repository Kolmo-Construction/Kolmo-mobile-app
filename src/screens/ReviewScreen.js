import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { processReceiptImage, normalizeReceiptData } from '../services/taggunService';

export default function ReviewScreen({ route, navigation }) {
  const { imageUri, receiptId } = route.params || {};
  const [isLoading, setIsLoading] = useState(false);
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

  const [projectId, setProjectId] = useState('default-project'); // Default or from user selection

  const processReceipt = useCallback(async () => {
    setIsLoading(true);
    try {
      // If we have an imageUri, send it to our backend
      if (imageUri) {
        // Prepare metadata including project ID
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
          // Set line items if available
          if (normalizedData.lineItems && normalizedData.lineItems.length > 0) {
            setLineItems(normalizedData.lineItems.map(item => ({
              ...item,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              category: selectedCategory
            })));
          } else {
            // Initialize with empty line item
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
      // If we have a receiptId, load existing receipt data from backend
      else if (receiptId) {
        // For now, we'll use mock data
        // In a real app, you would fetch the receipt data from your backend
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
      }
    } catch (error) {
      Alert.alert('Processing Error', 'Failed to load receipt data. Please try again.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [imageUri, receiptId, projectId]);

  useEffect(() => {
    if (imageUri || receiptId) {
      processReceipt();
    }
  }, [imageUri, receiptId, processReceipt]);

  const handleSave = () => {
    // Calculate total from line items if needed
    const lineItemsTotal = lineItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);
    
    // Prepare receipt data
    const receiptDataToSave = {
      ...editableData,
      lineItems,
      category: selectedCategory,
      confidence: receiptData?.confidence || 0,
      receiptId: receiptData?.receiptId || Date.now().toString(),
      projectId,
      timestamp: new Date().toISOString(),
    };
    
    // Here you would save the receipt data to local storage or send to your backend
    console.log('Saving receipt:', receiptDataToSave);
    Alert.alert('Receipt Saved', 'The receipt has been saved successfully.');
    navigation.navigate('History');
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
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Processing receipt with OCR...</Text>
          </View>
        ) : receiptData ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Project Information</Text>
              
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Project ID</Text>
                <TextInput
                  style={styles.input}
                  value={projectId}
                  onChangeText={setProjectId}
                  placeholder="Enter project ID"
                  editable={!receiptId} // Only editable for new receipts
                />
                <Text style={styles.helpText}>
                  This receipt will be associated with this project
                </Text>
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

              {/* Confidence Visualization */}
              <View style={styles.confidenceContainer}>
                <Text style={styles.confidenceLabel}>OCR Confidence:</Text>
                <View style={styles.confidenceBar}>
                  <View 
                    style={[
                      styles.confidenceFill, 
                      { 
                        width: `${(receiptData.confidence * 100).toFixed(0)}%`,
                        backgroundColor: receiptData.confidence > 0.8 ? '#4CAF50' : 
                                       receiptData.confidence > 0.6 ? '#FF9800' : '#f44336'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.confidenceText}>
                  {(receiptData.confidence * 100).toFixed(1)}%
                </Text>
              </View>

              {/* Receipt Categorization */}
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

              {/* Line Items Section */}
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
                
                {/* Total from line items */}
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
              >
                <Text style={styles.secondaryButtonText}>Retake Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.button}
                onPress={handleSave}
              >
                <Text style={styles.buttonText}>Save Receipt</Text>
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
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
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
    color: '#666',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
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
    color: '#444',
  },
  field: {
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  helpText: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
    fontStyle: 'italic',
  },
  confidenceContainer: {
    marginTop: 15,
    marginBottom: 20,
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#555',
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
    color: '#666',
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
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  categoryButtonSelected: {
    backgroundColor: '#4CAF50',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  categoryButtonTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  lineItemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addItemText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  lineItemContainer: {
    backgroundColor: '#f9f9f9',
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
    color: '#555',
  },
  removeItemText: {
    color: '#f44336',
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
    color: '#333',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  secondaryButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  savedReceiptText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 5,
  },
  savedReceiptSubtext: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginTop: 40,
  },
});
