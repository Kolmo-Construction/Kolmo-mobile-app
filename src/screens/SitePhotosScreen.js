import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, TextInput, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';

export default function SitePhotosScreen({ navigation }) {
  const [image, setImage] = useState(null);
  const [recording, setRecording] = useState(null);
  const [sound, setSound] = useState(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [projectId, setProjectId] = useState('default-project');
  const [location, setLocation] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);

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
    })();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to select photos.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      exif: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      // Try to get more EXIF data using MediaLibrary
      try {
        const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.assetId || asset.id);
        setImage({
          ...asset,
          exif: assetInfo.exif || {},
          location: assetInfo.location,
        });
      } catch (error) {
        console.log('Could not get detailed EXIF:', error);
        setImage(asset);
      }
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera permissions to take photos.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
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
      
      setImage({
        ...asset,
        exif: asset.exif || {},
        location: currentLocation,
      });
    }
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

  const handleUpload = async () => {
    if (!image) {
      Alert.alert('No image', 'Please select or take a photo first.');
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
        location: image.location || location,
        exif: image.exif || {},
        deviceInfo: {
          platform: Platform.OS,
          // Add more device info as needed
        }
      };
      
      // Prepare FormData for backend
      const formData = new FormData();
      
      // Append image
      const filename = image.uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('siteImage', {
        uri: image.uri,
        type: type,
        name: filename || 'site_photo.jpg',
      });
      
      // Append voice note if recorded
      if (sound) {
        const audioUri = sound._uri || sound.uri;
        const audioFilename = audioUri.split('/').pop();
        const audioMatch = /\.(\w+)$/.exec(audioFilename);
        const audioType = audioMatch ? `audio/${audioMatch[1]}` : 'audio/m4a';
        
        formData.append('voiceNote', {
          uri: audioUri,
          type: audioType,
          name: audioFilename || 'voice_note.m4a',
        });
      }
      
      // Append metadata as JSON
      formData.append('metadata', JSON.stringify(metadata));
      
      // Get backend URL from environment
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_API_URL || 'https://your-backend.com/api';
      
      // Make actual API call
      const response = await fetch(`${backendUrl}/site-photos/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          // Add authentication header if needed
          // 'Authorization': `Bearer ${userToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      Alert.alert(
        'Upload Successful',
        `Site photo has been uploaded successfully. ID: ${result.photoId || 'N/A'}`,
        [{ text: 'OK', onPress: () => {
          // Reset form
          setImage(null);
          setDescription('');
          setTags('');
          setSound(null);
        }}]
      );
      
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert(
        'Upload Failed',
        error.message || 'Failed to upload site photo. Please try again.',
        [
          { text: 'Try Again', onPress: () => handleUpload() },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } finally {
      setIsUploading(false);
    }
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
          <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
            <Text style={styles.actionButtonText}>Pick from Gallery</Text>
          </TouchableOpacity>
        </View>

        {image && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: image.uri }} style={styles.image} />
            <Text style={styles.imageInfo}>Image selected</Text>
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

        <View style={styles.uploadSection}>
          <TouchableOpacity 
            style={[styles.uploadButton, (isUploading || !image) && styles.uploadButtonDisabled]} 
            onPress={handleUpload}
            disabled={isUploading || !image}
          >
            {isUploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.uploadButtonText}>Upload to Backend</Text>
            )}
          </TouchableOpacity>
          {!image && (
            <Text style={styles.uploadHelpText}>Select or take a photo first</Text>
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
  uploadButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
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
  recordingText: {
    marginTop: 10,
    color: '#f44336',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
