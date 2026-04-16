// API base URL - relative in production (Docker), absolute in dev
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:8000');

const getToken = () => {
  return localStorage.getItem('token');
};

const setToken = (token) => {
  localStorage.setItem('token', token);
};

const removeToken = () => {
  localStorage.removeItem('token');
};

// Authenticated API request with auto-retry and error handling
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add cache-busting timestamp for GET requests (only if method is GET or undefined)
  const isGetRequest = !options.method || options.method === 'GET';
  // Cache busting for GET requests
  const url = isGetRequest
    ? (endpoint.includes('?') 
        ? `${API_BASE_URL}${endpoint}&_t=${Date.now()}`
        : `${API_BASE_URL}${endpoint}?_t=${Date.now()}`)
    : `${API_BASE_URL}${endpoint}`;

  try {
    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`, {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      headers: Object.keys(headers),
      body: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : null
    });
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    console.log(`📡 API Response: ${response.status} ${response.statusText} for ${url}`);

    if (!response.ok) {
      if (response.status === 401) {
        if (token) {
          removeToken();
          window.location.href = '/login';
          throw new Error('Unauthorized - please login again');
        }
        const error = await response.json().catch(() => ({ detail: 'Unauthorized' }));
        throw new Error(error.detail || 'Unauthorized');
      }
      const error = await response.json().catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
      throw new Error(error.detail || `Request failed with status ${response.status}`);
    }

    // Handle 204 No Content responses (no body to parse)
    if (response.status === 204) {
      return null;
    }

    // Try to parse as JSON (response body can only be read once)
    try {
      const text = await response.text();
      // If text is empty, return null
      if (!text || text.trim() === '') {
        return null;
      }
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  } catch (error) {
    console.error('API Request Error:', {
      name: error.name,
      message: error.message,
      url: url,
      endpoint: endpoint
    });
    
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      throw new Error('Network error: Could not connect to server. Please check if the backend is running on http://localhost:8000');
    }
    if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      throw new Error('Network error: Could not connect to server. Please check if the backend is running on http://localhost:8000');
    }
    throw error;
  }
};
const publicApiRequest = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...options.headers,
  };

  const isGetRequest = !options.method || options.method === 'GET';
  const url = isGetRequest
    ? (endpoint.includes('?') 
        ? `${API_BASE_URL}${endpoint}&_t=${Date.now()}`
        : `${API_BASE_URL}${endpoint}?_t=${Date.now()}`)
    : `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
      throw new Error(error.detail || `Request failed with status ${response.status}`);
    }

    // Handle 204 No Content responses (no body to parse)
    if (response.status === 204) {
      return null;
    }

    // Try to parse as JSON (response body can only be read once)
    try {
      const text = await response.text();
      // If text is empty, return null
      if (!text || text.trim() === '') {
        return null;
      }
      return JSON.parse(text);
    } catch (e) {
      // If parsing fails (empty or invalid response), return null
      // This handles cases where the response is not JSON or is empty
      return null;
    }
  } catch (error) {
    // Handle network errors
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      throw new Error('Network error: Could not connect to server. Please check if the backend is running on http://localhost:8000');
    }
    // Handle connection refused or other network errors
    if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      throw new Error('Network error: Could not connect to server. Please check if the backend is running on http://localhost:8000');
    }
    throw error;
  }
};

export const authAPI = {
  login: async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username,
        password: password
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    setToken(data.access_token);
    return data;
  },

  logout: () => {
    removeToken();
  },

  getCurrentUser: () => {
    return apiRequest('/api/auth/me');
  },
};

export const adminAPI = {
  getDashboard: () => {
    return apiRequest('/api/admin/dashboard');
  },

  getUsers: () => {
    return apiRequest('/api/admin/users');
  },

  createUser: (data) => {
    return apiRequest('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getStats: () => {
    return apiRequest('/api/admin/stats');
  },

  getStatistics: () => {
    return publicApiRequest('/api/admin/statistics');
  },

  updateUser: (userId, data) => {
    return apiRequest(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteUser: (userId) => {
    return apiRequest(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    });
  },
};

export const teamsAPI = {
  getAll: () => {
    return apiRequest('/api/teams');
  },
  getById: (id) => {
    return apiRequest(`/api/teams/${id}`);
  },
  create: (data) => {
    return apiRequest('/api/teams', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  update: (id, data) => {
    return apiRequest(`/api/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  delete: (id) => {
    return apiRequest(`/api/teams/${id}`, {
      method: 'DELETE'
    });
  }
};

export const userTeamsAPI = {
  getMyTeams: () => {
    return apiRequest('/api/user-teams/me/teams');
  },
  getMyCompetitions: () => {
    return apiRequest('/api/user-teams/me/competitions');
  },
  getUserTeams: (userId) => {
    return apiRequest(`/api/user-teams/users/${userId}/teams`);
  },
  getTeamUsers: (teamId) => {
    return apiRequest(`/api/user-teams/teams/${teamId}/users`);
  },
  addUserToTeam: (userId, teamId) => {
    return apiRequest(`/api/user-teams/users/${userId}/teams/${teamId}`, {
      method: 'POST'
    });
  },
  removeUserFromTeam: (userId, teamId) => {
    return apiRequest(`/api/user-teams/users/${userId}/teams/${teamId}`, {
      method: 'DELETE'
    });
  }
};

export const competitionsAPI = {
  getAll: () => {
    return publicApiRequest('/api/competitions');
  },

  getById: (id) => {
    return publicApiRequest(`/api/competitions/${id}`);
  },

  create: (data) => {
    return apiRequest('/api/competitions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id, data) => {
    return apiRequest(`/api/competitions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id) => {
    return apiRequest(`/api/competitions/${id}`, {
      method: 'DELETE',
    });
  },

  delete: (id) => {
    return apiRequest(`/api/competitions/${id}`, {
      method: 'DELETE',
    });
  },
};

export const matchesAPI = {
  getAll: (competitionId = null) => {
    const url = competitionId 
      ? `/api/matches?competition_id=${competitionId}`
      : '/api/matches';
    return publicApiRequest(url);
  },

  getById: (id) => {
    return apiRequest(`/api/matches/${id}`);
  },

  create: (data) => {
    return apiRequest('/api/matches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id, data) => {
    return apiRequest(`/api/matches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id) => {
    return apiRequest(`/api/matches/${id}`, {
      method: 'DELETE',
    });
  },
  
  start: (id) => {
    return apiRequest(`/api/matches/${id}/start`, {
      method: 'POST',
    });
  },
  
  pause: (id) => {
    return apiRequest(`/api/matches/${id}/pause`, {
      method: 'POST',
    });
  },
  
  updateTimer: (id, currentTime) => {
    return apiRequest(`/api/matches/${id}/timer`, {
      method: 'PUT',
      body: JSON.stringify({ current_time: currentTime })
    });
  },
};

export const resultsAPI = {
  getAll: (matchId = null) => {
    const url = matchId 
      ? `/api/results?match_id=${matchId}`
      : '/api/results';
    return apiRequest(url);
  },

  create: (data) => {
    return apiRequest('/api/results', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id, data) => {
    return apiRequest(`/api/results/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

export const penaltiesAPI = {
  getAll: (matchId = null, teamId = null) => {
    let url = '/api/penalties?';
    if (matchId) url += `match_id=${matchId}&`;
    if (teamId) url += `team_id=${teamId}&`;
    return apiRequest(url.slice(0, -1));
  },

  create: (data) => {
    return apiRequest('/api/penalties', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id, data) => {
    return apiRequest(`/api/penalties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id) => {
    return apiRequest(`/api/penalties/${id}`, {
      method: 'DELETE',
    });
  },
};

export { getToken, setToken, removeToken };

