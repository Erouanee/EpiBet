import React, { useState } from 'react';

const maskApiKey = (value) => {
  if (!value) {
    return 'Aucune clé';
  }

  if (value.length <= 10) {
    return value;
  }

  return `${value.slice(0, 6)}…${value.slice(-4)}`;
};

export default function Header({
  apiBaseUrl,
  apiHealth,
  apiKey,
  creator,
  creatorEmail,
  forms,
  loading,
  notice,
  error,
  jackpot,
  selectedGame,
  selectedGameLabel,
  games,
  isRemoteMode,
  onFormChange,
  onRegisterCreator,
  onSaveApiKey,
  onCreateGame,
  onSelectGame,
  musicPlaying,
  musicVolumeLabel,
  onToggleMusic,
  onCycleVolume,
}) {
  const [showSession, setShowSession] = useState(false);

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-stack">
          <div className="logo">🎰 Moulibet</div>
          <div className="header-meta">
            <span className={`api-pill ${apiHealth.status}`}>{apiHealth.message}</span>
            <span className="api-pill subdued">{apiBaseUrl}</span>
          </div>
        </div>
        <div className="header-audio">
          <button type="button" className="audio-chip" onClick={onToggleMusic}>
            {musicPlaying ? 'Pause musique' : 'Lancer musique'}
          </button>
          <button type="button" className="audio-chip secondary" onClick={onCycleVolume}>
            Volume {musicVolumeLabel}
          </button>
        </div>
      </div>

      <div className="header-status">
        <div className="jackpot-block compact">
          <div className="jackpot-info">
            <div className="jackpot-label">Jackpot courant</div>
            <div className="jackpot-value">{jackpot} 🪙</div>
          </div>
          <div className="selected-game-card">
            <div className="selected-game-title">{selectedGameLabel}</div>
            <div className="selected-game-subtitle">
              {creator ? creator.email : creatorEmail || 'Connecte un créateur pour envoyer des transactions.'}
            </div>
          </div>
        </div>

        <button type="button" className="ghost-button" onClick={() => setShowSession((value) => !value)}>
          {showSession ? 'Réduire l’API' : 'Afficher l’API'}
        </button>
      </div>

      {showSession ? (
        <div className="session-panel">
          <div className="session-grid">
            <div className="session-card">
              <div className="section-title">Connexion API</div>
              <div className="field-stack">
                <input
                  type="email"
                  placeholder="Email du créateur"
                  value={forms.email}
                  onChange={(event) => onFormChange('email', event.target.value)}
                />
                <div className="inline-actions">
                  <button type="button" onClick={onRegisterCreator} disabled={loading.register}>
                    {loading.register ? 'Création...' : 'Créer / régénérer la clé'}
                  </button>
                  <button type="button" className="secondary-button" onClick={onSaveApiKey}>
                    Charger la clé
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Clé API"
                  value={forms.apiKey}
                  onChange={(event) => onFormChange('apiKey', event.target.value)}
                />
                <div className="session-hint">Clé courante: {maskApiKey(apiKey)}</div>
              </div>
            </div>

            <div className="session-card">
              <div className="section-title">Création de jeu</div>
              <div className="field-stack">
                <input
                  type="text"
                  placeholder="Nom du jeu"
                  value={forms.gameName}
                  onChange={(event) => onFormChange('gameName', event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={forms.description}
                  onChange={(event) => onFormChange('description', event.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Jackpot initial"
                  value={forms.initialJackpot}
                  onChange={(event) => onFormChange('initialJackpot', event.target.value)}
                />
                <div className="inline-actions">
                  <button type="button" onClick={onCreateGame} disabled={loading.createGame || !apiKey}>
                    {loading.createGame ? 'Création...' : 'Créer le jeu'}
                  </button>
                </div>
              </div>
            </div>

            <div className="session-card">
              <div className="section-title">Jeux disponibles</div>
              <div className="games-list compact">
                {games.length === 0 ? (
                  <div className="empty-state">Aucun jeu enregistré.</div>
                ) : (
                  games.map((game) => (
                    <button
                      key={game.id}
                      type="button"
                      className={`game-row ${selectedGame?.id === game.id ? 'active' : ''}`}
                      onClick={() => onSelectGame(game.id)}
                    >
                      <span>
                        <strong>{game.name}</strong>
                        <small>{game.status} · {game.current_jackpot} 🪙</small>
                      </span>
                      <span className="game-row-badge">#{game.id}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="header-feedback">
        {notice ? <div className="feedback-banner success">{notice}</div> : null}
        {error ? <div className="feedback-banner error">{error}</div> : null}
        {!isRemoteMode ? <div className="feedback-banner muted">Mode démo actif. Branche une clé API pour enregistrer les transactions.</div> : null}
      </div>
    </header>
  );
}