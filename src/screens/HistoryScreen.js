import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, FlatList, ActivityIndicator, Alert } from 'react-native';
import { fetchProjects, fetchReceipts } from '../services/kolmoApiService';
import { colors } from '../theme';

export default function HistoryScreen({ navigation }) {
  const [receipts, setReceipts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAllReceipts();
  }, []);

  const loadAllReceipts = async () => {
    setIsLoading(true);
    try {
      // First, get all projects
      const projects = await fetchProjects();

      // Then fetch receipts from all projects
      const allReceipts = [];
      for (const project of projects) {
        try {
          const projectReceipts = await fetchReceipts(project.id);
          // Add project info to each receipt
          const receiptsWithProject = projectReceipts.map(r => ({
            ...r,
            projectName: project.name
          }));
          allReceipts.push(...receiptsWithProject);
        } catch (err) {
          console.log(`No receipts for project ${project.name}`);
        }
      }

      // Sort by date, newest first
      allReceipts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setReceipts(allReceipts);
    } catch (error) {
      console.error('Error loading receipts:', error);
      Alert.alert('Error', 'Failed to load receipt history');
    } finally {
      setIsLoading(false);
    }
  };

  const renderReceiptItem = ({ item }) => {
    const date = new Date(item.receiptDate || item.createdAt);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity
        style={styles.receiptCard}
        onPress={() => {
          // TODO: Navigate to receipt detail view
          Alert.alert('Receipt Details', `Receipt from ${item.vendorName}\nAmount: $${item.totalAmount}`);
        }}
      >
        <View style={styles.receiptHeader}>
          <Text style={styles.merchantText}>{item.vendorName || 'Unknown Merchant'}</Text>
          <Text style={styles.totalText}>${item.totalAmount || '0.00'}</Text>
        </View>
        <Text style={styles.dateText}>{dateStr} at {timeStr}</Text>
        {item.projectName && (
          <Text style={styles.projectText}>Project: {item.projectName}</Text>
        )}
        {item.category && (
          <Text style={styles.categoryText}>Category: {item.category}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Receipt History</Text>
        <Text style={styles.subtitle}>View and manage your digitized receipts</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading receipts...</Text>
        </View>
      ) : receipts.length > 0 ? (
        <FlatList
          data={receipts}
          renderItem={renderReceiptItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          onRefresh={loadAllReceipts}
          refreshing={isLoading}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No receipts yet</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.buttonText}>Go Back to Home</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.muted,
  },
  header: {
    padding: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.secondary,
    marginTop: 5,
  },
  listContent: {
    padding: 20,
  },
  receiptCard: {
    backgroundColor: colors.white,
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
    color: colors.foreground,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.accent,
  },
  dateText: {
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 5,
  },
  projectText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  categoryText: {
    fontSize: 12,
    color: colors.secondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    color: colors.secondary,
    marginBottom: 20,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
