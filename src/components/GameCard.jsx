import React from 'react';
import { Heart, Trash2, ExternalLink, RotateCcw } from 'lucide-react';
import igdbApi from '../services/igdbApi';

function GameCard({ game, onSave, onDelete, onRevert, onToggleCollected, isCollected, viewMode, isAuthenticated, crossPlatformInfo, gameSize }) {
  const coverUrl = game.cover 
    ? igdbApi.getCoverImageUrl(game.cover.image_id, 'cover_big')
    : null;

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
        {gameSize && (
          <div className="game-size-chip">
            <span className="size-text">
              💾 {gameSize}
            </span>
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