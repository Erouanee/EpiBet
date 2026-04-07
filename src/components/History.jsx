import React, { useState } from 'react';

const formatNumber = (value) => Number(value || 0).toLocaleString('fr-FR');

export default function History({
  stats,
  history,
  creatorOverview,
  publicStats,
  ranking,
  alerts,
  selectedGame,
  selectedGameTransactions,
  loading,
  apiHealth,
}) {
  const [showDetails, setShowDetails] = useState(false);
  const overviewSummary = creatorOverview?.summary || null;
  const overviewGames = creatorOverview?.games || [];

  return (
    <div className="history-zone">
      <div className="history-head">
        <div className="history-title">Historique des parties</div>
        <button
          type="button"
          className="history-toggle"
          onClick={() => setShowDetails((previous) => !previous)}
        >
          {showDetails ? 'Masquer les menus' : 'Afficher les menus'}
        </button>
      </div>

      <div className="stats-bar">
        <div className="stat-box">
          <div className="stat-label">Victoires</div>
          <div className="stat-value">{stats.totalWins}</div>
        </div>
      </div>

      {showDetails ? (
      <>
      <div className="status-strip">
        <div className="status-card">
          <div className="stat-label">API</div>
          <div className={`stat-value ${apiHealth.status === 'online' ? 'green' : 'red'}`}>{apiHealth.status}</div>
        </div>
        <div className="status-card">
          <div className="stat-label">Jeu</div>
          <div className="stat-value gold">{selectedGame ? selectedGame.name : 'Démo'}</div>
        </div>
        <div className="status-card">
          <div className="stat-label">Transactions</div>
          <div className="stat-value">{formatNumber(selectedGameTransactions.length)}</div>
        </div>
        <div className="status-card">
          <div className="stat-label">Sync</div>
          <div className="stat-value">{loading.refresh ? 'sync' : 'ok'}</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-card">
          <div className="section-title">Créateur</div>
          {overviewSummary ? (
            <div className="summary-grid">
              <div className="summary-item"><span>Jeux</span><strong>{formatNumber(overviewSummary.total_games)}</strong></div>
              <div className="summary-item"><span>Jackpot total</span><strong>{formatNumber(overviewSummary.total_current_jackpot)} 🪙</strong></div>
              <div className="summary-item"><span>Revenus</span><strong>{formatNumber(overviewSummary.total_income)} 🪙</strong></div>
              <div className="summary-item"><span>Versements</span><strong>{formatNumber(overviewSummary.total_payout)} 🪙</strong></div>
              <div className="summary-item"><span>Net</span><strong>{formatNumber(overviewSummary.total_net_revenue)} 🪙</strong></div>
            </div>
          ) : (
            <div className="empty-state">Connecte une clé API pour voir le résumé créateur.</div>
          )}
        </section>

        <section className="dashboard-card">
          <div className="section-title">Public</div>
          {publicStats ? (
            <div className="summary-grid">
              <div className="summary-item"><span>Jeux</span><strong>{formatNumber(publicStats.total_games)}</strong></div>
              <div className="summary-item"><span>Actifs</span><strong>{formatNumber(publicStats.active_games)}</strong></div>
              <div className="summary-item"><span>Fermés</span><strong>{formatNumber(publicStats.closed_games)}</strong></div>
              <div className="summary-item"><span>Jackpot total</span><strong>{formatNumber(publicStats.total_jackpot)} 🪙</strong></div>
              <div className="summary-item"><span>Transactions</span><strong>{formatNumber(publicStats.total_transactions)}</strong></div>
            </div>
          ) : (
            <div className="empty-state">Aucune statistique publique disponible.</div>
          )}
        </section>

        <section className="dashboard-card full-width">
          <div className="section-title">Jeux créés</div>
          <div className="games-list">
            {overviewGames.length === 0 ? (
              <div className="empty-state">Aucun jeu à afficher.</div>
            ) : (
              overviewGames.map((game) => (
                <div key={game.id} className="history-item compact-panel">
                  <div className="history-top">
                    <span className="history-symbols">{game.name}</span>
                    <span className="history-gain gold">{game.current_jackpot} 🪙</span>
                  </div>
                  <div className="history-meta">
                    {game.status} · {game.total_income} income · {game.total_payout} payout · {game.net_revenue} net
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="dashboard-card">
          <div className="section-title">Classement public</div>
          <div className="ranking-list">
            {ranking.length === 0 ? (
              <div className="empty-state">Classement vide.</div>
            ) : (
              ranking.slice(0, 5).map((game) => (
                <div key={game.id} className="ranking-row">
                  <div>
                    <strong>{game.name}</strong>
                    <small>{game.status} · {game.plays || game.total_plays || 0} plays</small>
                  </div>
                  <span>{game.current_jackpot ?? game.jackpot ?? 0} 🪙</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="dashboard-card">
          <div className="section-title">Alertes</div>
          <div className="alerts-list">
            {alerts.length === 0 ? (
              <div className="empty-state">Aucune alerte.</div>
            ) : (
              alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="alert-row">
                  <strong>{alert.message}</strong>
                  <small>Jeu #{alert.game_id}</small>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="dashboard-card full-width">
          <div className="section-title">Transactions récentes</div>
          <div className="history-list compact-history">
            {selectedGameTransactions.length === 0 ? (
              <div className="history-empty">Aucune transaction enregistrée.</div>
            ) : (
              selectedGameTransactions.slice(0, 8).map((item) => (
                <div key={item.id} className={`history-item ${item.type === 'payout' ? 'win' : 'lose'}`}>
                  <div className="history-top">
                    <span className="history-symbols">{item.type}</span>
                    <span className={`history-gain ${item.type === 'payout' ? 'win' : 'lose'}`}>
                      {item.amount} 🪙
                    </span>
                  </div>
                  <div className="history-meta">
                    {item.jackpot_before} → {item.jackpot_after} · {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      </>
      ) : null}

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

      {showDetails && loading.refresh ? <div className="history-footnote">Synchronisation des données API en cours...</div> : null}
    </div>
  );
}