const API_BASE_URL = import.meta.env.VITE_EPIBET_API_URL || 'http://localhost:8000';

async function request(path, { method = 'GET', body, apiKey } = {}) {
  const headers = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error || data?.message || `Request failed with ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const epibetApi = {
  baseUrl: API_BASE_URL,
  health() {
    return request('/api/health');
  },
  registerCreator(email) {
    return request('/auth/register', {
      method: 'POST',
      body: { email },
    });
  },
  getMe(apiKey) {
    return request('/auth/me', { apiKey });
  },
  createGame(apiKey, payload) {
    return request('/games', {
      method: 'POST',
      apiKey,
      body: payload,
    });
  },
  listGames(apiKey) {
    return request('/games/my-games', { apiKey });
  },
  recordTransaction(apiKey, gameId, payload) {
    return request(`/games/${gameId}/transactions`, {
      method: 'POST',
      apiKey,
      body: payload,
    });
  },
  getPublicRanking() {
    return request('/public/ranking');
  },
  getPublicStats() {
    return request('/public/stats');
  },
  getPublicAlerts() {
    return request('/public/alerts');
  },
  getCreatorOverview(apiKey) {
    return request('/creator/overview', { apiKey });
  },
  getCreatorGameStats(apiKey, gameId) {
    return request(`/creator/games/${gameId}/stats`, { apiKey });
  },
  getCreatorTransactions(apiKey, gameId) {
    return request(`/creator/games/${gameId}/transactions`, { apiKey });
  },
  getCreatorAlerts(apiKey, gameId) {
    return request(`/creator/games/${gameId}/alerts`, { apiKey });
  },
};