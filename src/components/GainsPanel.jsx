import React from 'react';

export default function GainsPanel({ gainsMap, mise }) {
  return (
    <aside className="gains-zone">
      <div className="gains-section">
        <div className="gains-section-title">Gains possibles selon la mise</div>
        <div className="gains-grid">
          {Object.entries(gainsMap).map(([sym, mult]) => (
            <div key={sym} className="gain-item">
              <span className="gain-sym">{sym}{sym}{sym}</span>
              <span className="gain-amount">+{mise * mult} 🪙</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
