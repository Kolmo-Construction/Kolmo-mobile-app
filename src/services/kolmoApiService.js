import axios from 'axios';
import { Platform } from 'react-native';
import { getApiKey } from './authService';

// Use environment variable for mobile, fallback to relative path for web
const getBaseURL = () => {
  if (Platform.OS === 'web') {
    return '/api/kolmo';
  }
  return process.env.EXPO_PUBLIC_KOLMO_API_URL || '/api/kolmo';
};

const baseURL = getBaseURL();

console.log('Kolmo API baseURL:', baseURL);

const kolmoApi = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to dynamically add Authorization header
kolmoApi.interceptors.request.use(
  async (config) => {
    const apiKey = await getApiKey();
    if (apiKey) {
      config.headers['Authorization'] = `Bearer ${apiKey}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const fetchProjects = async () => {
  try {
    console.log('Fetching projects from:', `${baseURL}/projects`);
    const response = await kolmoApi.get('/projects');
    let projects = response.data;

    // Handle different response structures
    if (projects.projects) {
      projects = projects.projects;
    } else if (projects.data) {
      projects = projects.data;
    }

    // Ensure projects is an array
    if (!Array.isArray(projects)) {
      console.error('Projects response is not an array:', projects);
      return [];
    }

    console.log('Total projects received:', projects.length);
    projects.forEach(p => console.log(`  - ${p.name}: status="${p.status}"`));

    const activeProjects = projects.filter(
      (p) => p.status === 'active' || p.status === 'in-progress' || p.status === 'in_progress' || p.status === 'planning'
    );

    console.log('Active projects after filtering:', activeProjects.length);
    activeProjects.forEach(p => console.log(`  - ${p.name}`));

    return activeProjects;
  } catch (error) {
    console.error('Error fetching projects:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      url: `${baseURL}/projects`
    });

    if (error.message === 'Network Error') {
      throw new Error(
        `Cannot connect to server at ${baseURL}. Please check:\n` +
        '1. Your device is on the same WiFi network\n' +
        '2. Backend server is running\n' +
        '3. EXPO_PUBLIC_KOLMO_API_URL is set correctly in .env'
      );
    }

    throw new Error(
      error.response?.data?.message || 'Failed to fetch projects. Please try again.'
    );
  }
};

export const uploadReceipt = async (projectId, imageUri, category = null, notes = null) => {
  try {
    const formData = new FormData();

    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: imageUri,
      type: type,
      name: filename || 'receipt.jpg',
    });

    if (category) {
      formData.append('category', category);
    }
    if (notes) {
      formData.append('notes', notes);
    }

    const response = await kolmoApi.post(
      `/projects/${projectId}/receipts`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error uploading receipt:', error);
    throw new Error(
      error.response?.data?.message || 'Failed to upload receipt. Please try again.'
    );
  }
};

export const fetchReceipts = async (projectId) => {
  try {
    console.log('Fetching receipts for project:', projectId);
    const response = await kolmoApi.get(`/projects/${projectId}/receipts`);

    if (response.data.success && response.data.receipts) {
      return response.data.receipts;
    }

    return response.data || [];
  } catch (error) {
    console.error('Error fetching receipts:', error);
    throw new Error(
      error.response?.data?.message || 'Failed to fetch receipts. Please try again.'
    );
  }
};

export default {
  fetchProjects,
  uploadReceipt,
  fetchReceipts,
};
