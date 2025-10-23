import React, { useState } from 'react';
import { Heart, Trash2, ExternalLink, RotateCcw, Edit2, Check, X } from 'lucide-react';
import igdbApi from '../services/igdbApi';

function GameCard({ game, onSave, onDelete, onRevert, onToggleCollected, isCollected, viewMode, isAuthenticated, crossPlatformInfo, gameSize, onEditGameSize }) {
  const [isEditingSize, setIsEditingSize] = useState(false);
  const [editedSize, setEditedSize] = useState(gameSize || '');
  
  const coverUrl = game.cover 
    ? igdbApi.getCoverImageUrl(game.cover.image_id, 'cover_big')
    : null;
    
  const handleSaveSize = () => {
    if (onEditGameSize) {
      onEditGameSize(game.name, editedSize);
    }
    setIsEditingSize(false);
  };
  
  const handleCancelEdit = () => {
    setEditedSize(gameSize || '');
    setIsEditingSize(false);
  };

  return (
    <div className={`game-card ${isCollected ? 'collected' : ''}`}>
      <div className="game-cover">
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt={`Cover for ${game.name}`}
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div className="placeholder" style={{ display: coverUrl ? 'none' : 'flex' }}>
          No Cover Available
        </div>
      </div>
      
      <div className="game-info">
        <h3 className="game-title">{game.name}</h3>
        
        {/* Cross-platform chip */}
        {crossPlatformInfo && crossPlatformInfo.length > 0 && (
          <div className="cross-platform-chip">
            <span className="chip-text">
              In {crossPlatformInfo.length === 1 ? 'collection' : 'collections'}: {crossPlatformInfo.join(', ')}
            </span>
          </div>
        )}
        
        {/* Game file size (Nintendo Switch only) */}
        {(gameSize || isEditingSize) && (
          <div className="game-size-chip">
            {isEditingSize ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="size-text">💾</span>
                <input
                  type="text"
                  value={editedSize}
                  onChange={(e) => setEditedSize(e.target.value)}
                  placeholder="Enter size (e.g., 11 GB)"
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '12px',
                    width: '80px'
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSaveSize}
                  style={{
                    background: '#28a745',
                    border: 'none',
                    color: 'white',
                    borderRadius: '3px',
                    padding: '2px 6px',
                    cursor: 'pointer'
                  }}
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={handleCancelEdit}
                  style={{
                    background: '#dc3545',
                    border: 'none',
                    color: 'white',
                    borderRadius: '3px',
                    padding: '2px 6px',
                    cursor: 'pointer'
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="size-text">
                  💾 {gameSize || 'No size'}
                </span>
                <button
                  onClick={() => setIsEditingSize(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    borderRadius: '3px'
                  }}
                  title="Edit size"
                >
                  <Edit2 size={12} color="#666" />
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* IGDB Link Button */}
        <div className="game-link">
          <a 
            href={`https://www.igdb.com/games/${game.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-link"
            title="View on IGDB"
          >
            <ExternalLink size={14} />
            View on IGDB
          </a>
        </div>
        
        {/* Collected Status (only for favorites and authenticated users) */}
        {viewMode === 'favorites' && isAuthenticated && (
          <div className="collected-status">
            <label className="collected-checkbox">
              <input
                type="checkbox"
                checked={isCollected || false}
                onChange={() => onToggleCollected(game.id)}
              />
              <span>Collected</span>
            </label>
          </div>
        )}
        
        {/* Game actions (only for authenticated users) */}
        {isAuthenticated && (
          <div className="game-actions">
            {viewMode === 'all' && (
              <>
                <button 
                  className="btn btn-success"
                  onClick={() => onSave(game)}
                  title="Save to favorites"
                >
                  <Heart size={14} />
                  Save
                </button>
                
                <button 
                  className="btn btn-danger"
                  onClick={() => onDelete(game)}
                  title="Mark as deleted"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </>
            )}
            
            {(viewMode === 'favorites' || viewMode === 'deleted') && (
              <div className="revert-options">
                <div className="revert-buttons">
                  {viewMode === 'favorites' && (
                    <>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => onRevert(game, 'favorites', 'all')}
                        title="Move to unjudged games"
                      >
                        <RotateCcw size={12} />
                        To Unjudged
                      </button>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => onRevert(game, 'favorites', 'deleted')}
                        title="Move to deleted list"
                      >
                        <Trash2 size={12} />
                        To Deleted
                      </button>
                    </>
                  )}
                  {viewMode === 'deleted' && (
                    <>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => onRevert(game, 'deleted', 'all')}
                        title="Move to unjudged games"
                      >
                        <RotateCcw size={12} />
                        To Unjudged
                      </button>
                      <button 
                        className="btn btn-success btn-sm"
                        onClick={() => onRevert(game, 'deleted', 'favorites')}
                        title="Move to favorites"
                      >
                        <Heart size={12} />
                        To Favorites
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default GameCard; 