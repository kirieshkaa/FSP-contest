const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export function getBaseUrl(): string {
  return API_BASE_URL.replace("/api/v1", "").replace("/api", "")
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface Query {
  query_id: string;
  query_title: string | null;
  file_path: string;
  created_at: string;
}

export interface QueryListResponse {
  items: Query[];
  total: number;
  page: number;
  limit: number;
}

export interface QueryResponse {
  query: Query;
  response: {
    response_id: string;
    response_json: ForecastRow[];
    created_at: string;
  };
}

export interface ForecastRow {
  month: string;
  avg_dim: number;
  cows_count: number;
  total_adults: number;
  milk_total: number;
  first_calvings: number;
  purchased?: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateQueryParams {
  months?: number;
  purchase?: number;
  target_date?: string;
  params_source?: 'empirical' | 'constants' | 'custom';
  maintain_replacement?: boolean;
  growth_target?: number;
  purchase_curve?: string;
  age_first_insem?: number;
  prob_insem?: number;
  gestation?: number;
  dry_period?: number;
  culling_rate?: number;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    clearAccessToken();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  const data = await response.json();
  setAccessToken(data.access_token);
  return data.access_token;
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  let token = getAccessToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });

  if (response.status === 401 && !isRefreshing) {
    isRefreshing = true;
    
    try {
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      onTokenRefreshed(newToken);
      
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newToken}`,
        },
        credentials: 'include',
      });
    } catch {
      isRefreshing = false;
      throw response;
    }
  }

  return response;
}

async function fetchWithAuthFormData(url: string, options: RequestInit = {}): Promise<Response> {
  let token = getAccessToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });

  if (response.status === 401 && !isRefreshing) {
    isRefreshing = true;
    
    try {
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      onTokenRefreshed(newToken);
      
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`,
        },
        credentials: 'include',
      });
    } catch {
      isRefreshing = false;
      throw response;
    }
  }

  return response;
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

function setAccessToken(token: string): void {
  localStorage.setItem('access_token', token);
}

function clearAccessToken(): void {
  localStorage.removeItem('access_token');
}

function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function login(username: string, password: string): Promise<{ access_token: string; role: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(error.detail || 'Login failed');
  }

  const data = await response.json();
  setAccessToken(data.access_token);
  localStorage.setItem('user_role', data.role);
  localStorage.setItem('user_id', data.user_id);
  return data;
}

export async function register(data: RegisterRequest): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(error.detail || 'Registration failed');
  }
}

export async function logout(): Promise<void> {
  clearAccessToken();
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {});
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/auth/change-password`, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Password change failed' }));
    throw new Error(error.detail || 'Password change failed');
  }
}

export async function getUserProfile(): Promise<UserProfile> {
  const response = await fetchWithAuth(`${API_BASE_URL}/auth/me`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch profile' }));
    throw new Error(error.detail || 'Failed to fetch profile');
  }

  return response.json();
}

export interface UserProfile {
  id: string;
  username: string;
  email_masked: string;
  role: string;
  status: string;
  created_at: string;
}

export async function updateEmail(email: string, password: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/auth/email`, {
    method: 'PATCH',
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Email update failed' }));
    throw new Error(error.detail || 'Email update failed');
  }
}

export async function getQueries(page = 1, limit = 10): Promise<QueryListResponse> {
  const response = await fetchWithAuth(`${API_BASE_URL}/queries?page=${page}&limit=${limit}`);

  if (!response.ok) {
    throw new Error('Failed to fetch queries');
  }

  return response.json();
}

export async function getQuery(queryId: string): Promise<QueryResponse> {
  const response = await fetchWithAuth(`${API_BASE_URL}/queries/${queryId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch query');
  }

  return response.json();
}

export async function createQuery(
  file: File,
  queryTitle?: string,
  params?: CreateQueryParams
): Promise<Query> {
  const formData = new FormData();
  formData.append('file', file);
  if (queryTitle) formData.append('query_title', queryTitle);
  if (params) {
    if (params.months) formData.append('months', String(params.months));
    if (params.purchase) formData.append('purchase', String(params.purchase));
    if (params.target_date) formData.append('target_date', params.target_date);
    if (params.params_source) formData.append('params_source', params.params_source);
    if (params.maintain_replacement) formData.append('maintain_replacement', 'true');
    if (params.growth_target) formData.append('growth_target', String(params.growth_target));
    if (params.purchase_curve) formData.append('purchase_curve', params.purchase_curve);
    if (params.age_first_insem) formData.append('age_first_insem', String(params.age_first_insem));
    if (params.prob_insem) formData.append('prob_insem', String(params.prob_insem));
    if (params.gestation) formData.append('gestation', String(params.gestation));
    if (params.dry_period) formData.append('dry_period', String(params.dry_period));
    if (params.culling_rate) formData.append('culling_rate', String(params.culling_rate));
  }

  const response = await fetchWithAuthFormData(`${API_BASE_URL}/queries`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to create query' }));
    throw new Error(error.detail || 'Failed to create query');
  }

  return response.json();
}

export async function deleteQuery(queryId: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/queries/${queryId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete query');
  }
}

export async function getUsers(
  page = 1,
  limit = 10,
  statusFilter?: string
): Promise<UserListResponse> {
  let url = `${API_BASE_URL}/admin/users?page=${page}&limit=${limit}`;
  if (statusFilter) url += `&status_filter=${statusFilter}`;

  const response = await fetchWithAuth(url);

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  return response.json();
}

export async function approveUser(userId: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/admin/users/${userId}/approve`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to approve user' }));
    throw new Error(error.detail || 'Failed to approve user');
  }
}

export async function rejectUser(userId: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/admin/users/${userId}/reject`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to reject user' }));
    throw new Error(error.detail || 'Failed to reject user');
  }
}

export async function blockUser(userId: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/admin/users/${userId}/block`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to block user' }));
    throw new Error(error.detail || 'Failed to block user');
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/admin/users/${userId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete user');
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
