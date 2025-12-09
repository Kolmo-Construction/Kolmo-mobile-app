import axios from 'axios';

const kolmoApi = axios.create({
  baseURL: '/api/kolmo',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchProjects = async () => {
  try {
    const response = await kolmoApi.get('/projects');
    const projects = response.data;
    const activeProjects = projects.filter(
      (p) => p.status === 'active' || p.status === 'in-progress' || p.status === 'in_progress' || p.status === 'planning'
    );
    return activeProjects;
  } catch (error) {
    console.error('Error fetching projects:', error);
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

    const response = await axios.post(
      `/api/kolmo/projects/${projectId}/receipts`,
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

export default {
  fetchProjects,
  uploadReceipt,
};
