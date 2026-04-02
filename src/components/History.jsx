import React from 'react';

export default function History({ stats, history }) {

  const partyCount = 0 + 1;

  return (
    <div className="history-zone">
      <div className="history-title">Historique des parties</div>

      <div className="stats-bar">
        <div className="stat-box">
          <div className="stat-label">Parties</div>
          <div className="stat-value gold">{stats.totalGames}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Victoires</div>
          <div className="stat-value">{stats.totalWins}</div>
        </div>
      </div>

      <div className="history-list">
        {history.length === 0 ? (
          <div className="history-empty">Aucune partie jouée</div>
        ) : (
          history.map((item) => (
            <div key={item.id} className={`history-item ${item.isWin ? 'win' : 'lose'}`}>
              <div className="history-top">
                <span className="history-symbols">{item.isWin ? item.winSym.repeat(3) : 'Perdu !'}</span>
                <span className={`history-gain ${item.isWin ? 'win' : 'lose'}`}>
                  {item.isWin ? `+${item.gain} 🪙` : `-${item.mise} 🪙`}
                </span>
              </div>
              <div className="history-meta">
                Mise: {item.mise} 🪙 · {item.time} · Jackpot: {item.jackpotResult} 🪙
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}