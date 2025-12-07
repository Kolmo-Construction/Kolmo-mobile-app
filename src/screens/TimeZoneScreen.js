import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Switch, ScrollView, Alert } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK_NAME = 'background-location-task';

export default function TimeZoneScreen() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
    })();
  }, []);

  const toggleSwitch = async () => {
    if (!isEnabled) {
      // Start tracking
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Background location permission is required for automatic check-in.');
        return;
      }
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // 30 seconds
        distanceInterval: 50, // 50 meters
        foregroundService: {
          notificationTitle: 'TimeZone Tracking',
          notificationBody: 'Tracking your location for automatic check-in',
        },
      });
      setIsEnabled(true);
      Alert.alert('TimeZone Enabled', 'Automatic check-in/check-out is now active.');
    } else {
      // Stop tracking
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      setIsEnabled(false);
      Alert.alert('TimeZone Disabled', 'Automatic tracking has been stopped.');
    }
  };

  const mockSites = [
    { id: 1, name: 'Site A - Warehouse', lat: 37.7749, lng: -122.4194, radius: 100 },
    { id: 2, name: 'Client X HQ', lat: 37.7849, lng: -122.4094, radius: 150 },
  ];

  const simulateCheckIn = (site) => {
    const newSession = {
      id: Date.now(),
      siteName: site.name,
      checkInTime: new Date().toLocaleTimeString(),
      checkOutTime: null,
    };
    setCurrentSession(newSession);
    setSessions(prev => [newSession, ...prev]);
    Alert.alert('Checked In', `You are now checked in at ${site.name}`);
  };

  const simulateCheckOut = () => {
    if (!currentSession) return;
    const updatedSession = {
      ...currentSession,
      checkOutTime: new Date().toLocaleTimeString(),
    };
    setSessions(prev => prev.map(s => 
      s.id === currentSession.id ? updatedSession : s
    ));
    setCurrentSession(null);
    Alert.alert('Checked Out', `You have checked out from ${updatedSession.siteName}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>TimeZone Auto Check-in</Text>
        <Text style={styles.subtitle}>Automatic location-based time tracking</Text>

        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Enable TimeZone Tracking</Text>
            <Switch
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={isEnabled ? '#f5dd4b' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={toggleSwitch}
              value={isEnabled}
            />
          </View>
          <Text style={styles.switchHelp}>
            {isEnabled 
              ? 'Tracking active. You will be automatically checked in when entering a job site.' 
              : 'Turn on to start automatic check-in/check-out.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Session</Text>
          {currentSession ? (
            <View style={styles.sessionCard}>
              <Text style={styles.sessionSite}>{currentSession.siteName}</Text>
              <Text style={styles.sessionTime}>Checked in at: {currentSession.checkInTime}</Text>
              <TouchableOpacity style={styles.checkOutButton} onPress={simulateCheckOut}>
                <Text style={styles.checkOutButtonText}>Check Out Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.noSession}>No active session</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mock Job Sites</Text>
          {mockSites.map(site => (
            <TouchableOpacity 
              key={site.id} 
              style={styles.siteCard}
              onPress={() => simulateCheckIn(site)}
            >
              <Text style={styles.siteName}>{site.name}</Text>
              <Text style={.siteDetails}>Radius: {site.radius}m</Text>
              <Text style={styles.checkInText}>Tap to simulate check-in</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          {sessions.length > 0 ? (
            sessions.map(session => (
              <View key={session.id} style={styles.sessionHistoryCard}>
                <Text style={styles.historySite}>{session.siteName}</Text>
                <Text style={styles.historyTime}>In: {session.checkInTime}</Text>
                <Text style={styles.historyTime}>Out: {session.checkOutTime || 'In progress'}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noHistory}>No sessions recorded yet.</Text>
          )}
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
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    color: '#666',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#444',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  switchLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  switchHelp: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  sessionCard: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  sessionSite: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  sessionTime: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
  checkOutButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkOutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  noSession: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  siteCard: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  siteName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 5,
  },
  siteDetails: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  checkInText: {
    fontSize: 14,
    color: '#0D47A1',
    fontStyle: 'italic',
  },
  sessionHistoryCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  historySite: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  historyTime: {
    fontSize: 14,
    color: '#666',
  },
  noHistory: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
});
