import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SitePhotosScreen from './src/screens/SitePhotosScreen';
import TimeZoneScreen from './src/screens/TimeZoneScreen';
import { getCurrentUser } from './src/services/authService';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const userData = await getCurrentUser();
      if (userData) {
        setIsAuthenticated(true);
        setCurrentUser(userData.user);
        console.log('User already logged in:', userData.user.email);
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (userData) => {
    setIsAuthenticated(true);
    setCurrentUser(userData.user);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.muted }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.primary,
          },
          headerTintColor: colors.white,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: `Kolmo - ${currentUser?.firstName || 'User'}` }}
          initialParams={{ currentUser, onLogout: handleLogout }}
        />
        <Stack.Screen name="Camera" component={CameraScreen} options={{ title: 'Capture Receipt' }} />
        <Stack.Screen name="Review" component={ReviewScreen} options={{ title: 'Review & Edit' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Receipt History' }} />
        <Stack.Screen name="SitePhotos" component={SitePhotosScreen} options={{ title: 'Site Photos' }} />
        <Stack.Screen name="TimeZone" component={TimeZoneScreen} options={{ title: 'TimeZone' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
