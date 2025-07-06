import React from 'react';
import { Heart, Trash2, RotateCcw } from 'lucide-react';
import igdbApi from '../services/igdbApi';

function Lists({ favorites, deleted, onRevert }) {
  const renderGameList = (games, type) => {
    if (games.length === 0) {
      return (
        <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
          No {type} games yet.
        </div>
      );
    }

    return games.map(game => {
      const coverUrl = game.cover 
        ? igdbApi.getCoverImageUrl(game.cover.image_id, 'cover_small')
        : null;

      return (
        <div key={game.id} className="list-item">
          <div className="list-item-cover">
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
              No Cover
            </div>
          </div>
          <div className="list-item-name">{game.name}</div>
          <button
            className="btn btn-secondary"
            onClick={() => onRevert(game, type)}
            title={`Revert ${game.name} back to judging list`}
            style={{ padding: '4px 8px', fontSize: '12px', minWidth: 'auto' }}
          >
            <RotateCcw size={12} />
            Revert
          </button>
        </div>
      );
    });
  };

  return (
    <div className="lists-section">
      <div className="list-card">
        <h3 className="list-title">
          <Heart size={20} style={{ color: '#10b981' }} />
          Favorites ({favorites.length})
        </h3>
        {renderGameList(favorites, 'favorites')}
      </div>
      
      <div className="list-card">
        <h3 className="list-title">
          <Trash2 size={20} style={{ color: '#ef4444' }} />
          Deleted ({deleted.length})
        </h3>
        {renderGameList(deleted, 'deleted')}
      </div>
    </div>
  );
}

export default Lists; 