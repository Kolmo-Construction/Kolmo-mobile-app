import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SitePhotosScreen from './src/screens/SitePhotosScreen';
import TimeZoneScreen from './src/screens/TimeZoneScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Kolmo Receipt Scanner' }} />
        <Stack.Screen name="Camera" component={CameraScreen} options={{ title: 'Capture Receipt' }} />
        <Stack.Screen name="Review" component={ReviewScreen} options={{ title: 'Review & Edit' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Receipt History' }} />
        <Stack.Screen name="SitePhotos" component={SitePhotosScreen} options={{ title: 'Site Photos & Voice Notes' }} />
        <Stack.Screen name="TimeZone" component={TimeZoneScreen} options={{ title: 'TimeZone Auto Check-in' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
