import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Switch, ScrollView, Alert, TextInput, Modal } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';

const LOCATION_TASK_NAME = 'background-location-task';
const STORAGE_KEY_SITES = 'timezone_sites';
const STORAGE_KEY_SESSIONS = 'timezone_sessions';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  
  if (data) {
    const { locations } = data;
    const location = locations[0];
    
    if (location) {
      console.log('Background location update:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date(location.timestamp).toISOString(),
      });
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [newSite, setNewSite] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius: '100',
  });
  const [settings, setSettings] = useState({
    minDuration: 5,
    workdayStart: '09:00',
    workdayEnd: '17:00',
    autoSync: false,
  });
  
  const subscriptionRef = useRef(null);

  useEffect(() => {
    loadSavedData();
    checkLocationPermission();
    loadSettings();
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('timezone_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadSavedData = async () => {
    try {
      const savedSites = await AsyncStorage.getItem(STORAGE_KEY_SITES);
      if (savedSites) {
        setJobSites(JSON.parse(savedSites));
      } else {
        setJobSites([
          { id: '1', name: 'Site A - Warehouse', latitude: 37.7749, longitude: -122.4194, radius: 100 },
          { id: '2', name: 'Client X HQ', latitude: 37.7849, longitude: -122.4094, radius: 150 },
        ]);
      }
      
      const savedSessions = await AsyncStorage.getItem(STORAGE_KEY_SESSIONS);
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions);
        setSessions(parsedSessions);
        
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
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Background location permission is required for automatic check-in.');
        return;
      }
      
      const foregroundSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 10,
        },
        (location) => {
          handleLocationUpdate(location);
        }
      );
      
      subscriptionRef.current = foregroundSubscription;
      
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000,
        distanceInterval: 50,
        foregroundService: {
          notificationTitle: 'TimeZone Tracking',
          notificationBody: 'Tracking your location for automatic check-in',
        },
        showsBackgroundLocationIndicator: true,
      });
      
      setIsEnabled(true);
      Alert.alert('TimeZone Enabled', 'Automatic check-in/check-out is now active.');
    } else {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      setIsEnabled(false);
      Alert.alert('TimeZone Disabled', 'Automatic tracking has been stopped.');
    }
  };

  const handleLocationUpdate = async (location) => {
    if (!location || !jobSites.length) return;
    
    const { latitude, longitude } = location.coords;
    setLocation({ latitude, longitude });
    
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
        if (!currentSession || currentSession.siteId !== site.id) {
          await checkInToSite(site, currentTime);
        }
        return;
      }
    }
    
    if (currentSession) {
      const checkInTime = new Date(currentSession.checkInTime);
      const timeOutside = (new Date() - checkInTime) / (1000 * 60);
        
      if (timeOutside > settings.minDuration) {
        await checkOutFromSite(currentTime);
      }
    }
  };
  
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
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
    checkOutFromSite(new Date().toISOString());
  };

  const syncWithBackend = async () => {
    try {
      Alert.alert(
        'Sync',
        'This would sync with your backend in a real implementation. Sessions remain local for now.',
        [{ text: 'OK' }]
      );
      console.log('Would sync sessions:', sessions);
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Sync Failed', 'Failed to sync with backend.');
    }
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
              trackColor={{ false: '#767577', true: colors.accent }}
              thumbColor={isEnabled ? colors.white : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={toggleSwitch}
              value={isEnabled}
            />
          </View>
          <View style={styles.settingsRow}>
            <Text style={styles.switchHelp}>
              {isEnabled 
                ? 'Tracking active. You will be automatically checked in when entering a job site.' 
                : 'Turn on to start automatic check-in/check-out.'}
            </Text>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => setShowSettingsModal(true)}
            >
              <Text style={styles.settingsButtonText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Session</Text>
          {currentSession ? (
            <View style={styles.sessionCard}>
              <Text style={styles.sessionSite}>{currentSession.siteName}</Text>
              <Text style={styles.sessionTime}>Checked in at: {new Date(currentSession.checkInTime).toLocaleString()}</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.checkOutButton, styles.manualButton]} onPress={manualCheckOut}>
                  <Text style={styles.checkOutButtonText}>Manual Check Out</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.checkOutButton, styles.autoButton]} onPress={simulateCheckOut}>
                  <Text style={styles.checkOutButtonText}>Auto Check Out</Text>
                </TouchableOpacity>
              </View>
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            <View style={styles.sessionActions}>
              <TouchableOpacity 
                style={[styles.syncButton, styles.smallButton]}
                onPress={syncWithBackend}
              >
                <Text style={styles.syncButtonText}>Sync</Text>
              </TouchableOpacity>
              {sessions.length > 0 && (
                <TouchableOpacity 
                  style={[styles.clearButton, styles.smallButton]}
                  onPress={async () => {
                    Alert.alert(
                      'Clear All Sessions',
                      'Are you sure you want to clear all sessions?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Clear', 
                          style: 'destructive',
                          onPress: async () => {
                            await AsyncStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify([]));
                            setSessions([]);
                            setCurrentSession(null);
                          }
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {sessions.length > 0 ? (
            sessions.map(session => (
              <View key={session.id} style={styles.sessionHistoryCard}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.historySite}>{session.siteName}</Text>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => {
                      setEditingSession(session);
                      setShowEditSessionModal(true);
                    }}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.historyTime}>
                  In: {new Date(session.checkInTime).toLocaleString()}
                </Text>
                <Text style={styles.historyTime}>
                  Out: {session.checkOutTime ? new Date(session.checkOutTime).toLocaleString() : 'In progress'}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noHistory}>No sessions recorded yet.</Text>
          )}
        </View>
      </ScrollView>

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

      <Modal
        visible={showSettingsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>TimeZone Settings</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Minimum Duration (minutes)</Text>
              <TextInput
                style={styles.modalInput}
                value={settings.minDuration.toString()}
                onChangeText={(text) => setSettings({...settings, minDuration: parseInt(text) || 5})}
                keyboardType="numeric"
                placeholder="5"
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Workday Start (HH:MM)</Text>
              <TextInput
                style={styles.modalInput}
                value={settings.workdayStart}
                onChangeText={(text) => setSettings({...settings, workdayStart: text})}
                placeholder="09:00"
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Workday End (HH:MM)</Text>
              <TextInput
                style={styles.modalInput}
                value={settings.workdayEnd}
                onChangeText={(text) => setSettings({...settings, workdayEnd: text})}
                placeholder="17:00"
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Auto Sync with Backend</Text>
              <Switch
                value={settings.autoSync}
                onValueChange={(value) => setSettings({...settings, autoSync: value})}
                trackColor={{ false: '#767577', true: colors.accent }}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSettingsModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={async () => {
                  await AsyncStorage.setItem('timezone_settings', JSON.stringify(settings));
                  setShowSettingsModal(false);
                  Alert.alert('Settings Saved', 'Your settings have been saved.');
                }}
              >
                <Text style={styles.saveButtonText}>Save</Text>
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
    backgroundColor: colors.muted,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    color: colors.secondary,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchHelp: {
    flex: 1,
    fontSize: 14,
    color: colors.secondary,
  },
  settingsButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  settingsButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  sessionCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  sessionSite: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  sessionTime: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  checkOutButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  manualButton: {
    backgroundColor: colors.accent,
  },
  autoButton: {
    backgroundColor: colors.secondary,
  },
  checkOutButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  noSession: {
    textAlign: 'center',
    color: colors.secondary,
    fontSize: 14,
    padding: 20,
  },
  addButton: {
    backgroundColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  noSitesText: {
    textAlign: 'center',
    color: colors.secondary,
    fontSize: 14,
    padding: 20,
  },
  siteCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  siteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  siteName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  deleteButton: {
    padding: 5,
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: 14,
  },
  siteDetails: {
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 5,
  },
  checkInButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  checkInButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  sessionActions: {
    flexDirection: 'row',
  },
  syncButton: {
    backgroundColor: colors.accent,
    marginRight: 10,
  },
  clearButton: {
    backgroundColor: colors.error,
  },
  smallButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  syncButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  clearButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  sessionHistoryCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  historySite: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  editButton: {
    padding: 5,
  },
  editButtonText: {
    color: colors.accent,
    fontSize: 14,
  },
  historyTime: {
    fontSize: 14,
    color: colors.secondary,
  },
  noHistory: {
    textAlign: 'center',
    color: colors.secondary,
    fontSize: 14,
    padding: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 25,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: colors.primary,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: colors.muted,
  },
  settingRow: {
    marginBottom: 15,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    color: colors.secondary,
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
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  cancelButtonText: {
    color: colors.secondary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.accent,
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
});
