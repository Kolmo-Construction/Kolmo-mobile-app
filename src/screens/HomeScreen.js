import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { fetchProjects } from '../services/kolmoApiService';
import { logout } from '../services/authService';
import { colors } from '../theme';

export default function HomeScreen({ navigation, route }) {
  const { currentUser, onLogout } = route.params || {};
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

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            if (onLogout) {
              onLogout();
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/kolmo-logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.subtitle}>Capture receipts, document sites, and track time</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Project</Text>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.accent} />
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

        {currentUser && (
          <View style={styles.userSection}>
            <Text style={styles.userInfo}>
              Logged in as: {currentUser.firstName} {currentUser.lastName}
            </Text>
            <Text style={styles.userEmail}>{currentUser.email}</Text>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.muted,
  },
  content: {
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 150,
    height: 150,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: colors.primary,
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
    color: colors.secondary,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  noProjectsText: {
    textAlign: 'center',
    color: colors.secondary,
    fontSize: 14,
    padding: 20,
  },
  projectList: {
    marginBottom: 10,
  },
  projectItem: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  projectItemSelected: {
    borderColor: colors.accent,
    backgroundColor: '#fff9f0',
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  projectNameSelected: {
    color: colors.accent,
  },
  projectClient: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
  },
  button: {
    backgroundColor: colors.accent,
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
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  secondaryButtonText: {
    color: colors.accent,
  },
  siteButton: {
    backgroundColor: colors.secondary,
  },
  timeButton: {
    backgroundColor: colors.primary,
  },
  userSection: {
    marginTop: 30,
    padding: 20,
    backgroundColor: colors.white,
    borderRadius: 10,
    alignItems: 'center',
  },
  userInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 15,
  },
  logoutButton: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
});
