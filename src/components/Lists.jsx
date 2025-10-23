import React from 'react';
import { Heart, Trash2, RotateCcw } from 'lucide-react';
import igdbApi from '../services/igdbApi';
import GameCard from './GameCard';

function Lists({ favorites, deleted, onRevert, gameSizes }) {
  const renderGameList = (games, type) => {
    if (games.length === 0) {
      return (
        <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
          No {type} games yet.
        </div>
      );
    }

    return (
      <div className="game-grid">
        {games.map(game => (
          <GameCard
            key={game.id}
            game={game}
            onRevert={(game, fromList, toList) => onRevert(game, fromList, toList)}
            viewMode={type}
            isAuthenticated={true}
            gameSize={gameSizes?.[game.id]}
          />
        ))}
      </div>
    );
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