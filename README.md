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

## Key Features
- **Cross-platform support** for iOS and Android using React Native + Expo
- **Camera integration** for capturing receipts directly in the app
- **Client-side image compression** to reduce upload time and bandwidth
- **Secure integration** with a backend service that communicates with the Taggun OCR API
- **Automatic extraction** of key receipt fields with confidence scores
- **Editable confirmation screen** so users can fix OCR mistakes

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
This mobile app requires a backend service to securely communicate with the Taggun OCR API. Ensure your backend is properly configured with the necessary API keys and endpoints before running the app.

## Contributing
Please read our contributing guidelines before submitting pull requests.

## License
This project is licensed under the MIT License.
