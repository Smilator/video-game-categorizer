import React, { useState, useEffect, useCallback } from 'react';
import { Download, Upload, Heart, Trash2, Loader2, RotateCcw, FileText, LogIn, LogOut, User, Zap } from 'lucide-react';
import igdbApi from './services/igdbApi';
import databaseApi from './services/databaseApi';
import GameCard from './components/GameCard';
import Stats from './components/Stats';

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
  const [viewMode, setViewMode] = useState('all');
  const [showCollectedOnly, setShowCollectedOnly] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [xmlImportProgress, setXmlImportProgress] = useState({ current: 0, total: 0, isImporting: false });
  const [fetchedGameIds, setFetchedGameIds] = useState(new Set());
  const [currentBatchNumber, setCurrentBatchNumber] = useState(1);
  const [gameSizes, setGameSizes] = useState({}); // Store game file sizes
  const [isLoadingSizes, setIsLoadingSizes] = useState(false);

  // Helper functions for favorites and deleted lists (sorted alphabetically)
  const favorites = selectedPlatform ? (platformData[selectedPlatform]?.favorites || []).sort((a, b) => a.name.localeCompare(b.name)) : [];
  const deleted = selectedPlatform ? (platformData[selectedPlatform]?.deleted || []).sort((a, b) => a.name.localeCompare(b.name)) : [];

  // Function to load game sizes for Nintendo Switch
  const loadGameSizes = async () => {
    if (selectedPlatform !== '130' || !isAuthenticated) {
      console.log('❌ Cannot load sizes: selectedPlatform =', selectedPlatform, 'isAuthenticated =', isAuthenticated);
      return;
    }
    
    // Don't load sizes if we're in the middle of batch loading
    if (loading) {
      console.log('❌ Cannot load sizes: batch loading in progress');
      return;
    }
    
    const currentFavorites = platformData[selectedPlatform]?.favorites || [];
    if (currentFavorites.length === 0) {
      console.log('❌ Cannot load sizes: no favorites found');
      return;
    }
    
    setIsLoadingSizes(true);
    console.log(`🔍 Loading game sizes for ${currentFavorites.length} Nintendo Switch favorites...`);
    console.log('Games to process:', currentFavorites.map(g => g.name));
    
    try {
      // First, try to load existing sizes from database
      console.log(`📥 Loading existing sizes from database...`);
      const existingSizes = await databaseApi.loadGameSizes(selectedPlatform);
      console.log(`📊 Found ${Object.keys(existingSizes).length} existing sizes in database:`, existingSizes);
      
      setGameSizes(existingSizes);
      
      // Then, check which games don't have sizes and scrape for them
      const gamesWithoutSizes = currentFavorites.filter(game => !existingSizes[game.name]);
      console.log(`🔍 ${gamesWithoutSizes.length} games need size scraping:`, gamesWithoutSizes.map(g => g.name));
      
      if (gamesWithoutSizes.length > 0) {
        console.log(`🔄 Scraping sizes for ${gamesWithoutSizes.length} games...`);
        
        const sizePromises = gamesWithoutSizes.map(async (game) => {
          console.log(`🔍 Fetching size for: ${game.name}`);
          try {
            const result = await databaseApi.getNintendoGameSize(game.name);
            console.log(`📊 Result for ${game.name}:`, result);
            return { gameName: game.name, ...result };
          } catch (error) {
            console.error(`❌ Failed to get size for ${game.name}:`, error);
            return { gameName: game.name, found: false, fileSize: null };
          }
        });
        
        const results = await Promise.all(sizePromises);
        const newGameSizes = { ...existingSizes };
        
        results.forEach(result => {
          console.log(`📊 Processing result for ${result.gameName}:`, result);
          if (result.found && result.fileSize) {
            newGameSizes[result.gameName] = result.fileSize;
            console.log(`✅ Added size for ${result.gameName}: ${result.fileSize}`);
          } else {
            console.log(`❌ No size found for ${result.gameName}`);
          }
        });
        
        setGameSizes(newGameSizes);
        console.log(`✅ Updated sizes for ${Object.keys(newGameSizes).length} games total`);
      } else {
        console.log(`✅ All games already have sizes in database`);
      }
    } catch (error) {
      console.error('❌ Error loading game sizes:', error);
    } finally {
      setIsLoadingSizes(false);
    }
  };

  // Calculate total download size
  const calculateTotalSize = () => {
    if (selectedPlatform !== '130' || !isAuthenticated) return null;
    
    console.log('🧮 Calculating total size for favorites:', favorites.length);
    console.log('📊 Game sizes available:', gameSizes);
    
    const totalSizeInMB = favorites.reduce((total, game) => {
      const sizeStr = gameSizes[game.name];
      console.log(`🔍 Processing ${game.name}: size = "${sizeStr}"`);
      
      if (!sizeStr) {
        console.log(`❌ No size for ${game.name}`);
        return total;
      }
      
      // Parse size string (e.g., "2.5 GB", "500 MB")
      const match = sizeStr.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/i);
      if (!match) {
        console.log(`❌ Could not parse size for ${game.name}: "${sizeStr}"`);
        return total;
      }
      
      const value = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      
      let sizeInMB = 0;
      if (unit === 'GB') {
        sizeInMB = value * 1024; // Convert GB to MB
        console.log(`✅ ${game.name}: ${value} GB = ${sizeInMB} MB`);
      } else if (unit === 'MB') {
        sizeInMB = value;
        console.log(`✅ ${game.name}: ${value} MB`);
      }
      
      return total + sizeInMB;
    }, 0);
    
    console.log(`🧮 Total size in MB: ${totalSizeInMB}`);
    
    if (totalSizeInMB === 0) return null;
    
    // Format total size
    if (totalSizeInMB >= 1024) {
      const totalGB = (totalSizeInMB / 1024).toFixed(1);
      console.log(`📊 Final total: ${totalGB} GB`);
      return `${totalGB} GB`;
    } else {
      console.log(`📊 Final total: ${totalSizeInMB.toFixed(0)} MB`);
      return `${totalSizeInMB.toFixed(0)} MB`;
    }
  };

  const handleEditGameSize = async (gameName, newSize) => {
    try {
      // Save to database
      await databaseApi.saveGameSize(gameName, selectedPlatform, newSize);
      
      // Update local state
      setGameSizes(prev => ({
        ...prev,
        [gameName]: newSize
      }));
      
      console.log(`📝 Manually edited and saved size for ${gameName}: ${newSize}`);
    } catch (error) {
      console.error(`❌ Error saving manual edit for ${gameName}:`, error);
      // Still update local state even if database save fails
      setGameSizes(prev => ({
        ...prev,
        [gameName]: newSize
      }));
    }
  };

  const handleScrapeGameSize = async (gameName) => {
    try {
      console.log(`🔄 Scraping size for individual game: ${gameName}`);
      const result = await databaseApi.getNintendoGameSize(gameName);
      
      if (result.found && result.fileSize) {
        // Update local state
        setGameSizes(prev => ({
          ...prev,
          [gameName]: result.fileSize
        }));
        
        console.log(`✅ Successfully scraped size for ${gameName}: ${result.fileSize}`);
      } else {
        console.log(`❌ No size found for ${gameName}`);
      }
    } catch (error) {
      console.error(`❌ Error scraping size for ${gameName}:`, error);
    }
  };

  // Function to check if a game is favorited on other platforms
  const getCrossPlatformInfo = (game) => {
    if (!game || !game.id || !selectedPlatform) return null;
    
    const otherPlatforms = Object.keys(platformData).filter(platformId => 
      platformId !== selectedPlatform && platformData[platformId]?.favorites
    );
    
    const favoritedOn = [];
    for (const platformId of otherPlatforms) {
      const platformFavorites = platformData[platformId].favorites || [];
      const isFavorited = platformFavorites.some(favGame => favGame.id === game.id);
      if (isFavorited) {
        const platform = platforms.find(p => p.id === parseInt(platformId));
        if (platform) {
          favoritedOn.push(platform.name);
        }
      }
    }
    
    return favoritedOn.length > 0 ? favoritedOn : null;
  };

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

  // Save data to localStorage whenever it changes (database saves are handled individually to avoid race conditions)
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      console.log('Saving to localStorage - platformData:', platformData);
      
      // Save to localStorage as backup (database saves are handled individually to avoid race conditions)
      try {
        localStorage.setItem('platformData', JSON.stringify(platformData));
        console.log('Saved to localStorage');
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
      
      console.log(`🎮 Fetching batch of games for platform ${platformId}, starting from offset: ${offset}`);
      
      // Get current platform's processed games (favorites + deleted)
      const currentPlatformProcessed = new Set();
      const currentPlatformData = platformData[platformId];
      if (currentPlatformData) {
        currentPlatformData.favorites.forEach(game => currentPlatformProcessed.add(game.id));
        currentPlatformData.deleted.forEach(game => currentPlatformProcessed.add(game.id));
      }
      
      console.log(`📊 Already processed ${currentPlatformProcessed.size} games for this platform`);
      
      // Try batches of 500 until we find one with unjudged games
      let currentOffset = offset;
      let batchNumber = Math.floor(offset / 500) + 1;
      let foundUnjudgedGames = false;
      const maxBatches = 200; // Prevent infinite loops
      
      while (!foundUnjudgedGames && batchNumber <= maxBatches) {
        console.log(`📦 Loading Batch ${batchNumber} (offset: ${currentOffset})`);
        setCurrentBatchNumber(batchNumber);
        
        // Fetch a batch of 500 games from IGDB
        const gamesData = await igdbApi.getGamesByPlatform(platformId, currentOffset, 500);
        
        if (gamesData.length === 0) {
          console.log('🏁 No more games available from IGDB');
          break;
        }
        
        console.log(`📥 Fetched ${gamesData.length} games from IGDB`);
        
        // Filter out games that have already been processed
        const unprocessedGames = gamesData.filter(game => !currentPlatformProcessed.has(game.id));
        console.log(`✅ Found ${unprocessedGames.length} unprocessed games in this batch`);
        
        if (unprocessedGames.length > 0) {
          // Found unjudged games! Use this batch
          console.log(`🎯 Using Batch ${batchNumber} with ${unprocessedGames.length} unjudged games`);
          setGames(unprocessedGames);
          foundUnjudgedGames = true;
        } else {
          // This batch is empty, try the next one
          console.log(`⏭️ Batch ${batchNumber} is empty, trying next batch...`);
          currentOffset += 500;
          batchNumber++;
        }
      }
      
      if (!foundUnjudgedGames) {
        console.log('🎉 All games have been judged! No unjudged games remaining.');
        setGames([]);
        currentOffset = 0; // Reset to beginning
      }
      
      // Update offset for next batch
      const nextOffset = foundUnjudgedGames ? currentOffset + 500 : 0;
      setCurrentOffset(nextOffset);
      
      // Save the current batch position to localStorage
      try {
        const batchPositions = JSON.parse(localStorage.getItem('batchPositions') || '{}');
        batchPositions[platformId] = nextOffset;
        localStorage.setItem('batchPositions', JSON.stringify(batchPositions));
        console.log(`💾 Saved batch position for platform ${platformId}: offset ${nextOffset}`);
      } catch (error) {
        console.error('Failed to save batch position:', error);
      }
      
      // Clear any previous fetched game IDs since we're starting fresh
      setFetchedGameIds(new Set());
      
    } catch (err) {
      setError(err.message);
      console.error('Error fetching games:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [platformData]);

  // Load game sizes when Nintendo Switch favorites are available - but only when viewing favorites
  useEffect(() => {
    if (selectedPlatform === '130' && isAuthenticated && viewMode === 'favorites' && favorites.length > 0) {
      console.log(`🔄 Nintendo Switch favorites view with ${favorites.length} favorites, loading sizes...`);
      loadGameSizes();
    }
  }, [selectedPlatform, isAuthenticated, viewMode, favorites.length]);

  // Also load sizes when platform data changes (for existing favorites) - but only when viewing favorites
  useEffect(() => {
    if (selectedPlatform === '130' && isAuthenticated && viewMode === 'favorites' && platformData[selectedPlatform]?.favorites?.length > 0) {
      const currentFavorites = platformData[selectedPlatform].favorites;
      console.log(`🔄 Platform data updated with ${currentFavorites.length} favorites, loading sizes...`);
      loadGameSizes();
    }
  }, [platformData, selectedPlatform, isAuthenticated, viewMode]);

  const handlePlatformChange = (platformId) => {
    setSelectedPlatform(platformId);
    setGames([]);
    setFetchedGameIds(new Set()); // Reset fetched games when changing platforms
    setError(null);
    setShowCollectedOnly(false); // Reset collected filter when changing platforms
    
    if (platformId) {
      // For non-authenticated users, automatically show favorites
      if (!isAuthenticated) {
        setViewMode('favorites');
        setCurrentOffset(0);
      } else {
        setViewMode('all'); // Reset view mode when changing platforms
        
        // Load saved batch position for this platform
        try {
          const batchPositions = JSON.parse(localStorage.getItem('batchPositions') || '{}');
          const savedOffset = batchPositions[platformId] || 0;
          setCurrentOffset(savedOffset);
          console.log(`📂 Loaded saved batch position for platform ${platformId}: offset ${savedOffset}`);
          
          // If we have a saved position > 0, load the current batch
          if (savedOffset > 0) {
            fetchGames(platformId, savedOffset - 500); // Load the current batch
          } else {
            fetchGames(platformId, 0); // Start from beginning
          }
        } catch (error) {
          console.error('Failed to load batch position:', error);
          setCurrentOffset(0);
          fetchGames(platformId, 0);
        }
      }
    } else {
      setCurrentOffset(0);
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
        newFavorites = [...currentData.favorites, game].sort((a, b) => a.name.localeCompare(b.name));
      } else if (action === 'delete') {
        newDeleted = [...currentData.deleted, game].sort((a, b) => a.name.localeCompare(b.name));
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
      
      // Game judged - no automatic loading, wait for user to load next batch
      console.log(`✅ Game "${game.name}" judged as ${action}`);
    } catch (error) {
      console.error('Failed to save game action:', error);
      // Revert the UI change if there was an error
      setGames(prev => [...prev, game]);
    }
  };

  const handleRevertGame = async (game, fromList, toList = 'all') => {
    if (!selectedPlatform || !isAuthenticated) return;

    console.log('🔄 Reverting game:', game.name, 'from list:', fromList, 'to list:', toList);

    try {
      const currentData = platformData[selectedPlatform] || { favorites: [], deleted: [] };
      let newFavorites = [...currentData.favorites];
      let newDeleted = [...currentData.deleted];
      
      // Remove from source list
      if (fromList === 'favorites') {
        newFavorites = currentData.favorites.filter(g => g.id !== game.id);
        console.log('✅ Removed from favorites, new favorites count:', newFavorites.length);
      } else if (fromList === 'deleted') {
        newDeleted = currentData.deleted.filter(g => g.id !== game.id);
        console.log('✅ Removed from deleted, new deleted count:', newDeleted.length);
      }
      
      // Add to destination list
      if (toList === 'favorites') {
        // Add to favorites (avoid duplicates)
        if (!newFavorites.some(g => g.id === game.id)) {
          newFavorites.push(game);
          newFavorites.sort((a, b) => a.name.localeCompare(b.name));
          console.log('✅ Added to favorites, new favorites count:', newFavorites.length);
        }
        // DO NOT add to main games list when moving to favorites
      } else if (toList === 'deleted') {
        // Add to deleted (avoid duplicates)
        if (!newDeleted.some(g => g.id === game.id)) {
          newDeleted.push(game);
          newDeleted.sort((a, b) => a.name.localeCompare(b.name));
          console.log('✅ Added to deleted, new deleted count:', newDeleted.length);
        }
        // DO NOT add to main games list when moving to deleted
      } else if (toList === 'all') {
        // Add back to main list (unjudged games) - only when moving to unjudged games
        setGames(prev => [game, ...prev]);
        console.log('✅ Added game back to main list');
      }
      
      // Update UI immediately (optimistic update)
      setPlatformData(prev => ({
        ...prev,
        [selectedPlatform]: {
          favorites: newFavorites,
          deleted: newDeleted
        }
      }));
      
      // Only switch to "All Games" view if moving to unjudged games
      // When moving between lists (favorites <-> deleted), stay in current view
      if (toList === 'all' && viewMode !== 'all') {
        setViewMode('all');
        console.log('✅ Switched to All Games view');
      } else if (toList === 'deleted' && viewMode === 'favorites') {
        // Moving from favorites to deleted - stay in favorites view
        console.log('✅ Moved to deleted, staying in favorites view');
      } else if (toList === 'favorites' && viewMode === 'deleted') {
        // Moving from deleted to favorites - stay in deleted view
        console.log('✅ Moved to favorites, staying in deleted view');
      }
      
      // Save to database in background
      try {
        await databaseApi.updatePlatformData(selectedPlatform, newFavorites, newDeleted);
        console.log('✅ Saved to database successfully');
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
        
        // Handle game sizes for Nintendo Switch platform
        if (selectedPlatform === '130' && data.gameSizes) {
          console.log('📦 Importing game sizes:', data.gameSizes);
          setGameSizes(data.gameSizes);
          
          // Save game sizes to database
          try {
            for (const [gameName, fileSize] of Object.entries(data.gameSizes)) {
              await databaseApi.saveGameSize(gameName, selectedPlatform, fileSize);
            }
            console.log('✅ Game sizes saved to database');
          } catch (error) {
            console.error('❌ Error saving game sizes to database:', error);
          }
        }
        
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
    
    // Add file sizes for Nintendo Switch platform
    if (selectedPlatform === '130' && Object.keys(gameSizes).length > 0) {
      data.gameSizes = gameSizes;
      console.log('📦 Including game sizes in export:', gameSizes);
    }
    
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

      {/* Nintendo Switch Total Download Size - Only show in favorites view */}
      {isAuthenticated && selectedPlatform === '130' && viewMode === 'favorites' && favorites.length > 0 && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>💾 Total Download Size</h3>
              {isLoadingSizes ? (
                <p style={{ margin: '0', color: '#666' }}>Loading game sizes...</p>
              ) : (
                <p style={{ margin: '0', color: '#666' }}>
                  {calculateTotalSize() ? `${calculateTotalSize()} for ${favorites.length} games` : 'Game sizes not available'}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                console.log('🔄 Manual refresh triggered');
                setGameSizes({}); // Clear existing sizes
                loadGameSizes();
              }}
              disabled={isLoadingSizes}
              style={{
                padding: '8px 16px',
                backgroundColor: isLoadingSizes ? '#ccc' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isLoadingSizes ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {isLoadingSizes ? 'Loading...' : 'Refresh Sizes'}
            </button>
          </div>
        </div>
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
            <div>
              <div style={{ 
                textAlign: 'center', 
                marginBottom: '20px', 
                padding: '10px',
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#374151' }}>
                      📦 Batch {Math.floor(currentOffset / 500) + 1}: {getFilteredGames().length} games remaining
                    </p>
                    {getFilteredGames().length <= 10 && (
                      <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                        ⚡ Almost done with this batch!
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      // Reset batch position to 0
                      try {
                        const batchPositions = JSON.parse(localStorage.getItem('batchPositions') || '{}');
                        batchPositions[selectedPlatform] = 0;
                        localStorage.setItem('batchPositions', JSON.stringify(batchPositions));
                      } catch (error) {
                        console.error('Failed to reset batch position:', error);
                      }
                      setCurrentOffset(0);
                      fetchGames(selectedPlatform, 0);
                    }}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    🔄 Restart from Batch 1
                  </button>
                </div>
              </div>
              <div className="game-grid">
              {getFilteredGames().map(game => (
                <GameCard
                  key={game.id}
                  game={game}
                  onSave={() => handleGameAction(game, 'save')}
                  onDelete={() => handleGameAction(game, 'delete')}
                  onRevert={(game, fromList, toList) => handleRevertGame(game, fromList, toList)}
                  onToggleCollected={() => toggleCollectedStatus(game.id)}
                  isCollected={game.collected}
                  viewMode={viewMode}
                  isAuthenticated={isAuthenticated}
                  crossPlatformInfo={getCrossPlatformInfo(game)}
                  gameSize={gameSizes[game.name]}
                  onEditGameSize={handleEditGameSize}
                  onScrapeGameSize={handleScrapeGameSize}
                  selectedPlatform={selectedPlatform}
                />
              ))}
              </div>
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
              <p>📦 Loading Batch {currentBatchNumber}...</p>
              <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '10px' }}>
                Searching for unjudged games in this batch
              </p>
              <div style={{ 
                width: '100%', 
                backgroundColor: '#e5e7eb', 
                borderRadius: '10px', 
                margin: '15px 0',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${Math.min((currentBatchNumber / 200) * 100, 100)}%`,
                  height: '8px',
                  backgroundColor: '#3b82f6',
                  transition: 'width 0.3s ease',
                  borderRadius: '10px'
                }}></div>
              </div>
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: '5px 0 0 0' }}>
                Batch {currentBatchNumber} of up to 200
              </p>
            </div>
          )}
          
          {/* Show "Load Next Batch" button when all games in current batch are judged */}
          {!isLoadingMore && viewMode === 'all' && isAuthenticated && games.length === 0 && currentOffset > 0 && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p style={{ marginBottom: '15px', color: '#6b7280' }}>
                🎉 Great job! You've finished judging all games in this batch.
              </p>
              <p style={{ marginBottom: '15px', color: '#6b7280', fontSize: '14px' }}>
                Next batch will load the next 500 games and skip any that are already judged.
              </p>
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => fetchGames(selectedPlatform, currentOffset)}
                  style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  📦 Load Next Batch (500 games)
                </button>
                <button
                  onClick={() => {
                    // Reset batch position to 0
                    try {
                      const batchPositions = JSON.parse(localStorage.getItem('batchPositions') || '{}');
                      batchPositions[selectedPlatform] = 0;
                      localStorage.setItem('batchPositions', JSON.stringify(batchPositions));
                    } catch (error) {
                      console.error('Failed to reset batch position:', error);
                    }
                    setCurrentOffset(0);
                    fetchGames(selectedPlatform, 0);
                  }}
                  style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  🔄 Restart from Batch 1
                </button>
              </div>
            </div>
          )}
          
          {/* Show message when all games have been judged */}
          {!isLoadingMore && viewMode === 'all' && isAuthenticated && games.length === 0 && currentOffset === 0 && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ 
                backgroundColor: '#10b981', 
                color: 'white', 
                padding: '20px', 
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>🎉 Congratulations!</h2>
                <p style={{ margin: '0', fontSize: '16px' }}>
                  You have judged ALL games available for this platform!
                </p>
              </div>
              <button
                onClick={() => {
                  // Reset batch position to 0 and start fresh cycle
                  try {
                    const batchPositions = JSON.parse(localStorage.getItem('batchPositions') || '{}');
                    batchPositions[selectedPlatform] = 0;
                    localStorage.setItem('batchPositions', JSON.stringify(batchPositions));
                  } catch (error) {
                    console.error('Failed to reset batch position:', error);
                  }
                  setCurrentOffset(0);
                  fetchGames(selectedPlatform, 0);
                }}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🔄 Start Fresh Cycle
              </button>
            </div>
          )}
        </div>
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