import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header';
import GameZone from './components/GameZone';
import History from './components/History';
import GainsPanel from './components/GainsPanel';
import { epibetApi } from './lib/epibetApi';
import './App.css';

const SLOT_SYMBOLS = ['🍒', '⭐', '🍀', '🔔', '💎', '7️⃣'];
const GAINS_MAP = { '🍒': 2, '⭐': 3, '🍀': 4, '🔔': 6, '💎': 9, '7️⃣': 12 };
const WIN_SOUND_SRC = encodeURI('win.mp3');

const STORAGE_KEYS = {
  apiKey: 'epibet.apiKey',
  email: 'epibet.email',
  selectedGameId: 'epibet.selectedGameId',
  musicVolume: 'epibet.musicVolume',
  musicPlaying: 'epibet.musicPlaying',
};

const MUSIC_VOLUME_STEPS = [0, 0.25, 0.5, 0.75, 1];

const readStorage = (key) => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(key) || '';
};

const formatError = (error) => {
  if (!error) {
    return '';
  }

  return error instanceof Error ? error.message : String(error);
};

const persistSession = (nextApiKey, nextEmail, nextGameId) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (nextApiKey) {
    window.localStorage.setItem(STORAGE_KEYS.apiKey, nextApiKey);
  } else {
    window.localStorage.removeItem(STORAGE_KEYS.apiKey);
  }

  if (nextEmail) {
    window.localStorage.setItem(STORAGE_KEYS.email, nextEmail);
  }

  if (nextGameId) {
    window.localStorage.setItem(STORAGE_KEYS.selectedGameId, String(nextGameId));
  } else {
    window.localStorage.removeItem(STORAGE_KEYS.selectedGameId);
  }
};

export default function App() {
  const backgroundMusicRef = useRef(null);
  const winSoundRef = useRef(null);
  const coinRainTimeoutRef = useRef(null);
  const [apiKey, setApiKey] = useState(() => readStorage(STORAGE_KEYS.apiKey));
  const [creatorEmail, setCreatorEmail] = useState(() => readStorage(STORAGE_KEYS.email));
  const [selectedGameId, setSelectedGameId] = useState(() => {
    const stored = readStorage(STORAGE_KEYS.selectedGameId);
    return stored ? Number(stored) : null;
  });

  const [forms, setForms] = useState(() => ({
    email: readStorage(STORAGE_KEYS.email),
    apiKey: readStorage(STORAGE_KEYS.apiKey),
    gameName: '',
    description: '',
    initialJackpot: 30,
  }));

  const [jackpot, setJackpot] = useState(30);
  const [mise, setMise] = useState(1);
  const [ticketId, setTicketId] = useState(1);
  const [spinId, setSpinId] = useState(0);
  const [spinMode, setSpinMode] = useState('manual');
  const [gameActive, setGameActive] = useState(false);
  const [stats, setStats] = useState({ totalGames: 0, totalProfit: 0, totalWins: 0 });
  const [history, setHistory] = useState([]);

  const [apiHealth, setApiHealth] = useState({ status: 'checking', message: 'Connexion...' });
  const [loading, setLoading] = useState({ register: false, createGame: false, refresh: false, play: false });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [creator, setCreator] = useState(null);
  const [games, setGames] = useState([]);
  const [selectedGameTransactions, setSelectedGameTransactions] = useState([]);
  const [creatorOverview, setCreatorOverview] = useState(null);
  const [publicStats, setPublicStats] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [musicVolume, setMusicVolume] = useState(() => {
    const stored = Number(readStorage(STORAGE_KEYS.musicVolume));
    if (Number.isNaN(stored) || stored < 0 || stored > 1) {
      return 0.45;
    }
    return stored;
  });
  const [musicPlaying, setMusicPlaying] = useState(() => readStorage(STORAGE_KEYS.musicPlaying) !== 'false');
  const [musicBlocked, setMusicBlocked] = useState(false);
  const [showCoinRain, setShowCoinRain] = useState(false);
  const [coinRainBurst, setCoinRainBurst] = useState(0);

  const selectedGame = useMemo(() => games.find((game) => game.id === selectedGameId) || null, [games, selectedGameId]);
  const isRemoteMode = Boolean(apiKey && selectedGame);
  const activeJackpot = isRemoteMode ? selectedGame.current_jackpot : jackpot;

  const appendHistory = (entry) => {
    setHistory((previous) => [entry, ...previous]);
  };

  const loadSelectedTransactions = useCallback(async (nextApiKey = apiKey, nextGameId = selectedGameId) => {
    if (!nextApiKey || !nextGameId) {
      setSelectedGameTransactions([]);
      return [];
    }

    const transactions = await epibetApi.getCreatorTransactions(nextApiKey, nextGameId);
    setSelectedGameTransactions(transactions);
    return transactions;
  }, [apiKey, selectedGameId]);

  const refreshRemoteData = useCallback(async (nextApiKey = apiKey, nextGameId = selectedGameId) => {
    if (!nextApiKey) {
      return;
    }

    setLoading((previous) => ({ ...previous, refresh: true }));

    try {
      const [me, myGames, overview, statsData, rankingData, alertsData] = await Promise.all([
        epibetApi.getMe(nextApiKey),
        epibetApi.listGames(nextApiKey),
        epibetApi.getCreatorOverview(nextApiKey).catch(() => null),
        epibetApi.getPublicStats().catch(() => null),
        epibetApi.getPublicRanking().catch(() => []),
        epibetApi.getPublicAlerts().catch(() => []),
      ]);

      setCreator(me.creator || null);
      setGames(myGames);
      setCreatorOverview(overview);
      setPublicStats(statsData);
      setRanking(Array.isArray(rankingData) ? rankingData : []);
      setAlerts(Array.isArray(alertsData) ? alertsData : []);

      const nextSelectedGame = myGames.find((game) => game.id === nextGameId) || myGames[0] || null;

      if (nextSelectedGame && nextSelectedGame.id !== nextGameId) {
        setSelectedGameId(nextSelectedGame.id);
        persistSession(nextApiKey, creatorEmail, nextSelectedGame.id);
      }

      if (nextSelectedGame) {
        setJackpot(nextSelectedGame.current_jackpot);
        await loadSelectedTransactions(nextApiKey, nextSelectedGame.id);
      }

      setError('');
    } catch (refreshError) {
      setError(formatError(refreshError));
    } finally {
      setLoading((previous) => ({ ...previous, refresh: false }));
    }
  }, [apiKey, selectedGameId, creatorEmail, loadSelectedTransactions]);

  useEffect(() => {
    let mounted = true;

    const checkHealth = async () => {
      try {
        const health = await epibetApi.health();
        if (mounted) {
          setApiHealth({ status: 'online', message: health.message || 'API disponible' });
        }
      } catch (healthError) {
        if (mounted) {
          setApiHealth({ status: 'offline', message: formatError(healthError) || 'API indisponible' });
        }
      }
    };

    checkHealth();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    persistSession(apiKey, creatorEmail, selectedGameId);
  }, [apiKey, creatorEmail, selectedGameId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(STORAGE_KEYS.musicVolume, String(musicVolume));
    window.localStorage.setItem(STORAGE_KEYS.musicPlaying, String(musicPlaying));
  }, [musicVolume, musicPlaying]);

  useEffect(() => {
    const audio = backgroundMusicRef.current;
    if (!audio) {
      return;
    }

    audio.muted = musicVolume === 0;
    audio.volume = musicVolume;

    if (!musicPlaying) {
      audio.pause();
      setMusicBlocked(false);
      return;
    }

    const playPromise = audio.play();

    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise
        .then(() => {
          setMusicBlocked(false);
        })
        .catch(() => {
          setMusicBlocked(true);
        });
    }
  }, [musicVolume, musicPlaying]);

  const handleCycleVolume = () => {
    setMusicVolume((currentVolume) => {
      const currentIndex = MUSIC_VOLUME_STEPS.findIndex((step) => Math.abs(step - currentVolume) < 0.001);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % MUSIC_VOLUME_STEPS.length : 2;
      return MUSIC_VOLUME_STEPS[nextIndex];
    });
  };

  const musicVolumeLabel = musicVolume === 0 ? 'Muet' : `${Math.round(musicVolume * 100)}%`;

  const playWinSound = () => {
    const audio = winSoundRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0.9;

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  };

  const triggerCoinRain = () => {
    setCoinRainBurst((previous) => previous + 1);
    setShowCoinRain(true);

    if (coinRainTimeoutRef.current) {
      clearTimeout(coinRainTimeoutRef.current);
    }

    coinRainTimeoutRef.current = setTimeout(() => {
      setShowCoinRain(false);
      coinRainTimeoutRef.current = null;
    }, 1900);
  };

  useEffect(() => () => {
    if (coinRainTimeoutRef.current) {
      clearTimeout(coinRainTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!apiKey) {
      setCreator(null);
      setGames([]);
      setCreatorOverview(null);
      setPublicStats(null);
      setRanking([]);
      setAlerts([]);
      setSelectedGameTransactions([]);
      return;
    }

    void refreshRemoteData(apiKey, selectedGameId);
  }, [apiKey, selectedGameId, refreshRemoteData]);

  useEffect(() => {
    if (selectedGame) {
      setJackpot(selectedGame.current_jackpot);
    }
  }, [selectedGame]);

  useEffect(() => {
    if (!selectedGameId && games.length > 0) {
      setSelectedGameId(games[0].id);
    }
  }, [games, selectedGameId]);

  useEffect(() => {
    if (!apiKey || !selectedGameId) {
      return;
    }

    void loadSelectedTransactions(apiKey, selectedGameId).catch((loadError) => {
      setError(formatError(loadError));
    });
  }, [apiKey, selectedGameId, loadSelectedTransactions]);

  const handleFormChange = (field, value) => {
    setForms((previous) => ({ ...previous, [field]: value }));

    if (field === 'email') {
      setCreatorEmail(value);
    }

    if (field === 'apiKey') {
      setApiKey(value.trim());
    }
  };

  const handleRegisterCreator = async () => {
    const email = forms.email.trim();

    if (!email) {
      setError('Ajoute une adresse e-mail pour créer un créateur.');
      return;
    }

    setLoading((previous) => ({ ...previous, register: true }));
    setError('');

    try {
      const response = await epibetApi.registerCreator(email);
      setApiKey(response.apiKey);
      setCreatorEmail(email);
      setForms((previous) => ({ ...previous, apiKey: response.apiKey }));
      setCreator(response.creator || null);
      setNotice(response.message || 'Créateur enregistré.');
      persistSession(response.apiKey, email, selectedGameId);
      await refreshRemoteData(response.apiKey, selectedGameId);
    } catch (registerError) {
      setError(formatError(registerError));
    } finally {
      setLoading((previous) => ({ ...previous, register: false }));
    }
  };

  const handleSaveApiKey = () => {
    const nextKey = forms.apiKey.trim();
    setApiKey(nextKey);

    if (!nextKey) {
      setNotice('Mode démo activé.');
      persistSession('', creatorEmail, null);
      return;
    }

    setNotice('Clé API chargée.');
  };

  const handleCreateGame = async () => {
    if (!apiKey) {
      setError('Connecte une clé API avant de créer un jeu.');
      return;
    }

    const name = forms.gameName.trim();
    if (!name) {
      setError('Donne un nom au jeu avant de l’enregistrer.');
      return;
    }

    const initialJackpot = Number(forms.initialJackpot);
    if (!Number.isInteger(initialJackpot) || initialJackpot < 0) {
      setError('Le jackpot initial doit être un entier positif.');
      return;
    }

    setLoading((previous) => ({ ...previous, createGame: true }));
    setError('');

    try {
      const response = await epibetApi.createGame(apiKey, {
        name,
        description: forms.description.trim(),
        initial_jackpot: initialJackpot,
      });

      const nextGame = response.game;
      setNotice(response.message || 'Jeu créé.');
      setSelectedGameId(nextGame.id);
      setJackpot(nextGame.current_jackpot);
      setForms((previous) => ({
        ...previous,
        gameName: '',
        description: '',
        initialJackpot: nextGame.current_jackpot,
      }));
      persistSession(apiKey, creatorEmail, nextGame.id);
      await refreshRemoteData(apiKey, nextGame.id);
    } catch (createError) {
      setError(formatError(createError));
    } finally {
      setLoading((previous) => ({ ...previous, createGame: false }));
    }
  };

  const prepareNextTicket = () => {
    setTicketId((previous) => previous + 1);
  };

  const handleGameEnd = async (isWin, winSym) => {
    setGameActive(false);

    if (isWin) {
      playWinSound();
      triggerCoinRain();
    }

    const theoreticalGain = isWin ? mise * GAINS_MAP[winSym] : 0;
    const maxPayout = Math.max(0, activeJackpot + mise);
    const gain = Math.min(theoreticalGain, maxPayout);
    const profitStand = mise - gain;
    const historyItem = {
      id: Date.now(),
      isWin,
      winSym,
      mise,
      gain,
      jackpotResult: Math.max(0, activeJackpot + profitStand),
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      source: isRemoteMode ? 'api' : 'demo',
    };

    if (!isRemoteMode) {
      setJackpot(historyItem.jackpotResult);
      setStats((previous) => ({
        totalGames: previous.totalGames + 1,
        totalProfit: previous.totalProfit + profitStand,
        totalWins: isWin ? previous.totalWins + 1 : previous.totalWins,
      }));
      appendHistory(historyItem);

      if (historyItem.jackpotResult <= 0) {
        setNotice('Banque fermée: jackpot à 0 🪙.');
      }

      return;
    }

    setLoading((previous) => ({ ...previous, play: true }));
    setError('');

    try {
      const incomeResponse = await epibetApi.recordTransaction(apiKey, selectedGame.id, {
        type: 'income',
        amount: mise,
      });

      let latestGame = incomeResponse.game;

      if (isWin && gain > 0) {
        const payoutResponse = await epibetApi.recordTransaction(apiKey, selectedGame.id, {
          type: 'payout',
          amount: gain,
        });

        latestGame = payoutResponse.game || latestGame;
      }

      const nextJackpot = latestGame?.current_jackpot ?? historyItem.jackpotResult;
      setJackpot(nextJackpot);
      setGames((previous) => previous.map((game) => (game.id === selectedGame.id
        ? {
          ...game,
          current_jackpot: nextJackpot,
          status: nextJackpot <= 0 ? 'closed' : (latestGame?.status || game.status),
        }
        : game)));
      setStats((previous) => ({
        totalGames: previous.totalGames + 1,
        totalProfit: previous.totalProfit + profitStand,
        totalWins: isWin ? previous.totalWins + 1 : previous.totalWins,
      }));
      appendHistory(historyItem);
      setNotice(nextJackpot <= 0
        ? 'Banque fermée: jackpot à 0 🪙.'
        : (isWin ? 'Victoire enregistrée sur l’API.' : 'Défaite enregistrée sur l’API.'));

      await Promise.all([
        refreshRemoteData(apiKey, selectedGame.id),
        loadSelectedTransactions(apiKey, selectedGame.id),
      ]);
    } catch (gameError) {
      setError(formatError(gameError));
      setJackpot(historyItem.jackpotResult);
      setStats((previous) => ({
        totalGames: previous.totalGames + 1,
        totalProfit: previous.totalProfit + profitStand,
        totalWins: isWin ? previous.totalWins + 1 : previous.totalWins,
      }));
      appendHistory({ ...historyItem, source: 'fallback' });
    } finally {
      setLoading((previous) => ({ ...previous, play: false }));
    }
  };

  const startAutoGame = () => {
    if (gameActive) {
      return;
    }

    if (isRemoteMode && selectedGame?.status !== 'active') {
      setError('Ce jeu est fermé. Crée-en un autre pour continuer.');
      return;
    }

    if (activeJackpot < mise) {
      setError('Jackpot insuffisant pour lancer une partie.');
      return;
    }

    setError('');
    setSpinMode('auto');
    setSpinId((previous) => previous + 1);
    setGameActive(true);
  };

  const startManualGame = () => {
    if (gameActive) {
      return;
    }

    if (isRemoteMode && selectedGame?.status !== 'active') {
      setError('Ce jeu est fermé. Crée-en un autre pour continuer.');
      return;
    }

    if (activeJackpot < mise) {
      setError('Jackpot insuffisant pour lancer une partie.');
      return;
    }

    setError('');
    setSpinMode('manual');
    setSpinId((previous) => previous + 1);
    setGameActive(true);
  };

  return (
    <div className="app-container">
      {showCoinRain ? (
        <div className="coin-rain-layer" aria-hidden="true">
          {Array.from({ length: 32 }).map((_, index) => (
            <span
              key={`${coinRainBurst}-${index}`}
              className="coin-rain-coin"
              style={{
                left: `${2 + (index * 96) / 31}%`,
                animationDelay: `${(index % 8) * 0.08}s`,
                animationDuration: `${1.2 + (index % 6) * 0.18}s`,
                '--drift': `${(index % 2 === 0 ? -1 : 1) * (12 + (index % 7) * 7)}px`,
              }}
            >
              🪙
            </span>
          ))}
        </div>
      ) : null}

      <audio ref={backgroundMusicRef} src="/casino.mp3" loop preload="auto" />
      <audio ref={winSoundRef} src={WIN_SOUND_SRC} preload="auto" />

      <Header
        apiBaseUrl={epibetApi.baseUrl}
        apiHealth={apiHealth}
        apiKey={apiKey}
        creator={creator}
        creatorEmail={creatorEmail}
        forms={forms}
        loading={loading}
        notice={notice}
        error={error}
        jackpot={activeJackpot}
        selectedGame={selectedGame}
        selectedGameLabel={selectedGame ? `${selectedGame.name} · ${selectedGame.status}` : 'Mode démo'}
        games={games}
        isRemoteMode={isRemoteMode}
        onFormChange={handleFormChange}
        onRegisterCreator={handleRegisterCreator}
        onSaveApiKey={handleSaveApiKey}
        onCreateGame={handleCreateGame}
        onSelectGame={(gameId) => {
          setSelectedGameId(gameId);
          persistSession(apiKey, creatorEmail, gameId);
        }}
        musicPlaying={musicPlaying}
        musicVolumeLabel={musicVolumeLabel}
        onToggleMusic={() => setMusicPlaying((previous) => !previous)}
        onCycleVolume={handleCycleVolume}
      />

      <main className="app-main">
        <GainsPanel gainsMap={GAINS_MAP} mise={mise} />

        <GameZone
          mise={mise}
          setMise={setMise}
          jackpot={activeJackpot}
          gameActive={gameActive}
          prepareNextTicket={prepareNextTicket}
          ticketId={ticketId}
          spinId={spinId}
          spinMode={spinMode}
          handleGameEnd={handleGameEnd}
          gainsMap={GAINS_MAP}
          symbols={SLOT_SYMBOLS}
          selectedGame={selectedGame}
          isRemoteMode={isRemoteMode}
          loading={loading}
          onStartManual={startManualGame}
          onStartAuto={startAutoGame}
        />

        <History
          stats={stats}
          history={history}
          creatorOverview={creatorOverview}
          publicStats={publicStats}
          ranking={ranking}
          alerts={alerts}
          selectedGame={selectedGame}
          selectedGameTransactions={selectedGameTransactions}
          loading={loading}
          apiHealth={apiHealth}
        />
      </main>

      {musicBlocked ? <div className="audio-toast">Le navigateur bloque l'autoplay. Clique sur Musique.</div> : null}
    </div>
  );
}