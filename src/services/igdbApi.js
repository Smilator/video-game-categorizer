import axios from 'axios';

// Backend API base URL
const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api';

class IGDBAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async getPlatforms() {
    try {
      const response = await axios.get(`${this.baseURL}/platforms`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch platforms:', error);
      throw new Error('Failed to load platforms. Please check if the backend server is running.');
    }
  }

  async getGamesByPlatform(platformId, offset = 0, limit = 50) {
    try {
      const response = await axios.get(`${this.baseURL}/games/${platformId}`, {
        params: { offset, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch games:', error);
      throw new Error('Failed to load games. Please try again.');
    }
  }

  async searchGames(name, limit = 10) {
    try {
      const response = await axios.get(`${this.baseURL}/search-games`, {
        params: { name, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to search games:', error);
      throw new Error('Failed to search games. Please try again.');
    }
  }

  getCoverImageUrl(imageId, size = 'cover_big') {
    if (!imageId) return null;
    return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
  }
}

// Create a singleton instance
const igdbApi = new IGDBAPI();

export default igdbApi; 