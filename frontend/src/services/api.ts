import axios from 'axios';
import type {
  User,
  EmailListResponse,
  ScheduleEmailRequest,
  ScheduleEmailResponse,
  SenderRecord,
  SlackStatus,
  SearchResponse,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ───────────────────────────────────────

export const authApi = {
  getMe: () => api.get<User>('/auth/me').then((r) => r.data),
  logout: () => api.post('/auth/logout'),
};

// ─── Email API ──────────────────────────────────────

export const emailApi = {
  schedule: (data: ScheduleEmailRequest) =>
    api.post<ScheduleEmailResponse>('/emails/schedule', data).then((r) => r.data),

  getScheduled: (page = 1, limit = 20) =>
    api.get<EmailListResponse>('/emails/scheduled', { params: { page, limit } }).then((r) => r.data),

  getSent: (page = 1, limit = 20) =>
    api.get<EmailListResponse>('/emails/sent', { params: { page, limit } }).then((r) => r.data),

  search: (q: string, status?: string, page = 1, limit = 20) =>
    api.get<SearchResponse>('/emails/search', { params: { q, status, page, limit } }).then((r) => r.data),
};

// ─── Sender API ─────────────────────────────────────

export const senderApi = {
  list: () => api.get<SenderRecord[]>('/senders').then((r) => r.data),

  generate: () =>
    api.post<{ message: string; sender: SenderRecord }>('/senders/generate').then((r) => r.data),

  remove: (id: string) => api.delete(`/senders/${id}`),
};

// ─── Slack API ──────────────────────────────────────

export const slackApi = {
  getConnectUrl: () =>
    api.get<{ url: string }>('/slack/connect').then((r) => r.data),

  getStatus: () =>
    api.get<SlackStatus>('/slack/status').then((r) => r.data),

  disconnect: () => api.post('/slack/disconnect'),
};

export default api;
