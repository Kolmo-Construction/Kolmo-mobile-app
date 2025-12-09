import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, Platform, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme';

export default function CameraScreen({ navigation, route }) {
  const { selectedProject } = route.params || {};
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  const handleWebFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUri = e.target.result;
        setPreviewImage(imageUri);
        setIsProcessing(false);
      };
      reader.onerror = () => {
        Alert.alert('Error', 'Failed to read file');
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } else {
      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required to take photos.');
          return;
        }

        setIsProcessing(true);
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          setPreviewImage(result.assets[0].uri);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take photo: ' + error.message);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Media library permission is required to select photos.');
        return;
      }

      setIsProcessing(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPreviewImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const usePhoto = () => {
    if (previewImage) {
      navigation.navigate('Review', {
        imageUri: previewImage,
        selectedProject: selectedProject,
      });
    }
  };

  const retakePhoto = () => {
    setPreviewImage(null);
  };

  if (previewImage) {
    return (
      <SafeAreaView style={styles.container}>
        {selectedProject && (
          <View style={styles.projectBanner}>
            <Text style={styles.projectBannerText}>
              Project: {selectedProject.name || selectedProject.title || `Project ${selectedProject.id}`}
            </Text>
          </View>
        )}
        <View style={styles.previewContainer}>
          <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />
        </View>
        <View style={styles.previewControls}>
          <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.useButton} onPress={usePhoto}>
            <Text style={styles.useButtonText}>Use Photo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {selectedProject && (
        <View style={styles.projectBanner}>
          <Text style={styles.projectBannerText}>
            Project: {selectedProject.name || selectedProject.title || `Project ${selectedProject.id}`}
          </Text>
        </View>
      )}
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.cameraIcon}>📷</Text>
        </View>
        
        <Text style={styles.title}>Capture Receipt</Text>
        <Text style={styles.subtitle}>Take a photo or choose from your gallery</Text>

        {Platform.OS === 'web' && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleWebFileSelect}
            style={{ display: 'none' }}
          />
        )}

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={takePhoto}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {Platform.OS === 'web' ? 'Take Photo / Upload' : 'Take Photo'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={pickFromGallery}
          disabled={isProcessing}
        >
          <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.muted,
  },
  projectBanner: {
    backgroundColor: colors.accent,
    padding: 10,
    alignItems: 'center',
  },
  projectBannerText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cameraIcon: {
    fontSize: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.secondary,
    marginBottom: 40,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    marginBottom: 15,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.white,
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  secondaryButtonText: {
    color: colors.secondary,
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 15,
    paddingHorizontal: 40,
  },
  cancelButtonText: {
    color: colors.secondary,
    fontSize: 16,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: colors.foreground,
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  previewControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: colors.primary,
  },
  retakeButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  retakeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  useButton: {
    backgroundColor: colors.accent,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  useButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
