const CURRENT_USER_KEY = 'attendance_current_user';
const TOKEN_KEY = 'attendance_token';
const API_BASE = 'http://localhost:8001';

// Helper to get auth headers. Set json=false for FormData uploads so the
// browser can set the multipart boundary (do not force application/json).
export const getAuthHeaders = ({ json = true } = {}) => {
  const token = getToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (json) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

// Normalize FastAPI error payloads (string, object, or validation array).
export const parseApiError = (errorData, fallback = 'Request failed') => {
  const detail = errorData?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item === 'string' ? item : item?.msg || JSON.stringify(item)))
      .join('; ');
  }
  if (typeof detail === 'object') return detail.msg || JSON.stringify(detail);
  return String(detail);
};

// Get token from localStorage
export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

// Save token to localStorage
export const saveToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

// Save current user to localStorage
export const saveCurrentUser = (user) => {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
};

// Get current user from localStorage
export const getCurrentUser = () => {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Logout - clear token and user
export const logoutUser = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
};

// Register a new user (calls backend /api/signup)
export const registerUser = async ({ username, email, password, role, employeeId }) => {
  const response = await fetch(`${API_BASE}/api/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      email,
      password,
      role,
      employee_id: employeeId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Registration failed');
  }

  return await response.json();
};

// Login user (calls backend /token)
export const loginUser = async ({ username, password }) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE}/token`, {
        method: 'POST',
        body: formData,
    });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Login failed');
  }

  const tokenData = await response.json();
  saveToken(tokenData.access_token);

  // Fetch user data
  const userResponse = await fetch(`${API_BASE}/api/users/me`, {
    headers: getAuthHeaders(),
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch user data');
  }

  const user = await userResponse.json();
  saveCurrentUser(user);
  return user;
};

export const validateCurrentUser = async () => {
  const token = getToken();
  if (!token) return null;

  const response = await fetch(`${API_BASE}/api/users/me`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    logoutUser();
    return null;
  }

  const user = await response.json();
  saveCurrentUser(user);
  return user;
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getToken();
};

// Check if current user is HR
export const isHR = () => {
  const user = getCurrentUser();
  return user && user.role === 'hr';
};

// Check if current user is Employee
export const isEmployee = () => {
  const user = getCurrentUser();
  return user && user.role === 'employee';
};
