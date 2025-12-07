import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Switch, ScrollView, Alert, TextInput, Modal, Button } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_TASK_NAME = 'background-location-task';
const STORAGE_KEY_SITES = 'timezone_sites';
const STORAGE_KEY_SESSIONS = 'timezone_sessions';

// Define the background location task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  
  if (data) {
    const { locations } = data;
    const location = locations[0];
    
    if (location) {
      // This is where we would process the location
      // For now, we'll just log it
      console.log('Background location update:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date(location.timestamp).toISOString(),
      });
      
      // In a real implementation, we would:
      // 1. Load job sites from storage
      // 2. Check if location is within any site radius
      // 3. Update sessions accordingly
    }
  }
});

export default function TimeZoneScreen() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [jobSites, setJobSites] = useState([]);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [newSite, setNewSite] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius: '100',
  });

  useEffect(() => {
    loadSavedData();
    checkLocationPermission();
  }, []);

  const loadSavedData = async () => {
    try {
      // Load saved job sites
      const savedSites = await AsyncStorage.getItem(STORAGE_KEY_SITES);
      if (savedSites) {
        setJobSites(JSON.parse(savedSites));
      } else {
        // Load mock sites if none saved
        setJobSites([
          { id: '1', name: 'Site A - Warehouse', latitude: 37.7749, longitude: -122.4194, radius: 100 },
          { id: '2', name: 'Client X HQ', latitude: 37.7849, longitude: -122.4094, radius: 150 },
        ]);
      }
      
      // Load saved sessions
      const savedSessions = await AsyncStorage.getItem(STORAGE_KEY_SESSIONS);
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions);
        setSessions(parsedSessions);
        
        // Find active session
        const activeSession = parsedSessions.find(s => !s.checkOutTime);
        if (activeSession) {
          setCurrentSession(activeSession);
        }
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const checkLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Permission to access location was denied');
    }
  };

  const toggleSwitch = async () => {
    if (!isEnabled) {
      // Start tracking
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Background location permission is required for automatic check-in.');
        return;
      }
      
      // Start foreground location updates for immediate feedback
      const foregroundSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000, // 10 seconds
          distanceInterval: 10, // 10 meters
        },
        (location) => {
          handleLocationUpdate(location);
        }
      );
      
      // Store subscription for cleanup
      subscriptionRef.current = foregroundSubscription;
      
      // Also start background updates for when app is in background
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // 30 seconds
        distanceInterval: 50, // 50 meters
        foregroundService: {
          notificationTitle: 'TimeZone Tracking',
          notificationBody: 'Tracking your location for automatic check-in',
        },
        showsBackgroundLocationIndicator: true,
      });
      
      setIsEnabled(true);
      Alert.alert('TimeZone Enabled', 'Automatic check-in/check-out is now active.');
    } else {
      // Stop tracking
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      setIsEnabled(false);
      Alert.alert('TimeZone Disabled', 'Automatic tracking has been stopped.');
    }
  };
  
  const subscriptionRef = useRef(null);

  const handleLocationUpdate = async (location) => {
    if (!location || !jobSites.length) return;
    
    const { latitude, longitude } = location.coords;
    setLocation({ latitude, longitude });
    
    // Check if user is within any job site
    const currentTime = new Date().toISOString();
    
    for (const site of jobSites) {
      const distance = calculateDistance(
        latitude,
        longitude,
        parseFloat(site.latitude),
        parseFloat(site.longitude)
      );
      
      const isWithinSite = distance <= parseFloat(site.radius);
      
      if (isWithinSite) {
        // User is within a job site
        if (!currentSession || currentSession.siteId !== site.id) {
          // Check in to this site
          await checkInToSite(site, currentTime);
        }
        return; // Found a matching site, no need to check others
      }
    }
    
    // User is not within any job site
    if (currentSession) {
      // Check if user has been outside for more than buffer time (e.g., 5 minutes)
      const checkInTime = new Date(currentSession.checkInTime);
      const timeOutside = (new Date() - checkInTime) / (1000 * 60); // minutes
      
      if (timeOutside > 5) { // 5 minute buffer
        await checkOutFromSite(currentTime);
      }
    }
  };
  
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Haversine formula to calculate distance in meters
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  };
  
  const checkInToSite = async (site, timestamp) => {
    // Check out of current session if exists
    if (currentSession) {
      await checkOutFromSite(timestamp);
    }
    
    const newSession = {
      id: Date.now().toString(),
      siteId: site.id,
      siteName: site.name,
      checkInTime: timestamp,
      checkOutTime: null,
    };
    
    setCurrentSession(newSession);
    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    
    // Save to storage
    await AsyncStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(updatedSessions));
    
    Alert.alert('Auto Check-in', `You have been automatically checked in at ${site.name}`);
  };
  
  const checkOutFromSite = async (timestamp) => {
    if (!currentSession) return;
    
    const updatedSession = {
      ...currentSession,
      checkOutTime: timestamp,
    };
    
    const updatedSessions = sessions.map(s => 
      s.id === currentSession.id ? updatedSession : s
    );
    
    setCurrentSession(null);
    setSessions(updatedSessions);
    
    // Save to storage
    await AsyncStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(updatedSessions));
    
    Alert.alert('Auto Check-out', `You have been automatically checked out from ${updatedSession.siteName}`);
  };

  const addJobSite = async () => {
    if (!newSite.name || !newSite.latitude || !newSite.longitude || !newSite.radius) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    const site = {
      id: Date.now().toString(),
      name: newSite.name,
      latitude: parseFloat(newSite.latitude),
      longitude: parseFloat(newSite.longitude),
      radius: parseFloat(newSite.radius),
    };
    
    const updatedSites = [...jobSites, site];
    setJobSites(updatedSites);
    await AsyncStorage.setItem(STORAGE_KEY_SITES, JSON.stringify(updatedSites));
    
    setNewSite({ name: '', latitude: '', longitude: '', radius: '100' });
    setShowAddSiteModal(false);
    Alert.alert('Success', 'Job site added successfully');
  };
  
  const removeJobSite = async (siteId) => {
    const updatedSites = jobSites.filter(site => site.id !== siteId);
    setJobSites(updatedSites);
    await AsyncStorage.setItem(STORAGE_KEY_SITES, JSON.stringify(updatedSites));
    Alert.alert('Success', 'Job site removed');
  };
  
  const manualCheckIn = (site) => {
    checkInToSite(site, new Date().toISOString());
  };
  
  const manualCheckOut = () => {
    if (currentSession) {
      checkOutFromSite(new Date().toISOString());
    }
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Job Sites</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddSiteModal(true)}
            >
              <Text style={styles.addButtonText}>+ Add Site</Text>
            </TouchableOpacity>
          </View>
          
          {jobSites.length === 0 ? (
            <Text style={styles.noSitesText}>No job sites configured. Add your first job site to enable auto check-in.</Text>
          ) : (
            jobSites.map(site => (
              <View key={site.id} style={styles.siteCard}>
                <View style={styles.siteCardHeader}>
                  <Text style={styles.siteName}>{site.name}</Text>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => removeJobSite(site.id)}
                  >
                    <Text style={styles.deleteButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.siteDetails}>
                  Location: {site.latitude.toFixed(6)}, {site.longitude.toFixed(6)}
                </Text>
                <Text style={styles.siteDetails}>Radius: {site.radius}m</Text>
                <TouchableOpacity 
                  style={styles.checkInButton}
                  onPress={() => manualCheckIn(site)}
                  disabled={currentSession?.siteId === site.id}
                >
                  <Text style={styles.checkInButtonText}>
                    {currentSession?.siteId === site.id ? 'Currently Checked In' : 'Manual Check-in'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
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

      {/* Add Job Site Modal */}
      <Modal
        visible={showAddSiteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddSiteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Job Site</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Site Name (e.g., Warehouse A)"
              value={newSite.name}
              onChangeText={(text) => setNewSite({...newSite, name: text})}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Latitude (e.g., 37.7749)"
              value={newSite.latitude}
              onChangeText={(text) => setNewSite({...newSite, latitude: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Longitude (e.g., -122.4194)"
              value={newSite.longitude}
              onChangeText={(text) => setNewSite({...newSite, longitude: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Radius in meters (e.g., 100)"
              value={newSite.radius}
              onChangeText={(text) => setNewSite({...newSite, radius: text})}
              keyboardType="numeric"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddSiteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={addJobSite}
              >
                <Text style={styles.saveButtonText}>Save Site</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  siteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
  },
  checkInButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 10,
    alignItems: 'center',
  },
  checkInButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  noSitesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#fafafa',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  noHistory: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
});
