import React, { useState } from 'react';

export default function Header({ jackpot, setJackpot }) {
  const [inputValue, setInputValue] = useState('');

  const updateJackpot = () => {
    const val = parseInt(inputValue);
    if (!isNaN(val) && val >= 0) {
      setJackpot(val);
      setInputValue('');
    }
  };

  return (
    <header>
      <div className="logo">🎰 EpiBet</div>
      <div className="jackpot-block">
        <div className="jackpot-info">
          <div className="jackpot-label">Jackpot restant</div>
          <div className="jackpot-value">{jackpot} 🪙</div>
        </div>
        <div className="jackpot-edit">
          <input 
            type="number" 
            min="0" 
            placeholder="Ex: 30" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button onClick={updateJackpot}>Màj</button>
        </div>
      </div>
    </header>
  );
}