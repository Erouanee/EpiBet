import React, { useCallback, useEffect, useRef, useState } from 'react';

const TARGET_WIN_RATE = 1 / 9;
const OUTCOME_WEIGHTS = [42, 22, 21, 9, 4, 2];
const SPIN_WEIGHTS = [30, 24, 19, 13, 8, 4];

const weightedSymbol = (symbols, weights) => {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let target = Math.random() * totalWeight;

  for (let index = 0; index < symbols.length; index += 1) {
    target -= weights[index];
    if (target <= 0) {
      return symbols[index];
    }
  }

  return symbols[0];
};

export default function Ticket({ symbols, gameActive, handleGameEnd, mise, ticketId, spinMode, onStartManual, onStartAuto }) {
  const [reels, setReels] = useState(['🎲', '🎲', '🎲']);
  const [stopped, setStopped] = useState([false, false, false]);
  const spinInterval = useRef(null);
  const hasSettled = useRef(false);
  const stoppedRef = useRef([false, false, false]);
  const autoStopTimers = useRef([]);
  const outcomeRef = useRef({ isWin: false, winSym: null, finalReels: ['🎲', '🎲', '🎲'] });

  const buildOutcome = useCallback(() => {
    const isWin = Math.random() < TARGET_WIN_RATE;

    if (isWin) {
      const winSym = weightedSymbol(symbols, OUTCOME_WEIGHTS);
      return {
        isWin: true,
        winSym,
        finalReels: [winSym, winSym, winSym],
      };
    }

    const finalReels = [
      weightedSymbol(symbols, OUTCOME_WEIGHTS),
      weightedSymbol(symbols, OUTCOME_WEIGHTS),
      weightedSymbol(symbols, OUTCOME_WEIGHTS),
    ];
    while (finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2]) {
      finalReels[2] = weightedSymbol(symbols, OUTCOME_WEIGHTS);
    }

    return {
      isWin: false,
      winSym: null,
      finalReels,
    };
  }, [symbols]);

  const stopReel = useCallback((index) => {
    if (!gameActive) {
      return;
    }

    setStopped((previous) => {
      const nextStopIndex = previous.findIndex((value) => !value);

      if (nextStopIndex === -1 || index !== nextStopIndex) {
        return previous;
      }

      if (previous[index]) {
        return previous;
      }

      const next = previous.map((value, currentIndex) => (currentIndex === index ? true : value));
      stoppedRef.current = next;

      setReels((currentReels) => currentReels.map((sym, reelIndex) => (
        reelIndex === index ? outcomeRef.current.finalReels[reelIndex] : sym
      )));

      return next;
    });
  }, [gameActive]);

  const stopNextReel = useCallback(() => {
    const nextStopIndex = stoppedRef.current.findIndex((value) => !value);
    if (nextStopIndex >= 0) {
      stopReel(nextStopIndex);
    }
  }, [stopReel]);

  useEffect(() => {
    if (!gameActive) {
      if (spinInterval.current) {
        clearInterval(spinInterval.current);
        spinInterval.current = null;
      }

      autoStopTimers.current.forEach((timer) => clearTimeout(timer));
      autoStopTimers.current = [];
      return undefined;
    }

    hasSettled.current = false;
    stoppedRef.current = [false, false, false];
    outcomeRef.current = buildOutcome();

    if (spinInterval.current) {
      clearInterval(spinInterval.current);
      spinInterval.current = null;
    }

    spinInterval.current = setInterval(() => {
      setReels((previous) => previous.map((symbol, index) => (
        stoppedRef.current[index] ? symbol : weightedSymbol(symbols, SPIN_WEIGHTS)
      )));
    }, 90);

    if (spinMode === 'auto') {
      autoStopTimers.current.forEach((timer) => clearTimeout(timer));
      autoStopTimers.current = [];

      const delays = [720, 1410, 2160].map((base, index) => base + Math.floor(Math.random() * 520) + index * 140);

      delays.forEach((delay, index) => {
        autoStopTimers.current.push(setTimeout(() => {
          stopReel(index);
        }, delay));
      });
    }

    return () => {
      if (spinInterval.current) {
        clearInterval(spinInterval.current);
        spinInterval.current = null;
      }
      autoStopTimers.current.forEach((timer) => clearTimeout(timer));
      autoStopTimers.current = [];
    };
  }, [gameActive, symbols, spinMode, stopReel, buildOutcome]);

  useEffect(() => {
    if (!gameActive || hasSettled.current || stopped.some((value) => !value)) {
      return;
    }

    hasSettled.current = true;

    if (spinInterval.current) {
      clearInterval(spinInterval.current);
      spinInterval.current = null;
    }

    handleGameEnd(outcomeRef.current.isWin, outcomeRef.current.winSym);
  }, [gameActive, stopped, handleGameEnd]);

  useEffect(() => {
    const handleKeyboard = (event) => {
      if (event.repeat) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();

        if (!gameActive) {
          onStartManual?.();
          return;
        }

        if (spinMode === 'manual') {
          stopNextReel();
        }
      }

      if (event.code === 'Enter') {
        event.preventDefault();

        if (!gameActive) {
          onStartAuto?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyboard);

    return () => {
      window.removeEventListener('keydown', handleKeyboard);
    };
  }, [gameActive, spinMode, stopNextReel, onStartManual, onStartAuto]);

  return (
    <div className="ticket">
      <div className="ticket-top">
        <div className="ticket-game-title">MOULI<span>BET</span></div>
      </div>

      <div className="ticket-body">
        <div className="slot-machine">
          <div className="slot-window">
            {reels.map((symbol, index) => (
              <div key={`${ticketId}-${index}`} className={`slot-reel ${stopped[index] ? 'stopped' : ''}`}>
                <div className="slot-symbol">{symbol}</div>
              </div>
            ))}
          </div>

          <div className="slot-controls">
            {reels.map((_, index) => (
              <button
                key={`stop-${index}`}
                type="button"
                className="slot-stop-btn"
                onClick={() => stopReel(index)}
                disabled={!gameActive || stopped[index] || stopped.findIndex((value) => !value) !== index}
              >
                STOP {index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ticket-footer">
        <div className="ticket-price">{mise} 🪙</div>
        <div className="ticket-rule"><strong>3 identiques = victoire</strong><br/>Espace = stop manuel, Entrée = auto</div>
        <div className="ticket-serial">EPB-{ticketId.toString().padStart(4, '0')}</div>
      </div>
    </div>
  );
}