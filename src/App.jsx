import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import GameZone from './components/GameZone';
import History from './components/History';
import { epibetApi } from './lib/epibetApi';
import './App.css';

const SYMBOLS = ['🍒', '⭐', '🍀', '🔔', '💎', '💰'];
const GAINS_MAP = { '🍒': 2, '⭐': 3, '🍀': 4, '🔔': 5, '💎': 8, '💰': 10 };
const WEIGHTS = [35, 25, 20, 12, 6, 2];

const weightedRandom = () => {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SYMBOLS.length; i += 1) {
    r -= WEIGHTS[i];
    if (r <= 0) return SYMBOLS[i];
  }
  return SYMBOLS[0];
};

const hasThreeIdentical = (syms) => SYMBOLS.some((symbol) => syms.filter((value) => value === symbol).length >= 3);

const generateGrid = (isWin) => {
  let syms = Array.from({ length: 9 }, () => weightedRandom());

  if (isWin) {
    const winner = weightedRandom();
    const positions = [...Array(9).keys()].sort(() => Math.random() - 0.5).slice(0, 3);
    positions.forEach((position) => {
      syms[position] = winner;
    });
  } else {
    while (hasThreeIdentical(syms)) {
      syms = Array.from({ length: 9 }, () => weightedRandom());
    }
  }

  return syms;
};

const STORAGE_KEYS = {
  apiKey: 'epibet.apiKey',
  email: 'epibet.email',
  selectedGameId: 'epibet.selectedGameId',
};

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
  const [currentGrid, setCurrentGrid] = useState(Array(9).fill(''));
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
    setCurrentGrid(Array(9).fill(''));
    setTicketId((previous) => previous + 1);
  };

  const handleGameEnd = async (isWin, winSym) => {
    setGameActive(false);

    const gain = isWin ? mise * GAINS_MAP[winSym] : 0;
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
      setGames((previous) => previous.map((game) => (game.id === selectedGame.id ? { ...game, current_jackpot: nextJackpot, status: latestGame?.status || game.status } : game)));
      setStats((previous) => ({
        totalGames: previous.totalGames + 1,
        totalProfit: previous.totalProfit + profitStand,
        totalWins: isWin ? previous.totalWins + 1 : previous.totalWins,
      }));
      appendHistory(historyItem);
      setNotice(isWin ? 'Victoire enregistrée sur l’API.' : 'Défaite enregistrée sur l’API.');

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

  const startGame = () => {
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

    const minGain = mise * Math.min(...Object.values(GAINS_MAP));
    const canPay = activeJackpot >= minGain;
    const isWin = Math.random() < 0.3 && canPay;

    setCurrentGrid(generateGrid(isWin));
    setGameActive(true);
  };

  return (
    <div className="app-container">
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
      />

      <main className="app-main">
        <GameZone
          mise={mise}
          setMise={setMise}
          jackpot={activeJackpot}
          gameActive={gameActive}
          startGame={startGame}
          prepareNextTicket={prepareNextTicket}
          ticketId={ticketId}
          currentGrid={currentGrid}
          handleGameEnd={handleGameEnd}
          gainsMap={GAINS_MAP}
          selectedGame={selectedGame}
          isRemoteMode={isRemoteMode}
          loading={loading}
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
    </div>
  );
}