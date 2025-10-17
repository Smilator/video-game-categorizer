import React, { useState, useEffect, useCallback } from 'react';
import { Download, Upload, Heart, Trash2, Loader2, RotateCcw, Eye, FileText, LogIn, LogOut, User, Zap } from 'lucide-react';
import igdbApi from './services/igdbApi';
import databaseApi from './services/databaseApi';
import GameCard from './components/GameCard';
import Stats from './components/Stats';
import Lists from './components/Lists';

function App() {
  const [platforms, setPlatforms] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [games, setGames] = useState([]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  
  // Per-platform storage for favorites and deleted games
  const [platformData, setPlatformData] = useState({});
  const [processedGames, setProcessedGames] = useState(new Set());
  
  // UI state
  const [showLists, setShowLists] = useState(false);
  const [viewMode, setViewMode] = useState('all');
  const [showCollectedOnly, setShowCollectedOnly] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [xmlImportProgress, setXmlImportProgress] = useState({ current: 0, total: 0, isImporting: false });
  const [fetchedGameIds, setFetchedGameIds] = useState(new Set());

  // Helper functions for favorites and deleted lists
  const favorites = selectedPlatform ? (platformData[selectedPlatform]?.favorites || []) : [];
  const deleted = selectedPlatform ? (platformData[selectedPlatform]?.deleted || []) : [];

  const getFilteredGames = () => {
    if (viewMode === 'favorites') {
      let filteredFavorites = favorites;
      
      // Remove duplicates based on game ID (keep only the first occurrence)
      const uniqueFavorites = [];
      const seenIds = new Set();
      
      filteredFavorites.forEach(game => {
        if (!seenIds.has(game.id)) {
          seenIds.add(game.id);
          uniqueFavorites.push(game);
        }
      });
      
      if (showCollectedOnly) {
        return uniqueFavorites.filter(game => game.collected);
      }
      return uniqueFavorites;
    } else if (viewMode === 'deleted') {
      // Also remove duplicates from deleted list
      const uniqueDeleted = [];
      const seenIds = new Set();
      
      deleted.forEach(game => {
        if (!seenIds.has(game.id)) {
          seenIds.add(game.id);
          uniqueDeleted.push(game);
        }
      });
      
      return uniqueDeleted;
    }
    
    return games;
  };

  // Separate platforms into two categories
  const getPlatformCategories = () => {
    const platformsWithGames = [];
    const platformsWithoutGames = [];
    
    platforms.forEach(platform => {
      const platformId = platform.id.toString();
      const hasProcessedGames = platformData[platformId] && 
        (platformData[platformId].favorites.length > 0 || platformData[platformId].deleted.length > 0);
      
      if (hasProcessedGames) {
        platformsWithGames.push(platform);
      } else {
        platformsWithoutGames.push(platform);
      }
    });
    
    return { platformsWithGames, platformsWithoutGames };
  };

  // Authentication functions
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    
    if (loginForm.username === 'Smilator' && loginForm.password === '123456') {
      setIsAuthenticated(true);
      setCurrentUser(loginForm.username);
      setShowLoginModal(false);
      setLoginForm({ username: '', password: '' });
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('currentUser', loginForm.username);
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('currentUser');
  };

  // Check authentication on app load
  useEffect(() => {
    const savedAuth = localStorage.getItem('isAuthenticated');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedAuth === 'true' && savedUser) {
      setIsAuthenticated(true);
      setCurrentUser(savedUser);
    }
  }, []);

  // Save data to database whenever it changes (only for authenticated users)
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      console.log('Saving to database - platformData:', platformData);
      
      // Try to save to database first
      databaseApi.savePlatformData(platformData).catch(error => {
        console.error('Failed to save to database:', error);
        
        // Fallback to localStorage if database fails
        try {
          localStorage.setItem('platformData', JSON.stringify(platformData));
          console.log('Saved to localStorage as fallback');
        } catch (localStorageError) {
          console.error('Failed to save to localStorage:', localStorageError);
        }
      });
      
      // Also save to localStorage as backup
      try {
        localStorage.setItem('platformData', JSON.stringify(platformData));
      } catch (localStorageError) {
        console.error('Failed to save to localStorage:', localStorageError);
      }
    }
  }, [platformData, isInitialized, isAuthenticated]);

  // Load data from database on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await databaseApi.loadPlatformData();
        console.log('Loaded platform data from database:', data);
        console.log('Platform keys:', Object.keys(data));
        console.log('Nintendo Switch (130) data:', data['130']);
        setPlatformData(data);
      } catch (error) {
        console.error('Failed to load data from database:', error);
        
        // Fallback to localStorage if database fails
        try {
          const localStorageData = localStorage.getItem('platformData');
          if (localStorageData) {
            const parsedData = JSON.parse(localStorageData);
            console.log('Falling back to localStorage data:', parsedData);
            setPlatformData(parsedData);
          } else {
            // If no localStorage data either, try to load from any other available source
            console.log('No localStorage data found, starting with empty data');
            setPlatformData({});
          }
        } catch (localStorageError) {
          console.error('Failed to load from localStorage:', localStorageError);
          setPlatformData({});
        }
      }
    };
    
    loadData();
    setIsInitialized(true);
  }, []);

  // Fetch platforms on component mount
  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      setLoading(true);
      setError(null);
      const platformsData = await igdbApi.getPlatforms();
      setPlatforms(platformsData);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching platforms:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGames = useCallback(async (platformId, offset = 0) => {
    try {
      setIsLoadingMore(true);
      setError(null);
      
      // Get current platform's processed games (favorites + deleted)
      const currentPlatformProcessed = new Set();
      const currentPlatformData = platformData[platformId];
      if (currentPlatformData) {
        currentPlatformData.favorites.forEach(game => currentPlatformProcessed.add(game.id));
        currentPlatformData.deleted.forEach(game => currentPlatformProcessed.add(game.id));
      }
      
      // Also exclude games we've already fetched and shown
      const allExcludedGames = new Set([...currentPlatformProcessed, ...fetchedGameIds]);
      
      // Fetch games from IGDB (50 per batch)
      const gamesData = await igdbApi.getGamesByPlatform(platformId, offset, 50);
      
      if (gamesData.length === 0) {
        // No more games available
        if (offset === 0) {
          setGames([]);
        }
        return;
      }
      
      // Filter out games that have already been processed or fetched
      const unprocessedGames = gamesData.filter(game => !allExcludedGames.has(game.id));
      
      // Add the new game IDs to our fetched set
      const newGameIds = new Set(gamesData.map(game => game.id));
      setFetchedGameIds(prev => new Set([...prev, ...newGameIds]));
      
      if (offset === 0) {
        setGames(unprocessedGames);
        setCurrentOffset(offset + 50);
      } else {
        setGames(prev => [...prev, ...unprocessedGames]);
        setCurrentOffset(offset + 50);
      }
      
      // If we got very few unprocessed games, try to load more immediately
      if (unprocessedGames.length < 10 && gamesData.length === 50) {
        setTimeout(() => {
          fetchGames(platformId, offset + 50);
        }, 200);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching games:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [platformData, fetchedGameIds]);

  const handlePlatformChange = (platformId) => {
    setSelectedPlatform(platformId);
    setGames([]);
    setCurrentOffset(0);
    setFetchedGameIds(new Set()); // Reset fetched games when changing platforms
    setError(null);
    setShowLists(false); // Hide lists when changing platforms
    setShowCollectedOnly(false); // Reset collected filter when changing platforms
    
    if (platformId) {
      // For non-authenticated users, automatically show favorites
      if (!isAuthenticated) {
        setViewMode('favorites');
      } else {
        setViewMode('all'); // Reset view mode when changing platforms
        fetchGames(platformId, 0);
      }
    }
  };

  const handleGameAction = async (game, action) => {
    if (!selectedPlatform || !isAuthenticated) return;

    if (action === 'revert') {
      // Handle revert from favorites or deleted lists
      handleRevertGame(game, viewMode);
      return;
    }

    // Immediately remove game from UI to prevent double-clicks
    setGames(prev => prev.filter(g => g.id !== game.id));

    try {
      const currentData = platformData[selectedPlatform] || { favorites: [], deleted: [] };
      let newFavorites = currentData.favorites;
      let newDeleted = currentData.deleted;
      
      if (action === 'save') {
        newFavorites = [...currentData.favorites, game];
      } else if (action === 'delete') {
        newDeleted = [...currentData.deleted, game];
      }
      
      // Update UI immediately (optimistic update)
      setPlatformData(prev => ({
        ...prev,
        [selectedPlatform]: {
          favorites: newFavorites,
          deleted: newDeleted
        }
      }));
      
      // Save to database in background
      try {
        await databaseApi.updatePlatformData(selectedPlatform, newFavorites, newDeleted);
      } catch (error) {
        console.error('Failed to update database, using localStorage:', error);
        // Fallback to localStorage
        const currentData = JSON.parse(localStorage.getItem('platformData') || '{}');
        currentData[selectedPlatform] = { favorites: newFavorites, deleted: newDeleted };
        localStorage.setItem('platformData', JSON.stringify(currentData));
      }
      
      // If we have fewer than 15 games left, automatically load more
      const remainingGames = games.filter(g => g.id !== game.id);
      if (remainingGames.length < 15 && isAuthenticated) {
        setTimeout(() => {
          fetchGames(selectedPlatform, currentOffset);
        }, 100);
      }
    } catch (error) {
      console.error('Failed to save game action:', error);
      // Revert the UI change if there was an error
      setGames(prev => [...prev, game]);
    }
  };

  const handleRevertGame = async (game, fromList) => {
    if (!selectedPlatform || !isAuthenticated) return;

    try {
      const currentData = platformData[selectedPlatform] || { favorites: [], deleted: [] };
      let newFavorites = currentData.favorites;
      let newDeleted = currentData.deleted;
      
      if (fromList === 'favorites') {
        newFavorites = currentData.favorites.filter(g => g.id !== game.id);
      } else if (fromList === 'deleted') {
        newDeleted = currentData.deleted.filter(g => g.id !== game.id);
      }
      
      // Update UI immediately (optimistic update)
      setPlatformData(prev => ({
        ...prev,
        [selectedPlatform]: {
          favorites: newFavorites,
          deleted: newDeleted
        }
      }));

      // Add game back to the main list immediately
      setGames(prev => [game, ...prev]);
      
      // Save to database in background
      try {
        await databaseApi.updatePlatformData(selectedPlatform, newFavorites, newDeleted);
      } catch (error) {
        console.error('Failed to update database, using localStorage:', error);
        // Fallback to localStorage
        const currentData = JSON.parse(localStorage.getItem('platformData') || '{}');
        currentData[selectedPlatform] = { favorites: newFavorites, deleted: newDeleted };
        localStorage.setItem('platformData', JSON.stringify(currentData));
      }
    } catch (error) {
      console.error('Failed to revert game:', error);
    }
  };

  const toggleCollectedStatus = async (gameId) => {
    if (!selectedPlatform || !isAuthenticated) return;

    try {
      const currentData = platformData[selectedPlatform] || { favorites: [], deleted: [] };
      const updatedFavorites = currentData.favorites.map(game => 
        game.id === gameId 
          ? { ...game, collected: !game.collected }
          : game
      );
      
      await databaseApi.updatePlatformData(selectedPlatform, updatedFavorites, currentData.deleted);
      
      setPlatformData(prev => ({
        ...prev,
        [selectedPlatform]: {
          ...currentData,
          favorites: updatedFavorites
        }
      }));
    } catch (error) {
      console.error('Failed to toggle collected status:', error);
    }
  };

  const loadMoreGames = () => {
    if (selectedPlatform && !isLoadingMore && isAuthenticated) {
      fetchGames(selectedPlatform, currentOffset);
    }
  };

  // Helper function for fuzzy string matching
  const calculateSimilarity = (str1, str2) => {
    const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;
    
    // Check for partial matches (e.g., "90 Minutes" vs "90 Minutes : Sega Championship Football")
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    
    let commonWords = 0;
    for (const word1 of words1) {
      if (word1.length > 2) { // Only consider words longer than 2 characters
        for (const word2 of words2) {
          if (word2.length > 2 && (word1.includes(word2) || word2.includes(word1))) {
            commonWords++;
            break;
          }
        }
      }
    }
    
    // Calculate word-based similarity
    const wordSimilarity = commonWords / Math.max(words1.length, words2.length);
    
    // Simple character-based similarity
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++;
    }
    
    const charSimilarity = matches / longer.length;
    
    // Return the higher of the two similarities
    return Math.max(wordSimilarity, charSimilarity);
  };

  const handleImport = async (event) => {
    if (!isAuthenticated) return;
    
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (!selectedPlatform) {
          alert('Please select a platform before importing data.');
          return;
        }
        
        // Save to database
        await databaseApi.updatePlatformData(
          selectedPlatform, 
          data.favorites || [], 
          data.deleted || []
        );
        
        // Reload all platform data from database to ensure consistency
        try {
          const refreshedData = await databaseApi.loadPlatformData();
          setPlatformData(refreshedData);
          console.log('Refreshed platform data after import:', refreshedData);
        } catch (error) {
          console.error('Failed to refresh platform data after import:', error);
          // Fallback to local update
          setPlatformData(prev => ({
            ...prev,
            [selectedPlatform]: {
              favorites: data.favorites || [],
              deleted: data.deleted || []
            }
          }));
        }
        
        // Refresh the games list to show unprocessed games
        setTimeout(() => {
          fetchGames(selectedPlatform, 0);
        }, 100);
        
        alert('Data imported successfully for the selected platform!');
      } catch (error) {
        alert('Invalid JSON file. Please check the file format.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  const handleXMLImport = async (event) => {
    if (!isAuthenticated) return;
    
    const file = event.target.files[0];
    if (!file) return;

    if (!selectedPlatform) {
      alert('Please select a platform before importing XML data.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const xmlText = e.target.result;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // Check for parsing errors
        const parseError = xmlDoc.getElementsByTagName('parsererror');
        if (parseError.length > 0) {
          throw new Error('Invalid XML format');
        }

        const gameElements = xmlDoc.getElementsByTagName('game');
        const xmlGames = [];
        
        for (let i = 0; i < gameElements.length; i++) {
          const game = gameElements[i];
          xmlGames.push({
            name: game.getElementsByTagName('name')[0]?.textContent || '',
            desc: game.getElementsByTagName('desc')[0]?.textContent || '',
            developer: game.getElementsByTagName('developer')[0]?.textContent || '',
            publisher: game.getElementsByTagName('publisher')[0]?.textContent || '',
            genre: game.getElementsByTagName('genre')[0]?.textContent || '',
            releasedate: game.getElementsByTagName('releasedate')[0]?.textContent || '',
            rating: game.getElementsByTagName('rating')[0]?.textContent || ''
          });
        }

        console.log(`Found ${xmlGames.length} games in XML file`);

        // Start the matching process
        setLoading(true);
        setXmlImportProgress({ current: 0, total: xmlGames.length, isImporting: true });
        const matchedGames = [];
        let processedCount = 0;

        for (const xmlGame of xmlGames) {
          try {
            console.log(`Searching for: "${xmlGame.name}"`);
            
            // Search for the game in IGDB
            const searchResults = await igdbApi.searchGames(xmlGame.name, 5);
            console.log(`Search results for "${xmlGame.name}":`, searchResults);
            
            if (searchResults.length > 0) {
              // Find the best match
              let bestMatch = searchResults[0];
              let bestScore = calculateSimilarity(xmlGame.name, searchResults[0].name);
              
              for (const result of searchResults) {
                const score = calculateSimilarity(xmlGame.name, result.name);
                console.log(`  Comparing "${xmlGame.name}" with "${result.name}": score ${score.toFixed(2)}`);
                if (score > bestScore) {
                  bestScore = score;
                  bestMatch = result;
                }
              }
              
              // Only add if similarity is above threshold (lowered from 0.6 to 0.4)
              if (bestScore > 0.4) {
                matchedGames.push({
                  ...bestMatch,
                  xmlData: xmlGame,
                  matchScore: bestScore
                });
                console.log(`✅ Matched: "${xmlGame.name}" → "${bestMatch.name}" (score: ${bestScore.toFixed(2)})`);
              } else {
                console.log(`❌ No good match found for: "${xmlGame.name}" (best score: ${bestScore.toFixed(2)})`);
              }
            } else {
              console.log(`❌ No search results found for: "${xmlGame.name}"`);
            }
            
            processedCount++;
            setXmlImportProgress(prev => ({ ...prev, current: processedCount }));
            // Add a small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 200));
            
          } catch (error) {
            console.error(`❌ Error processing game "${xmlGame.name}":`, error);
          }
        }

        // Add matched games to favorites with collected status set to true
        if (matchedGames.length > 0) {
          try {
            const currentData = platformData[selectedPlatform] || { favorites: [], deleted: [] };
            // Set collected status to true for all XML imported games
            const matchedGamesWithCollected = matchedGames.map(game => ({
              ...game,
              collected: true
            }));
            const newFavorites = [...currentData.favorites, ...matchedGamesWithCollected];
            
            // Save to database
            await databaseApi.updatePlatformData(selectedPlatform, newFavorites, currentData.deleted);
            
            // Reload all platform data from database to ensure consistency
            try {
              const refreshedData = await databaseApi.loadPlatformData();
              setPlatformData(refreshedData);
              console.log('Refreshed platform data after XML import:', refreshedData);
            } catch (error) {
              console.error('Failed to refresh platform data after XML import:', error);
              // Fallback to local update
              setPlatformData(prev => ({
                ...prev,
                [selectedPlatform]: {
                  ...currentData,
                  favorites: newFavorites
                }
              }));
            }
            
            console.log(`Added ${matchedGames.length} games to favorites (all marked as collected)`);
            alert(`Successfully imported ${matchedGames.length} games from XML file!`);
          } catch (error) {
            console.error('Failed to save XML imported games:', error);
            alert('Games were matched but failed to save to database. Please try again.');
          }
        } else {
          alert('No games could be matched from the XML file.');
        }
        
      } catch (error) {
        alert('Error processing XML file: ' + error.message);
        console.error('XML import error:', error);
      } finally {
        setLoading(false);
        setXmlImportProgress({ current: 0, total: 0, isImporting: false });
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  const handleExport = () => {
    if (!isAuthenticated) return;
    
    if (!selectedPlatform) {
      alert('Please select a platform before exporting data.');
      return;
    }

    const data = {
      favorites,
      deleted
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const platformName = platforms.find(p => p.id === parseInt(selectedPlatform))?.name || 'unknown';
    a.download = `game-categories-${platformName}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearData = async () => {
    if (!isAuthenticated) return;
    
    if (!selectedPlatform) {
      alert('Please select a platform before clearing data.');
      return;
    }

    if (window.confirm(`Are you sure you want to clear all saved and deleted games for the selected platform?`)) {
      try {
        await databaseApi.deletePlatformData(selectedPlatform);
        
        setPlatformData(prev => {
          const newData = { ...prev };
          delete newData[selectedPlatform];
          return newData;
        });
        
        // Refresh the games list
        fetchGames(selectedPlatform, 0);
      } catch (error) {
        console.error('Failed to clear platform data:', error);
        alert('Failed to clear data. Please try again.');
      }
    }
  };



  const selectedPlatformName = platforms.find(p => p.id === parseInt(selectedPlatform))?.name || '';

  return (
    <div className="container">
      <div className="header">
        <div className="header-content">
          <div className="header-left">
            <h1><Zap size={48} /> Frankenstein Database</h1>
            <p>Browse and categorize video games from IGDB API</p>
          </div>
          <div className="header-right">
            {isAuthenticated ? (
              <div className="user-info">
                <span className="username">
                  <User size={16} />
                  {currentUser}
                </span>
                <button className="btn btn-secondary" onClick={handleLogout}>
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowLoginModal(true)}>
                <LogIn size={16} />
                Login
              </button>
            )}
          </div>
        </div>
        

      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="username">Username:</label>
                <input
                  type="text"
                  id="username"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password:</label>
                <input
                  type="password"
                  id="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
              {loginError && <div className="error-message">{loginError}</div>}
              <div className="modal-buttons">
                <button type="button" className="btn btn-secondary" onClick={() => setShowLoginModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <div className="card">
        <div className="platform-selectors">
          <div className="platform-selector">
            <label htmlFor="platform-with-games">Platforms with processed games:</label>
            <select
              id="platform-with-games"
              value={selectedPlatform}
              onChange={(e) => handlePlatformChange(e.target.value)}
              disabled={loading}
            >
              <option value="">Choose a platform with games...</option>
              {getPlatformCategories().platformsWithGames.map(platform => (
                <option key={platform.id} value={platform.id}>
                  {platform.name} ({platformData[platform.id.toString()]?.favorites.length || 0} favorites, {platformData[platform.id.toString()]?.deleted.length || 0} deleted)
                </option>
              ))}
            </select>
          </div>
          
          {isAuthenticated && (
            <div className="platform-selector">
              <label htmlFor="platform-without-games">Platforms without processed games:</label>
              <select
                id="platform-without-games"
                value={selectedPlatform}
                onChange={(e) => handlePlatformChange(e.target.value)}
                disabled={loading}
              >
                <option value="">Choose a platform without games...</option>
                {getPlatformCategories().platformsWithoutGames.map(platform => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isAuthenticated && (
          <div className="import-export">
            <label className="file-input-label btn btn-secondary">
              <Upload size={16} />
              Import JSON
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="file-input"
              />
            </label>
            
            <label className="file-input-label btn btn-secondary">
              <FileText size={16} />
              Import XML
              <input
                type="file"
                accept=".xml"
                onChange={handleXMLImport}
                className="file-input"
              />
            </label>
            
            <button 
              className="btn btn-primary" 
              onClick={handleExport}
              disabled={!selectedPlatform || (favorites.length === 0 && deleted.length === 0)}
            >
              <Download size={16} />
              Export Data
            </button>
            
            <button 
              className="btn btn-danger" 
              onClick={clearData}
              disabled={!selectedPlatform || (favorites.length === 0 && deleted.length === 0)}
            >
              <Trash2 size={16} />
              Clear Platform Data
            </button>
            
            {(favorites.length > 0 || deleted.length > 0) && (
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowLists(!showLists)}
              >
                <Eye size={16} />
                {showLists ? 'Hide' : 'Show'} Lists
              </button>
            )}
            
            {selectedPlatform && (
              <div className="view-mode-buttons">
                <button 
                  className={`btn ${viewMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setViewMode('all')}
                >
                  All Games
                </button>
                {favorites.length > 0 && (
                  <button 
                    className={`btn ${viewMode === 'favorites' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setViewMode('favorites')}
                  >
                    <Heart size={16} />
                    Favorites ({favorites.length})
                  </button>
                )}
                {deleted.length > 0 && (
                  <button 
                    className={`btn ${viewMode === 'deleted' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setViewMode('deleted')}
                  >
                    <Trash2 size={16} />
                    Deleted ({deleted.length})
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {isAuthenticated && (
        <Stats 
          favorites={favorites.length}
          deleted={deleted.length}
          totalProcessed={favorites.length + deleted.length}
          currentPlatform={selectedPlatformName}
        />
      )}

      {selectedPlatform && (
        <div className="card">
          <div className="section-header">
            <h2>
              {!isAuthenticated && 'Favorites for ' + selectedPlatformName}
              {isAuthenticated && viewMode === 'all' && 'Games for ' + selectedPlatformName}
              {isAuthenticated && viewMode === 'favorites' && `Favorites for ${selectedPlatformName} (${favorites.length})`}
              {isAuthenticated && viewMode === 'deleted' && `Deleted for ${selectedPlatformName} (${deleted.length})`}
            </h2>
            {isAuthenticated && viewMode === 'favorites' && favorites.length > 0 && (
              <button 
                className={`btn ${showCollectedOnly ? 'btn-success' : 'btn-secondary'}`}
                onClick={() => setShowCollectedOnly(!showCollectedOnly)}
              >
                {showCollectedOnly ? 'Show All' : 'Show Collected Only'}
                {showCollectedOnly && ` (${favorites.filter(game => game.collected).length})`}
              </button>
            )}
          </div>
          
          {getFilteredGames().length > 0 && (
            <div className="game-grid">
              {getFilteredGames().map(game => (
                <GameCard
                  key={game.id}
                  game={game}
                  onSave={() => handleGameAction(game, 'save')}
                  onDelete={() => handleGameAction(game, 'delete')}
                  onToggleCollected={() => toggleCollectedStatus(game.id)}
                  isCollected={game.collected}
                  viewMode={viewMode}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
          )}
          
          {getFilteredGames().length === 0 && !isLoadingMore && !loading && (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
              {!isAuthenticated && <p>No favorite games for this platform!</p>}
              {isAuthenticated && viewMode === 'all' && (
                <>
                  <p>All games for this platform have been processed!</p>
                  {(favorites.length > 0 || deleted.length > 0) && (
                    <p style={{ marginTop: '10px', fontSize: '14px' }}>
                      Use the view mode buttons to see your favorites and deleted games.
                    </p>
                  )}
                </>
              )}
              {isAuthenticated && viewMode === 'favorites' && <p>No favorite games yet!</p>}
              {isAuthenticated && viewMode === 'deleted' && <p>No deleted games yet!</p>}
            </div>
          )}
          
          {isLoadingMore && viewMode === 'all' && isAuthenticated && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Loader2 size={24} className="loading-spinner" />
              <p>Searching for unprocessed games...</p>
            </div>
          )}
        </div>
      )}

      {isAuthenticated && showLists && (favorites.length > 0 || deleted.length > 0) && (
        <Lists 
          favorites={favorites} 
          deleted={deleted} 
          onRevert={handleRevertGame}
        />
      )}

      {loading && !xmlImportProgress.isImporting && (
        <div className="loading">
          <Loader2 size={32} className="loading-spinner" />
          <p>Loading platforms...</p>
        </div>
      )}

      {xmlImportProgress.isImporting && (
        <div className="loading">
          <Loader2 size={32} className="loading-spinner" />
          <p>Importing XML games...</p>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(xmlImportProgress.current / xmlImportProgress.total) * 100}%` }}
            ></div>
          </div>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>
            {xmlImportProgress.current} / {xmlImportProgress.total} games processed
          </p>
        </div>
      )}
    </div>
  );
}

export default App; 