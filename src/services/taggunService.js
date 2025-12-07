import axios from 'axios';

// Your backend API endpoint
// In production, this should be configured via environment variables
const BACKEND_API_URL = process.env.EXPO_PUBLIC_BACKEND_API_URL || 'https://your-backend.com/api';

/**
 * Send receipt image to your backend for processing with Taggun OCR
 * @param {string} imageUri - Local URI of the image to process
 * @param {Object} metadata - Additional metadata (projectId, userId, etc.)
 * @param {Object} options - Additional options for Taggun API
 * @returns {Promise<Object>} - Parsed receipt data from your backend
 */
export const processReceiptImage = async (imageUri, metadata = {}, options = {}) => {
  try {
    // Create FormData to send the image and metadata to your backend
    const formData = new FormData();
    
    // Extract filename from URI
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    // Append the image file
    formData.append('receiptImage', {
      uri: imageUri,
      type: type,
      name: filename || 'receipt.jpg',
    });
    
    // Append metadata as JSON string
    formData.append('metadata', JSON.stringify({
      projectId: metadata.projectId || null,
      userId: metadata.userId || null,
      location: metadata.location || null,
      timestamp: metadata.timestamp || new Date().toISOString(),
      // Add any other metadata fields your backend expects
      ...metadata
    }));
    
    // Append any additional Taggun options
    if (options.language) {
      formData.append('language', options.language);
    }
    if (options.currency) {
      formData.append('currency', options.currency);
    }
    
    // Make the API call to YOUR backend
    const response = await axios.post(`${BACKEND_API_URL}/receipts/process`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        // Add authentication header if needed
        // 'Authorization': `Bearer ${userToken}`,
      },
      timeout: 30000, // 30 seconds timeout
    });

    // Your backend should return normalized receipt data
    return response.data;
    
  } catch (error) {
    console.error('Error sending receipt to backend:', error);
    
    // Provide user-friendly error messages
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Backend API error response:', error.response.data);
      throw new Error(`Backend error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('No response received from server. Please check your network connection.');
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error(`Failed to process receipt: ${error.message}`);
    }
  }
};

/**
 * Mock backend response for development (when no backend is available)
 */
const mockBackendResponse = async (imageUri, metadata) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Return mock data that your backend would return
  return {
    success: true,
    receiptId: `mock_${Date.now()}`,
    data: {
      merchant: {
        name: 'Sample Electronics Store',
        confidence: 0.92,
      },
      totalAmount: {
        data: 299.99,
        confidence: 0.95,
      },
      taxAmount: {
        data: 24.00,
        confidence: 0.88,
      },
      currency: 'USD',
      date: {
        data: new Date().toISOString().split('T')[0],
        confidence: 0.90,
      },
      time: {
        data: '14:30:00',
        confidence: 0.85,
      },
      lineItems: [
        {
          description: 'Wireless Headphones',
          quantity: 1,
          amount: 199.99,
        },
        {
          description: 'Screen Protector',
          quantity: 2,
          amount: 50.00,
        },
        {
          description: 'Shipping Fee',
          quantity: 1,
          amount: 9.99,
        },
      ],
      confidence: 0.89,
    },
    metadata: {
      projectId: metadata?.projectId || 'default-project',
      processedAt: new Date().toISOString(),
      ...metadata
    }
  };
};

/**
 * Normalize receipt data to a simpler format for the app
 * This should match what your backend returns
 */
export const normalizeReceiptData = (backendResponse) => {
  if (!backendResponse || !backendResponse.data) return null;
  
  const taggunResponse = backendResponse.data;
  
  return {
    merchant: taggunResponse.merchant?.name || '',
    total: taggunResponse.totalAmount?.data?.toString() || '',
    tax: taggunResponse.taxAmount?.data?.toString() || '',
    currency: taggunResponse.currency || 'USD',
    date: taggunResponse.date?.data || '',
    time: taggunResponse.time?.data?.split(':').slice(0, 2).join(':') || '',
    lineItems: taggunResponse.lineItems || [],
    confidence: taggunResponse.confidence || 0,
    receiptId: backendResponse.receiptId,
    metadata: backendResponse.metadata || {},
  };
};

// Fallback to mock if no backend URL is configured
if (!process.env.EXPO_PUBLIC_BACKEND_API_URL || process.env.EXPO_PUBLIC_BACKEND_API_URL === 'https://your-backend.com/api') {
  console.warn('Backend API URL not configured. Using mock data for development.');
  // Override the function to use mock data
  const originalProcessReceiptImage = processReceiptImage;
  export const processReceiptImage = async (imageUri, metadata = {}, options = {}) => {
    console.log('Using mock backend data (no backend URL configured)');
    return await mockBackendResponse(imageUri, metadata);
  };
}
