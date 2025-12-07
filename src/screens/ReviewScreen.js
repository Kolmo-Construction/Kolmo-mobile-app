import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { processReceiptImage, normalizeReceiptData } from '../services/taggunService';

export default function ReviewScreen({ route, navigation }) {
  const { imageUri } = route.params || {};
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

  useEffect(() => {
    if (imageUri) {
      processReceipt();
    }
  }, [imageUri]);

  const processReceipt = async () => {
    setIsLoading(true);
    try {
      // Process the image through Taggun (mock for now)
      const taggunResponse = await processReceiptImage(imageUri);
      
      // Normalize the response for the app
      const normalizedData = normalizeReceiptData(taggunResponse);
      
      if (normalizedData) {
        setReceiptData(taggunResponse);
        setEditableData({
          merchant: normalizedData.merchant,
          total: normalizedData.total,
          tax: normalizedData.tax,
          currency: normalizedData.currency,
          date: normalizedData.date,
          time: normalizedData.time,
        });
      } else {
        throw new Error('No data received from OCR');
      }
    } catch (error) {
      Alert.alert('Processing Error', 'Failed to process receipt. Please try again.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    // Here you would save the receipt data to local storage or send to your backend
    Alert.alert('Receipt Saved', 'The receipt has been saved successfully.');
    navigation.navigate('History');
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
        <Text style={styles.title}>Review & Edit Receipt</Text>
        
        {imageUri && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.image} />
            <Text style={styles.imageCaption}>Captured Receipt</Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Processing receipt with OCR...</Text>
          </View>
        ) : receiptData ? (
          <>
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

              <Text style={styles.confidenceText}>
                OCR Confidence: {(receiptData.confidence * 100).toFixed(1)}%
              </Text>
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
  confidenceText: {
    marginTop: 15,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
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
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginTop: 40,
  },
});
