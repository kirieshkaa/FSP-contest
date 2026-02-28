import { api, setAccessToken, clearAccessToken, getAccessToken } from './axios';

export { getBaseUrl } from './axios';

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

export interface UserProfile {
  id: string;
  username: string;
  email_masked: string;
  role: string;
  status: string;
  created_at: string;
}

export async function login(username: string, password: string): Promise<{ access_token: string; role: string }> {
  try {
    const response = await api.post('/auth/login', { username, password });
    const data = response.data;
    setAccessToken(data.access_token);
    localStorage.setItem('user_role', data.role);
    localStorage.setItem('user_id', data.user_id);
    return data;
  } catch (error) {
    const axiosError = error as { response?: { data?: { detail?: string } } };
    throw new Error(axiosError.response?.data?.detail || 'Login failed');
  }
}

export async function register(data: RegisterRequest): Promise<void> {
  try {
    await api.post('/auth/register', data);
  } catch (error) {
    const axiosError = error as { response?: { data?: { detail?: string } } };
    throw new Error(axiosError.response?.data?.detail || 'Registration failed');
  }
}

export async function logout(): Promise<void> {
  clearAccessToken();
  try {
    await api.post('/auth/logout');
  } catch {}
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  try {
    await api.post('/auth/change-password', { old_password: oldPassword, new_password: newPassword });
  } catch (error) {
    const axiosError = error as { response?: { data?: { detail?: string } } };
    throw new Error(axiosError.response?.data?.detail || 'Password change failed');
  }
}

export async function getUserProfile(): Promise<UserProfile> {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    const axiosError = error as { response?: { data?: { detail?: string } } };
    throw new Error(axiosError.response?.data?.detail || 'Failed to fetch profile');
  }
}

export async function updateEmail(email: string, password: string): Promise<void> {
  try {
    await api.patch('/auth/email', { email, password });
  } catch (error) {
    const axiosError = error as { response?: { data?: { detail?: string } } };
    throw new Error(axiosError.response?.data?.detail || 'Email update failed');
  }
}

export async function getQueries(page = 1, limit = 10): Promise<QueryListResponse> {
  try {
    const response = await api.get('/queries', { params: { page, limit } });
    return response.data;
  } catch {
    throw new Error('Failed to fetch queries');
  }
}

export async function getQuery(queryId: string): Promise<QueryResponse> {
  try {
    const response = await api.get(`/queries/${queryId}`);
    return response.data;
  } catch {
    throw new Error('Failed to fetch query');
  }
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

  try {
    const response = await api.post('/queries', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    const axiosError = error as { response?: { data?: { detail?: string } } };
    throw new Error(axiosError.response?.data?.detail || 'Failed to create query');
  }
}

export async function deleteQuery(queryId: string): Promise<void> {
  try {
    await api.delete(`/queries/${queryId}`);
  } catch {
    throw new Error('Failed to delete query');
  }
}

export async function getUsers(
  page = 1,
  limit = 10,
  statusFilter?: string
): Promise<UserListResponse> {
  try {
    const response = await api.get('/admin/users', { params: { page, limit, status_filter: statusFilter } });
    return response.data;
  } catch {
    throw new Error('Failed to fetch users');
  }
}

export async function approveUser(userId: string): Promise<void> {
  try {
    await api.post(`/admin/users/${userId}/approve`);
  } catch (error) {
    const axiosError = error as { response?: { data?: { detail?: string } } };
    throw new Error(axiosError.response?.data?.detail || 'Failed to approve user');
  }
}

export async function rejectUser(userId: string): Promise<void> {
  try {
    await api.post(`/admin/users/${userId}/reject`);
  } catch (error) {
    const axiosError = error as { response?: { data?: { detail?: string } } };
    throw new Error(axiosError.response?.data?.detail || 'Failed to reject user');
  }
}

export async function blockUser(userId: string): Promise<void> {
  try {
    await api.post(`/admin/users/${userId}/block`);
  } catch (error) {
    const axiosError = error as { response?: { data?: { detail?: string } } };
    throw new Error(axiosError.response?.data?.detail || 'Failed to block user');
  }
}

export async function deleteUser(userId: string): Promise<void> {
  try {
    await api.delete(`/admin/users/${userId}`);
  } catch {
    throw new Error('Failed to delete user');
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
