# Kolmo Mobile App

## Overview
A React Native / Expo mobile application for capturing receipts, documenting sites, and tracking time automatically. This app runs as a web application in the Replit environment.

## Current State
- Application is running and functional
- Web interface available on port 5000
- Uses proxy server to forward port 5000 to Expo's webpack dev server on port 19006

## Project Architecture

### Technology Stack
- **Framework**: React Native with Expo SDK 54
- **Web Support**: expo-web with webpack bundler
- **Navigation**: React Navigation (native-stack)
- **Storage**: AsyncStorage

### File Structure
```
├── App.js                 # Main app entry with navigation
├── src/
│   ├── screens/           # Screen components
│   │   ├── HomeScreen.js
│   │   ├── CameraScreen.js
│   │   ├── ReviewScreen.js
│   │   ├── HistoryScreen.js
│   │   ├── SitePhotosScreen.js
│   │   └── TimeZoneScreen.js
│   └── services/          # Business logic services
│       ├── googleDriveService.js
│       ├── taggunService.js
│       └── uploadQueueService.js
├── proxy.js               # Port forwarding for Replit
├── webpack.config.js      # Expo web configuration
├── app.json               # Expo configuration
├── package.json           # Dependencies
└── babel.config.js        # Babel configuration
```

### Key Features
1. **Receipt Management**: Capture and review receipts
2. **Site Documentation**: Take photos and voice notes for site documentation
3. **Time Tracking**: Automatic timezone-based check-in system

## Running the Application

### Development
The app is configured to run via the "Expo Web" workflow which:
1. Starts Expo's webpack dev server on port 19006
2. Proxies requests from port 5000 to port 19006

### Commands
- `npm run web` - Start the web development server (with proxy)
- `npm run start` - Start Expo development server
- `npm run android` - Start Android development
- `npm run ios` - Start iOS development

## Configuration Notes

### Services Requiring Setup
The app expects certain API configurations that are not yet set up:
- **Google Drive API**: For cloud storage integration
- **Taggun API**: For receipt scanning
- Backend API URL for production use

### Warnings
The project shows package version warnings for expo modules. These are compatibility warnings and don't affect basic functionality.

## User Preferences
(None recorded yet)

## Recent Changes
- December 2024: Initial setup for Replit environment
  - Added proxy.js for port forwarding (5000 -> 19006)
  - Configured webpack for Replit's proxy requirements
  - Installed missing dependencies (expo-asset, babel-preset-expo)
