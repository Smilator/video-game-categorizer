const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api';

class DatabaseAPI {
  async loadPlatformData() {
    try {
      const response = await fetch(`${API_BASE_URL}/platform-data`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error loading platform data:', error);
      throw new Error('Failed to load platform data from database');
    }
  }

  async savePlatformData(platformData) {
    try {
      const response = await fetch(`${API_BASE_URL}/platform-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ platformData }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error saving platform data:', error);
      throw new Error('Failed to save platform data to database');
    }
  }

  async updatePlatformData(platformId, favorites, deleted) {
    try {
      const response = await fetch(`${API_BASE_URL}/platform-data/${platformId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ favorites, deleted }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating platform data:', error);
      throw new Error('Failed to update platform data in database');
    }
  }

  async deletePlatformData(platformId) {
    try {
      const response = await fetch(`${API_BASE_URL}/platform-data/${platformId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting platform data:', error);
      throw new Error('Failed to delete platform data from database');
    }
  }
}

export default new DatabaseAPI(); 