import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Google OAuth configuration
// You need to set up a project in Google Cloud Console:
// 1. Create OAuth 2.0 credentials for iOS/Android/Web
// 2. Add authorized redirect URIs
// 3. Enable Google Drive API

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID';
const GOOGLE_CLIENT_SECRET = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'your.app.scheme', // Replace with your app's scheme
  path: 'oauth2redirect'
});

// Google Drive folder ID where files will be uploaded
const GOOGLE_DRIVE_FOLDER_ID = '1ofiEOheVXs0qOlWcRY6c7T0sdW17xxzw';

// Scopes for Google Drive access
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file', // Create and edit files
  'https://www.googleapis.com/auth/drive.metadata.readonly', // View metadata
];

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

/**
 * Authenticate with Google OAuth
 * @returns {Promise<Object>} - Access token and user info
 */
export const authenticateWithGoogle = async () => {
  try {
    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: SCOPES,
      redirectUri: REDIRECT_URI,
      usePKCE: true,
    });

    const result = await request.promptAsync(discovery);

    if (result.type === 'success') {
      return {
        accessToken: result.params.access_token,
        refreshToken: result.params.refresh_token,
        expiresIn: result.params.expires_in,
      };
    } else {
      throw new Error('Authentication cancelled or failed');
    }
  } catch (error) {
    console.error('Google authentication error:', error);
    throw error;
  }
};

/**
 * Upload a file to Google Drive
 * @param {string} accessToken - Google OAuth access token
 * @param {Object} file - File object with uri, name, type
 * @param {Object} metadata - Additional metadata to include in file description
 * @param {string} projectId - Project identifier for organization
 * @returns {Promise<Object>} - Upload response with file ID
 */
export const uploadToGoogleDrive = async (accessToken, file, metadata = {}, projectId = 'default') => {
  try {
    // Create metadata for the file
    const fileMetadata = {
      name: file.name || `site_photo_${Date.now()}.jpg`,
      parents: [GOOGLE_DRIVE_FOLDER_ID],
      description: JSON.stringify({
        projectId,
        uploadTimestamp: new Date().toISOString(),
        ...metadata,
      }),
      mimeType: file.type || 'image/jpeg',
    };

    // For small files (<5MB), we can use simple upload
    const form = new FormData();
    form.append('metadata', JSON.stringify(fileMetadata), {
      type: 'application/json',
    });
    
    // Convert file URI to blob
    const response = await fetch(file.uri);
    const blob = await response.blob();
    
    form.append('file', blob, {
      type: file.type || 'image/jpeg',
      filename: file.name || `site_photo_${Date.now()}.jpg`,
    });

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: form,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Google Drive upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const result = await uploadResponse.json();
    return {
      success: true,
      fileId: result.id,
      webViewLink: result.webViewLink,
      name: result.name,
    };
  } catch (error) {
    console.error('Google Drive upload error:', error);
    throw error;
  }
};

/**
 * Create a folder for a specific project in Google Drive
 * @param {string} accessToken - Google OAuth access token
 * @param {string} projectId - Project identifier
 * @returns {Promise<Object>} - Folder creation response
 */
export const createProjectFolder = async (accessToken, projectId) => {
  try {
    const folderMetadata = {
      name: `Project_${projectId}`,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [GOOGLE_DRIVE_FOLDER_ID],
      description: `Project folder for ${projectId}`,
    };

    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(folderMetadata),
    });

    if (!response.ok) {
      throw new Error(`Failed to create folder: ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      folderId: result.id,
      name: result.name,
    };
  } catch (error) {
    console.error('Create folder error:', error);
    throw error;
  }
};

/**
 * Check if user is authenticated and token is valid
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<boolean>} - True if token is valid
 */
export const validateToken = async (accessToken) => {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Mock implementation for development
const mockGoogleDriveUpload = async (file, metadata, projectId) => {
  console.log('Mock Google Drive upload:', { file, metadata, projectId });
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    success: true,
    fileId: `mock_${Date.now()}`,
    webViewLink: 'https://drive.google.com/mock',
    name: file.name || 'mock_file.jpg',
  };
};

// Fallback to mock if no client ID is configured
if (!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID === 'YOUR_CLIENT_ID') {
  console.warn('Google Client ID not configured. Using mock Google Drive service.');
  
  export const authenticateWithGoogle = async () => {
    console.log('Mock Google authentication');
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token',
      expiresIn: 3600,
    };
  };
  
  export const uploadToGoogleDrive = async (accessToken, file, metadata = {}, projectId = 'default') => {
    console.log('Mock Google Drive upload');
    return await mockGoogleDriveUpload(file, metadata, projectId);
  };
  
  export const createProjectFolder = async (accessToken, projectId) => {
    console.log('Mock folder creation');
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      folderId: `mock_folder_${projectId}`,
      name: `Project_${projectId}`,
    };
  };
}
