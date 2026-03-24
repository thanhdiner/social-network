import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies (refresh token)
});

// Request interceptor - Add access token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');

    const headers = config.headers as unknown as {
      Authorization?: string;
      authorization?: string;
      get?: (name: string) => string | null;
    };
    const existingAuth =
      headers?.Authorization ||
      headers?.authorization ||
      (typeof headers?.get === 'function' ? headers.get('Authorization') : null);

    // Preserve explicit Authorization headers (e.g. admin token) passed by callers.
    if (token && !existingAuth) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    // Don't attempt refresh for auth endpoints (login/register/refresh) to avoid loops
    const requestUrl: string | undefined = originalRequest?.url || originalRequest?.baseURL || undefined;
    if (
      requestUrl &&
      (
        requestUrl.includes('/auth/login') ||
        requestUrl.includes('/auth/register') ||
        requestUrl.includes('/auth/refresh') ||
        requestUrl.includes('/admin/auth')
      )
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data;

        // Save new access token
        localStorage.setItem('accessToken', accessToken);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — remove token. Only redirect to /login when we're not
        // already on the login page to avoid reload loops while the user is
        // submitting credentials.
        localStorage.removeItem('accessToken');
        try {
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        } catch {
          // ignore
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
