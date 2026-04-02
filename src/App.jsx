import React, { useState } from 'react';
import Header from './components/Header';
import GameZone from './components/GameZone';
import History from './components/History';

const SYMBOLS = ['🍒', '⭐', '🍀', '🔔', '💎', '💰'];
const GAINS_MAP = { '🍒': 2, '⭐': 3, '🍀': 4, '🔔': 5, '💎': 8, '💰': 10 };
const WEIGHTS = [35, 25, 20, 12, 6, 2];

const weightedRandom = () => {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SYMBOLS.length; i++) { 
    r -= WEIGHTS[i]; 
    if (r <= 0) return SYMBOLS[i]; 
  }
  return SYMBOLS[0];
};

const hasThreeIdentical = (syms) => {
  return SYMBOLS.some(s => syms.filter(x => x === s).length >= 3);
};

const generateGrid = (isWin) => {
  let syms = Array.from({ length: 9 }, () => weightedRandom());
  if (isWin) {
    const winner = weightedRandom();
    const pos = [...Array(9).keys()].sort(() => Math.random() - 0.5).slice(0, 3);
    pos.forEach(p => syms[p] = winner);
  } else {
    while (hasThreeIdentical(syms)) {
      syms = Array.from({ length: 9 }, () => weightedRandom());
    }
  }
  return syms;
};

export default function App() {
  const [jackpot, setJackpot] = useState(30); 
  const [mise, setMise] = useState(1); 
  
  // NOUVEAU : On gère un ID de ticket et une grille vide par défaut
  const [ticketId, setTicketId] = useState(1);
  const [currentGrid, setCurrentGrid] = useState(Array(9).fill(''));
  const [gameActive, setGameActive] = useState(false);
  
  const [stats, setStats] = useState({ totalGames: 0, totalProfit: 0, totalWins: 0 });
  const [history, setHistory] = useState([]);

  const startGame = () => {
      if (gameActive) return; // Sécurité

      if (jackpot < mise) {
        alert("💀 Jackpot épuisé ou insuffisant !");
        return;
      }

      const minGain = mise * Math.min(...Object.values(GAINS_MAP));
      const canPay = jackpot >= minGain;

      let winChance = 0.3;
      const isWin = Math.random() < winChance && canPay;
  
      const newGrid = generateGrid(isWin); 

      setCurrentGrid(newGrid);
      setGameActive(true);
  };

  // NOUVEAU : Fonction pour remettre un ticket neuf à la demande du joueur
  const prepareNextTicket = () => {
      setCurrentGrid(Array(9).fill('')); 
      setTicketId(prev => prev + 1); 
  };

  const handleGameEnd = (isWin, winSym) => {
    setGameActive(false);

    const gain = isWin ? mise * GAINS_MAP[winSym] : 0;
    const profitStand = mise - gain;
    const newJackpot = Math.max(0, jackpot + profitStand);
    
    setJackpot(newJackpot);
    setStats(prev => ({
      totalGames: prev.totalGames + 1,
      totalProfit: prev.totalProfit + profitStand,
      totalWins: isWin ? prev.totalWins + 1 : prev.totalWins
    }));

    const historyItem = {
      id: Date.now(), isWin, winSym, mise, gain, jackpotResult: newJackpot,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setHistory([historyItem, ...history]);
  };

  return (
    <div className="app-container">
      <Header jackpot={jackpot} setJackpot={setJackpot} />
      <main>
        <GameZone 
          mise={mise} 
          setMise={setMise}
          jackpot={jackpot}
          gameActive={gameActive}
          startGame={startGame}
          prepareNextTicket={prepareNextTicket} 
          ticketId={ticketId}
          currentGrid={currentGrid}
          handleGameEnd={handleGameEnd}
          gainsMap={GAINS_MAP}
        />
        <History stats={stats} history={history} />
      </main>
    </div>
  );
}