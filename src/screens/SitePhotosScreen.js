import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, TextInput, ScrollView, Alert, ActivityIndicator, Platform, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import * as Network from 'expo-network';
import { authenticateWithGoogle, uploadToGoogleDrive } from '../services/googleDriveService';
import { addToUploadQueue, getUploadQueue, processUploadQueue, getQueueStats, clearCompletedItems } from '../services/uploadQueueService';

export default function SitePhotosScreen({ navigation }) {
  const [images, setImages] = useState([]);
  const [recording, setRecording] = useState(null);
  const [sound, setSound] = useState(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [projectId, setProjectId] = useState('default-project');
  const [location, setLocation] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [queueStats, setQueueStats] = useState({ total: 0, pending: 0, failed: 0, completed: 0 });
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const loadQueueStats = useCallback(async () => {
    const stats = await getQueueStats();
    setQueueStats(stats);
  }, []);

  useEffect(() => {
    (async () => {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy,
        });
      }
      
      // Load queue stats
      await loadQueueStats();
    })();
  }, [loadQueueStats]);
  
  const processQueue = useCallback(async () => {
    if (!accessToken) {
      Alert.alert('Authentication Required', 'Please sign in with Google first.');
      return;
    }
    
    setIsProcessingQueue(true);
    
    try {
      const result = await processUploadQueue(
        async (item) => {
          return await uploadToGoogleDrive(
            accessToken,
            item.file,
            item.metadata,
            item.projectId
          );
        },
        (progress) => {
          console.log('Upload progress:', progress);
          // Could update UI here with progress
        }
      );
      
      await loadQueueStats();
      
      if (result.processed > 0) {
        Alert.alert(
          'Queue Processed',
          `Successfully uploaded ${result.processed} item(s). ${result.failed > 0 ? `${result.failed} item(s) failed.` : ''}`
        );
      }
      
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      setIsProcessingQueue(false);
    }
  }, [accessToken, loadQueueStats]);

  useEffect(() => {
    // Check network status and process queue when coming online
    const checkNetworkAndProcess = async () => {
      const networkState = await Network.getNetworkStateAsync();
      if (networkState.isConnected && accessToken && queueStats.pending > 0) {
        await processQueue();
      }
    };
    
    checkNetworkAndProcess();
  }, [accessToken, queueStats.pending]);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to select photos.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.8,
      exif: true,
      allowsMultipleSelection: true,
      selectionLimit: 10, // Allow up to 10 images
    });

    if (!result.canceled) {
      const newImages = await Promise.all(result.assets.map(async (asset) => {
        try {
          const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.assetId || asset.id);
          return {
            ...asset,
            id: asset.assetId || Date.now().toString() + Math.random(),
            exif: assetInfo.exif || {},
            location: assetInfo.location,
          };
        } catch (error) {
          console.log('Could not get detailed EXIF:', error);
          return {
            ...asset,
            id: asset.assetId || Date.now().toString() + Math.random(),
            exif: {},
            location: null,
          };
        }
      }));
      
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera permissions to take photos.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.8,
      exif: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      // Get current location if available
      let currentLocation = location;
      if (!currentLocation && locationPermission) {
        const loc = await Location.getCurrentPositionAsync({});
        currentLocation = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
        };
      }
      
      const newImage = {
        ...asset,
        id: Date.now().toString() + Math.random(),
        exif: asset.exif || {},
        location: currentLocation,
      };
      
      setImages(prev => [...prev, newImage]);
    }
  };

  const removeImage = (imageId) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    const uri = recording.getURI();
    const soundObject = new Audio.Sound();
    try {
      await soundObject.loadAsync({ uri });
      setSound(soundObject);
      setRecording(null);
      Alert.alert('Voice note recorded', 'Voice note is ready to be uploaded.');
    } catch (error) {
      console.error('Failed to load recording:', error);
      Alert.alert('Error', 'Failed to save voice note.');
    }
  };

  const handleGoogleAuth = async () => {
    setIsAuthenticating(true);
    try {
      const authResult = await authenticateWithGoogle();
      setAccessToken(authResult.accessToken);
      Alert.alert('Authentication Successful', 'You can now upload files to Google Drive.');
    } catch (error) {
      Alert.alert('Authentication Failed', error.message || 'Failed to authenticate with Google.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleUpload = async () => {
    if (images.length === 0) {
      Alert.alert('No images', 'Please select or take at least one photo first.');
      return;
    }
    
    // Check if authenticated with Google
    if (!accessToken) {
      Alert.alert(
        'Authentication Required',
        'You need to sign in with Google to upload files to Google Drive.',
        [
          { text: 'Sign In', onPress: handleGoogleAuth },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Prepare metadata
      const metadata = {
        projectId,
        description,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        timestamp: new Date().toISOString(),
        location: location,
        exif: {},
        deviceInfo: {
          platform: Platform.OS,
        }
      };
      
      // Add each image to the upload queue
      for (const image of images) {
        const imageFilename = `site_photo_${Date.now()}_${projectId}_${image.id}.jpg`;
        
        await addToUploadQueue({
          type: 'image',
          file: {
            uri: image.uri,
            name: imageFilename,
            type: 'image/jpeg',
          },
          metadata: {
            ...metadata,
            exif: image.exif || {},
            location: image.location || location,
            fileType: 'image',
            imageId: image.id,
          },
          projectId,
        });
      }
      
      // Add voice note to queue if exists
      if (sound) {
        const audioUri = sound._uri || sound.uri;
        const audioFilename = `voice_note_${Date.now()}_${projectId}.m4a`;
        
        await addToUploadQueue({
          type: 'audio',
          file: {
            uri: audioUri,
            name: audioFilename,
            type: 'audio/m4a',
          },
          metadata: {
            ...metadata,
            fileType: 'audio',
          },
          projectId,
        });
      }
      
      // Add metadata file to queue
      const metadataFilename = `metadata_${Date.now()}_${projectId}.json`;
      const metadataUri = FileSystem.cacheDirectory + metadataFilename;
      await FileSystem.writeAsStringAsync(metadataUri, JSON.stringify(metadata, null, 2));
      
      await addToUploadQueue({
        type: 'metadata',
        file: {
          uri: metadataUri,
          name: metadataFilename,
          type: 'application/json',
        },
        metadata: {
          ...metadata,
          fileType: 'metadata',
        },
        projectId,
      });
      
      // Process the queue
      await processQueue();
      
      Alert.alert(
        'Upload Queued',
        `${images.length} image(s) and ${sound ? '1 voice note' : 'no voice notes'} have been added to the upload queue. ` +
        `They will be uploaded when you have an internet connection.`,
        [{ 
          text: 'OK', 
          onPress: () => {
            // Reset form but keep images in case user wants to add more
            setDescription('');
            setTags('');
            setSound(null);
          }
        }]
      );
      
    } catch (error) {
      console.error('Error adding to upload queue:', error);
      Alert.alert(
        'Upload Failed',
        error.message || 'Failed to add files to upload queue. Please try again.',
        [
          { text: 'Try Again', onPress: () => handleUpload() },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } finally {
      setIsUploading(false);
    }
  };
  
  
  const clearQueue = async () => {
    Alert.alert(
      'Clear Upload Queue',
      'Are you sure you want to clear all completed uploads from the queue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            await clearCompletedItems();
            await loadQueueStats();
            Alert.alert('Queue Cleared', 'Completed uploads have been removed from the queue.');
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Site Photos & Voice Notes</Text>
        <Text style={styles.subtitle}>Capture job site images with voice context</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
            <Text style={styles.actionButtonText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={pickImages}>
            <Text style={styles.actionButtonText}>Pick Multiple</Text>
          </TouchableOpacity>
        </View>

        {images.length > 0 && (
          <View style={styles.imagesSection}>
            <View style={styles.imagesHeader}>
              <Text style={styles.sectionTitle}>Selected Images ({images.length})</Text>
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => setImages([])}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              horizontal
              data={images}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.imageThumbnailContainer}>
                  <Image source={{ uri: item.uri }} style={styles.imageThumbnail} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => removeImage(item.id)}
                  >
                    <Text style={styles.removeImageButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              )}
              contentContainerStyle={styles.imagesList}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Note</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.actionButton, recording && styles.recordingButton]} 
              onPress={recording ? stopRecording : startRecording}
            >
              <Text style={styles.actionButtonText}>
                {recording ? 'Stop Recording' : 'Start Recording'}
              </Text>
            </TouchableOpacity>
          </View>
          {recording && <Text style={styles.recordingText}>Recording in progress...</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Project ID</Text>
            <TextInput
              style={styles.input}
              value={projectId}
              onChangeText={setProjectId}
              placeholder="Enter project ID"
            />
            <Text style={styles.helpText}>
              This site photo will be associated with this project
            </Text>
          </View>
          
          {location && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                Location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </Text>
              <Text style={styles.helpText}>
                GPS coordinates will be included with the upload
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter description..."
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., issue, completion, inspection"
            value={tags}
            onChangeText={setTags}
          />
        </View>

        {queueStats.total > 0 && (
          <View style={styles.queueSection}>
            <Text style={styles.sectionTitle}>Upload Queue</Text>
            <View style={styles.queueStats}>
              <View style={styles.queueStat}>
                <Text style={styles.queueStatValue}>{queueStats.pending}</Text>
                <Text style={styles.queueStatLabel}>Pending</Text>
              </View>
              <View style={styles.queueStat}>
                <Text style={styles.queueStatValue}>{queueStats.processing}</Text>
                <Text style={styles.queueStatLabel}>Processing</Text>
              </View>
              <View style={styles.queueStat}>
                <Text style={styles.queueStatValue}>{queueStats.failed}</Text>
                <Text style={[styles.queueStatLabel, styles.failedText]}>Failed</Text>
              </View>
              <View style={styles.queueStat}>
                <Text style={styles.queueStatValue}>{queueStats.completed}</Text>
                <Text style={[styles.queueStatLabel, styles.completedText]}>Completed</Text>
              </View>
            </View>
            
            <View style={styles.queueActions}>
              <TouchableOpacity 
                style={[styles.queueButton, styles.processButton]}
                onPress={processQueue}
                disabled={isProcessingQueue || queueStats.pending === 0}
              >
                <Text style={styles.queueButtonText}>
                  {isProcessingQueue ? 'Processing...' : 'Process Queue'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.queueButton, styles.clearQueueButton]}
                onPress={clearQueue}
                disabled={queueStats.completed === 0}
              >
                <Text style={styles.queueButtonText}>Clear Completed</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.authSection}>
          {accessToken ? (
            <View style={styles.authStatus}>
              <Text style={styles.authStatusText}>✓ Connected to Google Drive</Text>
              <TouchableOpacity 
                style={styles.signOutButton}
                onPress={() => setAccessToken(null)}
              >
                <Text style={styles.signOutButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.authButton}
              onPress={handleGoogleAuth}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.authButtonText}>Sign in with Google</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.uploadSection}>
          <TouchableOpacity 
            style={[styles.uploadButton, (isUploading || images.length === 0) && styles.uploadButtonDisabled]} 
            onPress={handleUpload}
            disabled={isUploading || images.length === 0}
          >
            {isUploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.uploadButtonText}>
                {images.length > 1 ? `Upload ${images.length} Images` : 'Upload to Google Drive'}
              </Text>
            )}
          </TouchableOpacity>
          {images.length === 0 && (
            <Text style={styles.uploadHelpText}>Select or take at least one photo first</Text>
          )}
          {!accessToken && images.length > 0 && (
            <Text style={styles.uploadHelpText}>Sign in with Google to upload</Text>
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingButton: {
    backgroundColor: '#f44336',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  image: {
    width: 300,
    height: 225,
    borderRadius: 10,
    marginBottom: 10,
  },
  imageInfo: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  uploadSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 200,
  },
  uploadButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  authSection: {
    marginBottom: 20,
  },
  authButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  authStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  authStatusText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: '#f44336',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  uploadHelpText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
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
  helpText: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
    fontStyle: 'italic',
  },
  locationInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1e7ff',
  },
  locationText: {
    fontSize: 14,
    color: '#1565C0',
    fontWeight: '500',
  },
  imagesSection: {
    marginBottom: 20,
  },
  imagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  settingsButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  settingsButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  settingRow: {
    marginBottom: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
    color: '#555',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  editButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
  },
  sessionTags: {
    flexDirection: 'row',
    marginTop: 5,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 5,
  },
  breakTag: {
    backgroundColor: '#FFEB3B',
  },
  nonBillableTag: {
    backgroundColor: '#9E9E9E',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  sessionActions: {
    flexDirection: 'row',
  },
  syncButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginRight: 10,
  },
  syncButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  smallButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  clearButton: {
    backgroundColor: '#f44336',
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  imagesList: {
    paddingVertical: 5,
  },
  imageThumbnailContainer: {
    position: 'relative',
    marginRight: 10,
  },
  imageThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f44336',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  queueSection: {
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  queueStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  queueStat: {
    alignItems: 'center',
  },
  queueStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  queueStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  failedText: {
    color: '#f44336',
  },
  completedText: {
    color: '#4CAF50',
  },
  queueActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  queueButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  processButton: {
    backgroundColor: '#2196F3',
  },
  clearQueueButton: {
    backgroundColor: '#6c757d',
  },
  queueButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  recordingText: {
    marginTop: 10,
    color: '#f44336',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
