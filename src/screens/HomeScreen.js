import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Kolmo Mobile App</Text>
        <Text style={styles.subtitle}>Capture receipts, document sites, and track time automatically</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receipt Management</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation.navigate('Camera')}
          >
            <Text style={styles.buttonText}>Capture New Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>View Receipt History</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Site Documentation</Text>
          <TouchableOpacity 
            style={[styles.button, styles.siteButton]}
            onPress={() => navigation.navigate('SitePhotos')}
          >
            <Text style={styles.buttonText}>Site Photos & Voice Notes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Tracking</Text>
          <TouchableOpacity 
            style={[styles.button, styles.timeButton]}
            onPress={() => navigation.navigate('TimeZone')}
          >
            <Text style={styles.buttonText}>TimeZone Auto Check-in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 40,
    textAlign: 'center',
    color: '#666',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 15,
    color: '#444',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  secondaryButtonText: {
    color: '#4CAF50',
  },
  siteButton: {
    backgroundColor: '#2196F3',
  },
  timeButton: {
    backgroundColor: '#FF9800',
  },
});
