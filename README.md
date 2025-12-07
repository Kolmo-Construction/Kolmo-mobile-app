# Kolmo Mobile App

A cross-platform mobile application (iOS and Android) built with React Native and Expo that allows users to capture and digitize receipts using their phone camera. The app integrates with the Taggun OCR API to automatically extract structured data from receipt images, turning paper receipts into usable, searchable digital records.

## Core User Flow

### 1. Capture a Receipt
- The user opens the app and uses the built-in camera to take a photo of a receipt.
- The app offers basic guidance (e.g., align edges, avoid glare) and a preview screen so the user can confirm or retake the photo.

### 2. Process the Image
- The app compresses and optionally crops the image locally to reduce upload size while preserving text clarity.
- The image is securely sent to a backend service, which then forwards it to the Taggun API along with any required metadata.

### 3. Extract Receipt Data
- Taggun processes the receipt image and returns structured data such as:
  - Merchant name
  - Total amount and tax
  - Currency
  - Purchase date and time
  - Optional line items (if enabled)
- The backend normalizes this payload and returns a clean JSON response to the mobile app.

### 4. Review & Edit
- The app displays the parsed receipt details in an editable form.
- The user can correct any fields (e.g., totals, dates, merchant name) if OCR confidence is low or the receipt is unclear.

### 5. Save & View History
- The finalized receipt is stored in the app’s data store (and optionally synced to a remote backend).
- Users can browse a list of past receipts, view details, and search or filter by date, merchant, or amount.

## Site Photos & Voice Notes Upload

This feature lets users capture or upload site-related images (not receipts), attach voice notes, and send everything to the backend while preserving full metadata.

### Purpose
Enable users on job sites to visually and verbally document work progress, issues, and conditions, with rich context (location, time, device metadata), so the backend can later process, classify, and analyze this content.

### User Flow
1. **Capture or upload image**
   - From a “Site Photos” section, user can:
     - Take a new picture using the camera, or
     - Select an existing photo from the device gallery.
   - The app preserves the original image metadata (EXIF), including:
     - Timestamp
     - GPS coordinates (if available)
     - Orientation, device info, etc.

2. **Add optional voice note**
   - After selecting an image, user can record a short voice note.
   - The audio clip is attached to that image as a piece of metadata.
   - Multiple images can each have their own notes, or one note per “entry” depending on your design.

3. **Add basic tags / description (optional)**
   - User can optionally add:
     - Text description
     - Project / job site reference
     - Simple tags (e.g., “issue”, “completion”, “inspection”).

4. **Upload to backend**
   - App sends:
     - Original image file (no metadata stripping)
     - Voice note audio file
     - Metadata payload:
       - EXIF info (time, GPS, device)
       - User-entered tags/description
       - Related job site / TimeZone session ID (if applicable)
   - Upload supports queued / retry behavior if offline.

### Backend Expectations
- Receive and store:
  - Raw image
  - Raw audio
  - Metadata (JSON)
- Backend can:
  - Run image analysis (e.g., classification, safety checks)
  - Transcribe voice notes
  - Attach everything to a project, site, or time log record

### Outcome
The result is a structured “site entry” that combines:
- Photo + full metadata
- Voice context
- Optional tags
All ready for downstream processing, reporting, or audits.

## TimeZone: Onsite Auto Check-in & Check-out

TimeZone is the feature that automatically tracks when a user is physically present at a defined job site, and logs their working sessions without manual start/stop (or with minimal intervention).

### Purpose
Provide automatic, location-based time tracking for workers on job sites, so their time logs are accurate and require minimal effort.

### Job Site Setup
1. **Define job sites**
   - User or admin can create “TimeZone sites” with:
     - Name (e.g., “Site A – Warehouse”, “Client X HQ”)
     - GPS coordinates (center point)
     - Radius (e.g., 100–200 meters)
   - Sites may be stored locally and/or synced from backend.

2. **Configure TimeZone behavior**
   - User can toggle TimeZone on/off globally.
   - Optional preferences:
     - Minimum duration to count a session (e.g., ignore visits under 5–10 minutes).
     - Workday boundaries (e.g., day summary).

### Automatic Presence Tracking
Once TimeZone is enabled:

1. **Location monitoring**
   - The app periodically checks the user’s location in the background (within platform limits).
   - For each check, the app determines if the user is:
     - Inside any defined TimeZone radius, or
     - Outside all of them.

2. **Session creation & update**
   - When the user enters a TimeZone:
     - App creates a new time session with:
       - site_id
       - check_in_time (timestamp)
   - When the user leaves a TimeZone and stays outside for a configured buffer (e.g., 5–10 minutes):
     - App sets check_out_time for that session.
   - If the user moves between defined sites, sessions close and new ones open accordingly.

3. **Manual override (optional)**
   - Users can edit or confirm sessions:
     - Adjust start/end times if needed.
     - Mark a session as break / non-billable / etc. if you want that later.

## Key Features
- **Cross-platform support** for iOS and Android using React Native + Expo
- **Camera integration** for capturing receipts directly in the app
- **Client-side image compression** to reduce upload time and bandwidth
- **Secure integration** with a backend service that communicates with the Taggun OCR API
- **Automatic extraction** of key receipt fields with confidence scores
- **Editable confirmation screen** so users can fix OCR mistakes
- **Site Photos & Voice Notes Upload** for capturing job site images and audio recordings with full metadata preservation
- **TimeZone Auto Check-in/Check-out** for automatic location-based time tracking at job sites

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (if using Expo)
- iOS Simulator (for macOS) or Android Studio (for Android development)

### Installation
1. Clone the repository
   ```bash
   git clone https://github.com/your-username/kolmo-mobile-app.git
   ```
2. Navigate to the project directory
   ```bash
   cd kolmo-mobile-app
   ```
3. Install dependencies
   ```bash
   npm install
   ```
4. Start the development server
   ```bash
   npx expo start
   ```
5. Run on your preferred platform
   - Press `i` to open iOS simulator
   - Press `a` to open Android emulator
   - Scan the QR code with the Expo Go app on your physical device

## Backend Integration

This mobile app is designed to work with your backend service, which handles communication with the Taggun OCR API. The app never communicates directly with Taggun - all receipt images are sent to your backend, which adds the necessary API key and forwards the request.

### Backend Requirements

Your backend must implement the following endpoints:

1. **POST /api/receipts/process**
   - Accepts multipart/form-data with:
     - `receiptImage`: The image file
     - `metadata`: JSON string containing:
       - `projectId`: Identifier for the project this receipt belongs to
       - `userId`: (Optional) User identifier
       - `timestamp`: When the receipt was captured
       - Additional custom metadata
   - Forwards the image to Taggun OCR API with your API key
   - Normalizes the Taggun response
   - Stores the receipt data in your database
   - Returns a JSON response with:
     ```json
     {
       "success": true,
       "receiptId": "unique-id",
       "data": {
         // Normalized receipt data from Taggun
       },
       "metadata": {
         // Echo back the metadata sent by the app
       }
     }
     ```

2. **Other endpoints** for:
   - Site photos and voice notes upload
   - TimeZone session management
   - Receipt history retrieval
   - Project management

### App-to-Backend Communication

The app sends the following with each receipt:
- **Image file**: Compressed and optimized for OCR
- **Metadata**: Including project ID for categorization
- **User context**: (If authenticated)

### Development Setup

1. **Configure your backend URL**:
   Create a `.env` file:
   ```
   EXPO_PUBLIC_BACKEND_API_URL=https://your-backend.com/api
   ```

2. **Run without a backend**:
   If no backend URL is configured, the app will use mock data for development.

### Security Considerations
- Your backend should handle Taggun API key security
- Implement authentication for your endpoints
- Validate and sanitize all incoming data
- Implement rate limiting

## Contributing
Please read our contributing guidelines before submitting pull requests.

## License
This project is licensed under the MIT License.
