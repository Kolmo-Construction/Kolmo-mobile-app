import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

const AUTH_STORAGE_KEY = '@kolmo_user_auth';

// Get base URL for authentication
const getBaseURL = () => {
  if (Platform.OS === 'web') {
    return '/api';
  }
  return process.env.EXPO_PUBLIC_KOLMO_API_URL || '/api';
};

/**
 * Login with username and password
 */
export const login = async (email, password) => {
  try {
    const baseURL = getBaseURL();
    console.log('Attempting login at:', `${baseURL}/auth/login`);

    const response = await axios.post(`${baseURL}/auth/login`, {
      email,
      password,
    });

    if (response.data.success && response.data.user && response.data.apiKey) {
      const userData = {
        user: response.data.user,
        apiKey: response.data.apiKey,
        loginTime: new Date().toISOString(),
      };

      // Store user data and API key
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));

      console.log('Login successful:', response.data.user.email);
      return userData;
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    console.error('Login error:', error);
    if (error.response?.status === 401) {
      throw new Error('Invalid email or password');
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error('Login failed. Please check your connection and try again.');
    }
  }
};

/**
 * Logout and clear stored credentials
 */
export const logout = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    console.log('Logout successful');
  } catch (error) {
    console.error('Logout error:', error);
  }
};

/**
 * Get currently logged in user
 */
export const getCurrentUser = async () => {
  try {
    const userData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Check if user is logged in
 */
export const isAuthenticated = async () => {
  const userData = await getCurrentUser();
  return userData !== null;
};

/**
 * Get the API key for the current user
 */
export const getApiKey = async () => {
  const userData = await getCurrentUser();
  return userData?.apiKey || process.env.EXPO_PUBLIC_KOLMO_API_KEY;
};

export default {
  login,
  logout,
  getCurrentUser,
  isAuthenticated,
  getApiKey,
};
