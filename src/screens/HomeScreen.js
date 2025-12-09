import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { fetchProjects } from '../services/kolmoApiService';

export default function HomeScreen({ navigation }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const projectList = await fetchProjects();
      setProjects(projectList);
      if (projectList.length > 0) {
        setSelectedProject(projectList[0]);
      }
    } catch (err) {
      setError(err.message);
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaptureReceipt = () => {
    if (!selectedProject) {
      Alert.alert('Select Project', 'Please select a project before capturing a receipt.');
      return;
    }
    navigation.navigate('Camera', { selectedProject });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Kolmo Mobile App</Text>
        <Text style={styles.subtitle}>Capture receipts, document sites, and track time automatically</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Project</Text>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.loadingText}>Loading projects...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadProjects}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : projects.length === 0 ? (
            <Text style={styles.noProjectsText}>No active projects found</Text>
          ) : (
            <View style={styles.projectList}>
              {projects.map((project) => {
                const projectId = project.id || project._id;
                const selectedId = selectedProject?.id || selectedProject?._id;
                const isSelected = selectedId === projectId;
                return (
                <TouchableOpacity
                  key={projectId}
                  style={[
                    styles.projectItem,
                    isSelected && styles.projectItemSelected,
                  ]}
                  onPress={() => setSelectedProject(project)}
                >
                  <Text
                    style={[
                      styles.projectName,
                      isSelected && styles.projectNameSelected,
                    ]}
                  >
                    {project.name || project.title || `Project ${project.id}`}
                  </Text>
                  {project.client && (
                    <Text style={styles.projectClient}>{project.client}</Text>
                  )}
                </TouchableOpacity>
              );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receipt Management</Text>
          <TouchableOpacity 
            style={[styles.button, !selectedProject && styles.buttonDisabled]}
            onPress={handleCaptureReceipt}
            disabled={!selectedProject}
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
    marginBottom: 30,
    textAlign: 'center',
    color: '#666',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 15,
    color: '#444',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#f44336',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  noProjectsText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    padding: 20,
  },
  projectList: {
    marginBottom: 10,
  },
  projectItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  projectItemSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0fff0',
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  projectNameSelected: {
    color: '#4CAF50',
  },
  projectClient: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
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
  buttonDisabled: {
    backgroundColor: '#ccc',
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
