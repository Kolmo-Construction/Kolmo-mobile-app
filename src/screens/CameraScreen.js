import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { Camera, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors } from '../theme';

export default function CameraScreen({ navigation, route }) {
  const { selectedProject } = route.params || {};
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      setIsProcessing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync();
        
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        navigation.navigate('Review', { 
          imageUri: manipulatedImage.uri,
          selectedProject: selectedProject,
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to capture image: ' + error.message);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <SafeAreaView style={styles.container}>
      {selectedProject && (
        <View style={styles.projectBanner}>
          <Text style={styles.projectBannerText}>
            Project: {selectedProject.name || selectedProject.title || `Project ${selectedProject.id}`}
          </Text>
        </View>
      )}
      <Camera style={styles.camera} type={facing} ref={cameraRef}>
        <View style={styles.overlay}>
          <View style={styles.guideFrame} />
          <Text style={styles.guideText}>Align receipt within the frame</Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
            <Text style={styles.flipButtonText}>Flip</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.captureButton} 
            onPress={takePicture}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </TouchableOpacity>
          <View style={styles.placeholder} />
        </View>
      </Camera>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.foreground,
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
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  guideFrame: {
    width: 300,
    height: 400,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  guideText: {
    color: colors.white,
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.primary,
  },
  flipButton: {
    padding: 15,
    backgroundColor: colors.secondary,
    borderRadius: 5,
  },
  flipButtonText: {
    color: colors.white,
    fontSize: 16,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
  },
  placeholder: {
    width: 60,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: colors.foreground,
    padding: 20,
  },
  button: {
    backgroundColor: colors.accent,
    padding: 15,
    borderRadius: 5,
    marginHorizontal: 20,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    textAlign: 'center',
  },
});
