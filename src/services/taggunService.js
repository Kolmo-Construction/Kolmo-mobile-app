import axios from 'axios';

// In a real implementation, you would use your backend endpoint
// to avoid exposing your Taggun API key in the mobile app
const API_BASE_URL = 'https://your-backend.com/api'; // Replace with your backend URL

/**
 * Process a receipt image through Taggun OCR API
 * @param {string} imageUri - Local URI of the image to process
 * @param {Object} options - Additional options for Taggun API
 * @returns {Promise<Object>} - Parsed receipt data
 */
export const processReceiptImage = async (imageUri, options = {}) => {
  try {
    // For security, always send images through your own backend
    // This prevents exposing your Taggun API key in the app
    
    // Create FormData to send the image
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'receipt.jpg',
    });
    
    // Add any additional options
    if (options.language) {
      formData.append('language', options.language);
    }
    if (options.currency) {
      formData.append('currency', options.currency);
    }

    // This is where you would make the actual API call to your backend
    // const response = await axios.post(`${API_BASE_URL}/receipts/process`, formData, {
    //   headers: {
    //     'Content-Type': 'multipart/form-data',
    //   },
    // });
    
    // For now, return mock data
    return await mockTaggunResponse(imageUri);
    
  } catch (error) {
    console.error('Error processing receipt:', error);
    throw new Error('Failed to process receipt image');
  }
};

/**
 * Mock Taggun response for development
 */
const mockTaggunResponse = async (imageUri) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return mock data that matches Taggun's response structure
  return {
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
    ],
    confidence: 0.89,
  };
};

/**
 * Normalize Taggun response to a simpler format for the app
 */
export const normalizeReceiptData = (taggunResponse) => {
  if (!taggunResponse) return null;
  
  return {
    merchant: taggunResponse.merchant?.name || '',
    total: taggunResponse.totalAmount?.data?.toString() || '',
    tax: taggunResponse.taxAmount?.data?.toString() || '',
    currency: taggunResponse.currency || 'USD',
    date: taggunResponse.date?.data || '',
    time: taggunResponse.time?.data?.split(':').slice(0, 2).join(':') || '',
    lineItems: taggunResponse.lineItems || [],
    confidence: taggunResponse.confidence || 0,
  };
};
