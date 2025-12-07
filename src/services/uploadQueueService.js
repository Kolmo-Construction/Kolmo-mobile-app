import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import * as FileSystem from 'expo-file-system';

const UPLOAD_QUEUE_KEY = 'upload_queue';
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Queue item structure:
 * {
 *   id: string,
 *   type: 'image' | 'audio' | 'metadata',
 *   file: { uri, name, type },
 *   metadata: Object,
 *   projectId: string,
 *   attempts: number,
 *   createdAt: string,
 *   lastAttempt: string | null,
 *   status: 'pending' | 'processing' | 'failed' | 'completed'
 * }
 */

/**
 * Add an item to the upload queue
 */
export const addToUploadQueue = async (item) => {
  try {
    const queue = await getUploadQueue();
    const newItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...item,
      attempts: 0,
      createdAt: new Date().toISOString(),
      lastAttempt: null,
      status: 'pending'
    };
    
    queue.push(newItem);
    await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(queue));
    return newItem;
  } catch (error) {
    console.error('Error adding to upload queue:', error);
    throw error;
  }
};

/**
 * Get the current upload queue
 */
export const getUploadQueue = async () => {
  try {
    const queueJson = await AsyncStorage.getItem(UPLOAD_QUEUE_KEY);
    return queueJson ? JSON.parse(queueJson) : [];
  } catch (error) {
    console.error('Error getting upload queue:', error);
    return [];
  }
};

/**
 * Update an item in the queue
 */
export const updateQueueItem = async (id, updates) => {
  try {
    const queue = await getUploadQueue();
    const index = queue.findIndex(item => item.id === id);
    
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };
      await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(queue));
      return queue[index];
    }
    return null;
  } catch (error) {
    console.error('Error updating queue item:', error);
    throw error;
  }
};

/**
 * Remove an item from the queue
 */
export const removeFromQueue = async (id) => {
  try {
    const queue = await getUploadQueue();
    const filteredQueue = queue.filter(item => item.id !== id);
    await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(filteredQueue));
    return true;
  } catch (error) {
    console.error('Error removing from queue:', error);
    return false;
  }
};

/**
 * Process the upload queue
 */
export const processUploadQueue = async (uploadFunction, onProgress) => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected) {
      console.log('No network connection, skipping queue processing');
      return { processed: 0, failed: 0 };
    }
    
    const queue = await getUploadQueue();
    const pendingItems = queue.filter(item => item.status === 'pending' || item.status === 'failed');
    
    let processed = 0;
    let failed = 0;
    
    for (const item of pendingItems) {
      try {
        // Update status to processing
        await updateQueueItem(item.id, { 
          status: 'processing',
          lastAttempt: new Date().toISOString(),
          attempts: item.attempts + 1
        });
        
        if (onProgress) {
          onProgress({ item, status: 'processing' });
        }
        
        // Perform the upload
        const result = await uploadFunction(item);
        
        // Mark as completed
        await updateQueueItem(item.id, { 
          status: 'completed',
          result
        });
        
        processed++;
        
        if (onProgress) {
          onProgress({ item, status: 'completed', result });
        }
        
      } catch (error) {
        console.error(`Error processing queue item ${item.id}:`, error);
        
        // Check if we should retry
        const updatedItem = await updateQueueItem(item.id, { 
          status: item.attempts + 1 >= MAX_RETRY_ATTEMPTS ? 'failed' : 'pending',
          lastAttempt: new Date().toISOString(),
          attempts: item.attempts + 1,
          error: error.message
        });
        
        failed++;
        
        if (onProgress) {
          onProgress({ item: updatedItem, status: 'failed', error });
        }
      }
    }
    
    return { processed, failed };
  } catch (error) {
    console.error('Error processing upload queue:', error);
    return { processed: 0, failed: 0 };
  }
};

/**
 * Clear completed items from the queue
 */
export const clearCompletedItems = async () => {
  try {
    const queue = await getUploadQueue();
    const pendingItems = queue.filter(item => item.status !== 'completed');
    await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(pendingItems));
    return pendingItems.length;
  } catch (error) {
    console.error('Error clearing completed items:', error);
    return 0;
  }
};

/**
 * Get queue statistics
 */
export const getQueueStats = async () => {
  const queue = await getUploadQueue();
  return {
    total: queue.length,
    pending: queue.filter(item => item.status === 'pending').length,
    processing: queue.filter(item => item.status === 'processing').length,
    failed: queue.filter(item => item.status === 'failed').length,
    completed: queue.filter(item => item.status === 'completed').length,
  };
};
