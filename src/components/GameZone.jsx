import React, { useState } from 'react';
import Ticket from './Ticket';

export default function GameZone({
  mise,
  setMise,
  jackpot,
  gameActive,
  startGame,
  prepareNextTicket,
  ticketId,
  currentGrid,
  handleGameEnd,
  gainsMap,
  selectedGame,
  isRemoteMode,
  loading,
}) {
  const [forceReveal, setForceReveal] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const onGameEndIntercept = (isWin, winSym) => {
    setForceReveal(false);
    if (isWin) {
      setLastResult({ type: 'win', msg: `🎉 GAGNÉ ! → +${mise * gainsMap[winSym]} 🪙` });
    } else {
      setLastResult({ type: 'lose', msg: `😢 PERDU — Mise : ${mise} 🪙` });
    }
    handleGameEnd(isWin, winSym);
  };

  const handleNextTicket = () => {
    setLastResult(null);
    setForceReveal(false);
    prepareNextTicket();
  };

  const isTicketNew = !gameActive && currentGrid[0] === '';

  const handleMiseChange = (newMise) => {
    if (gameActive) return; 
    setMise(newMise);
    if (!isTicketNew) {
      handleNextTicket();
    }
  };

  const handleRevealAll = () => {
    if (isTicketNew) {
      startGame();
    }
    setForceReveal(true);
  };

  return (
    <div className="game-zone">
      <div className="game-zone-header">
        <div>
          <div className="section-title">Partie live</div>
          <div className="game-zone-title">
            {selectedGame ? selectedGame.name : 'Borne démo'}
          </div>
        </div>
        <div className="game-zone-badges">
          <span className={`game-zone-chip ${isRemoteMode ? 'api' : 'demo'}`}>
            {isRemoteMode ? 'Synchronisé API' : 'Mode démo'}
          </span>
          <span className="game-zone-chip gold">Jackpot {jackpot} 🪙</span>
          {loading.play ? <span className="game-zone-chip muted">Envoi en cours...</span> : null}
        </div>
      </div>

      <div>
        <div className="mise-label">Choisir la mise</div>
        <div className="mise-selector">
          <button className={`mise-btn ${mise === 1 ? 'active' : ''}`} onClick={() => handleMiseChange(1)}>1 🪙</button>
          <button className={`mise-btn ${mise === 2 ? 'active' : ''}`} onClick={() => handleMiseChange(2)}>2 🪙</button>
        </div>
      </div>

      <Ticket 
        key={ticketId}
        currentGrid={currentGrid} 
        gameActive={gameActive} 
        handleGameEnd={onGameEndIntercept} 
        mise={mise} 
        forceReveal={forceReveal}
        ticketId={ticketId}
        startGame={startGame}
      />

      {/* ZONE FIXE POUR LA BANNIÈRE (Utilisation de height au lieu de minHeight) */}
      <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        {lastResult && !gameActive && (
          <div className={`result-banner ${lastResult.type}`} style={{ display: 'block', width: '100%', margin: 0 }}>
            {lastResult.msg}
          </div>
        )}
      </div>

      {/* RANGÉE DE BOUTONS BLINDÉE */}
      <div className="action-row" style={{ height: '70px', display: 'flex', gap: '10px' }}>
        <button 
          className="btn-play" 
          style={{ 
            flex: 1, 
            position: 'relative', // Nécessaire pour le span absolute enfant
            height: '100%', 
            background: isTicketNew ? '#5535a0' : '' 
          }} 
          disabled={isTicketNew || gameActive}
          onClick={(!isTicketNew && !gameActive) ? handleNextTicket : undefined}
        >
          {/* LE FIX ULTIME DU BOUTON : Le texte flotte de manière absolue et n'influence pas la taille du bouton */}
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isTicketNew ? '👆 GRATTEZ POUR JOUER' : gameActive ? 'PARTIE EN COURS...' : '🎟️ TICKET SUIVANT'}
          </span>
        </button>
        
        <button 
          className="btn-reveal" 
          style={{ 
            display: 'block', 
            height: '100%',
            visibility: (isTicketNew || gameActive) ? 'visible' : 'hidden' 
          }} 
          onClick={handleRevealAll}
        >
            Révéler tout
        </button>
      </div>

      <div className="gains-section">
        <div className="gains-section-title">Gains possibles selon la mise</div>
        <div className="gains-grid">
          {Object.entries(gainsMap).map(([sym, mult]) => (
            <div key={sym} className="gain-item">
              <span className="gain-sym">{sym}{sym}{sym}</span>
              {/* <span className="gain-x">x{mult}</span> */}
              <span className="gain-amount">+{mise * mult} 🪙</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}