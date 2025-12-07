import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, FlatList } from 'react-native';

// Mock data for demonstration
const mockReceipts = [
  { id: '1', merchant: 'Grocery Store', total: '$45.67', date: '2024-12-01', time: '10:30 AM' },
  { id: '2', merchant: 'Gas Station', total: '$32.50', date: '2024-12-02', time: '14:15 PM' },
  { id: '3', merchant: 'Restaurant', total: '$78.90', date: '2024-12-03', time: '19:45 PM' },
  { id: '4', merchant: 'Electronics Store', total: '$299.99', date: '2024-12-04', time: '11:20 AM' },
  { id: '5', merchant: 'Pharmacy', total: '$22.35', date: '2024-12-05', time: '16:10 PM' },
];

export default function HistoryScreen({ navigation }) {
  const [receipts, setReceipts] = useState(mockReceipts);

  const renderReceiptItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.receiptCard}
      onPress={() => navigation.navigate('Review', { receiptId: item.id })}
    >
      <View style={styles.receiptHeader}>
        <Text style={styles.merchantText}>{item.merchant}</Text>
        <Text style={styles.totalText}>{item.total}</Text>
      </View>
      <Text style={styles.dateText}>{item.date} at {item.time}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Receipt History</Text>
        <Text style={styles.subtitle}>View and manage your digitized receipts</Text>
      </View>
      
      {receipts.length > 0 ? (
        <FlatList
          data={receipts}
          renderItem={renderReceiptItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No receipts yet</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation.navigate('Camera')}
          >
            <Text style={styles.buttonText}>Capture Your First Receipt</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  listContent: {
    padding: 20,
  },
  receiptCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  merchantText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    color: '#999',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
