import React, { useState, useEffect, useRef } from 'react';
import ScratchCell from './ScratchCell';

const SYMBOLS = ['🍒', '⭐', '💎', '🍀', '🔔', '7️⃣'];

export default function Ticket({ currentGrid, gameActive, handleGameEnd, mise, forceReveal, ticketId, startGame }) {
  const [scratchedCount, setScratchedCount] = useState(0);
  const scratchedSet = useRef(new Set());

  // NOUVEAU : C'est ici qu'on surveille l'avancement de manière sécurisée
  useEffect(() => {
    if (gameActive && scratchedCount === 9) {
      // Les 9 cases sont grattées, on vérifie la victoire sur la bonne grille !
      const winSym = SYMBOLS.find(s => currentGrid.filter(x => x === s).length >= 3) || null;
      const isWin = winSym !== null;
      handleGameEnd(isWin, winSym);
    }
  }, [scratchedCount, gameActive, currentGrid, handleGameEnd]);

  const handleFirstScratch = () => {
      if (!gameActive && currentGrid[0] === '') {
          startGame();
      }
  };

  const onScratchComplete = (index) => {
    if (scratchedSet.current.has(index)) return; 
    
    scratchedSet.current.add(index);
    setScratchedCount(scratchedSet.current.size);
  };

  return (
    <div className="ticket">
      <div className="ticket-top">
        <div className="ticket-game-title">EPI<span>BET</span></div>
        <div className="ticket-tagline">
          Trouvez 3 symboles identiques pour gagner !
          <small>Le jackpot est mis à jour en temps réel</small>
        </div>
      </div>

      <div className="ticket-body">
        <div className="scratch-grid">
          {currentGrid.map((sym, i) => (
            <ScratchCell 
              key={`${ticketId}-${i}`} 
              index={i} 
              symbol={sym} 
              forceReveal={forceReveal}
              ticketId={ticketId}
              onScratchComplete={onScratchComplete} 
              onFirstScratch={handleFirstScratch}
            />
          ))}
        </div>
      </div>

      <div className="ticket-footer">
        <div className="ticket-price">{mise} 🪙</div>
        <div className="ticket-rule"><strong>3 identiques = victoire</strong><br/>Grattez pour révéler</div>
        <div className="ticket-serial">EPB-{ticketId.toString().padStart(4, '0')}</div>
      </div>
    </div>
  );
}