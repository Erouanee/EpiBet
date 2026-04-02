import React, { useRef, useEffect, useState } from 'react';

export default function ScratchCell({ symbol, index, onScratchComplete, forceReveal, ticketId, onFirstScratch }) {
  const canvasRef = useRef(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const isDrawing = useRef(false);
  
  // NOUVEAU : Cette référence garde en mémoire si la case est déjà validée, 
  // sans pour autant redéclencher un rendu React qui couperait ton grattage.
  const hasValidated = useRef(false); 

  const onScratchCompleteRef = useRef(onScratchComplete);
  const onFirstScratchRef = useRef(onFirstScratch);

  useEffect(() => {
    onScratchCompleteRef.current = onScratchComplete;
    onFirstScratchRef.current = onFirstScratch;
  });

  // --- 1. DESSIN INITIAL DU MASQUE & DU '?' ---
  useEffect(() => {
      setIsRevealed(false);
      hasValidated.current = false; 

      const initCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        
        if (w === 0 || h === 0) {
          requestAnimationFrame(initCanvas);
          return;
        }

        canvas.width = w;
        canvas.height = h;
        
        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#9070d0');
        grad.addColorStop(1, '#6040b0');
        ctx.globalCompositeOperation = 'source-over'; 
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = `bold ${Math.floor(h * 0.42)}px 'Bebas Neue', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', w / 2, h / 2);
      };

      // 🛡️ LE FIX EST ICI : On attend que toutes les polices soient chargées avant de peindre le canvas
      document.fonts.ready.then(() => {
        initCanvas();
      });

  }, [ticketId]);

  // --- 2. BOUTON "RÉVÉLER TOUT" ---
  useEffect(() => {
    if (forceReveal && !hasValidated.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsRevealed(true);
        hasValidated.current = true;
        onScratchCompleteRef.current(index); 
    }
  }, [forceReveal, index]);

  // --- 3. LOGIQUE DE GRATTAGE ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    const scratch = (x, y) => {
      if (forceReveal) return; // On bloque uniquement si on a fait "Révéler tout"
      
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 40, 0, Math.PI * 2); 
      ctx.fill();
      
      checkCompletion();
    };

    const checkCompletion = () => {
      // 🚀 SUPER OPTIMISATION : Si la case a déjà franchi les 20%, 
      // on ne recalcule plus les pixels pour économiser la puissance du PC !
      if (hasValidated.current) return;

      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return;

      const imageData = ctx.getImageData(0, 0, w, h).data;
      let transparentPixels = 0;
      
      for (let i = 3; i < imageData.length; i += 4) {
        if (imageData[i] < 128) transparentPixels++;
      }

      if (transparentPixels / (w * h) > 0.15) {
        console.log(`Case ${index} validée !`);
        hasValidated.current = true; // On marque la case comme validée
        setIsRevealed(true);
        onScratchCompleteRef.current(index); // On prévient le Ticket que c'est bon
      }
    };

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return [clientX - rect.left, clientY - rect.top];
    };

    const handleStart = (e) => {
      if (forceReveal) return;
      
      onFirstScratchRef.current(); 
      
      if (e.cancelable) e.preventDefault();
      isDrawing.current = true;
      scratch(...getPos(e));
    };

    const handleMove = (e) => {
      if (!isDrawing.current || forceReveal) return;
      if (e.cancelable) e.preventDefault();
      scratch(...getPos(e));
    };

    const handleEnd = () => { isDrawing.current = false; };

    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleStart);
      canvas.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      canvas.removeEventListener('touchstart', handleStart);
      canvas.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [forceReveal, index]); 

  return (
    <div className="scratch-cell">
      <div className="cell-revealed">
        {symbol || '\u00A0'}
      </div>
      <canvas 
        ref={canvasRef} 
        className="scratch-canvas"
        // Le joueur peut continuer à gratter tant que ce n'est pas "Révélé de force"
        style={{ pointerEvents: forceReveal ? 'none' : 'auto' }}
      />
    </div>
  );
}