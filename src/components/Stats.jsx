import React from 'react';
import { Heart, Trash2, Gamepad2, CheckCircle } from 'lucide-react';

function Stats({ favorites, deleted, totalProcessed, currentPlatform }) {
  return (
    <div className="stats">
      <div className="stat-card">
        <div className="stat-number">
          <Heart size={24} style={{ color: '#10b981' }} />
          {favorites}
        </div>
        <div className="stat-label">Favorites</div>
      </div>
      
      <div className="stat-card">
        <div className="stat-number">
          <Trash2 size={24} style={{ color: '#ef4444' }} />
          {deleted}
        </div>
        <div className="stat-label">Deleted</div>
      </div>
      
      <div className="stat-card">
        <div className="stat-number">
          <CheckCircle size={24} style={{ color: '#667eea' }} />
          {totalProcessed}
        </div>
        <div className="stat-label">Total Processed</div>
      </div>
      
      {currentPlatform && (
        <div className="stat-card">
          <div className="stat-number">
            <Gamepad2 size={24} style={{ color: '#8b5cf6' }} />
            {currentPlatform}
          </div>
          <div className="stat-label">Current Platform</div>
        </div>
      )}
    </div>
  );
}

export default Stats; 