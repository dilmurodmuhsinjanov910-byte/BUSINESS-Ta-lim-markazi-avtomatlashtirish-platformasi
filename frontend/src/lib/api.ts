export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? '/api' : 'http://localhost:4000/api');

let cachedToken: string | null = null;

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('crm_auth_token') || cachedToken;
  }
  return cachedToken;
}

export function setAuthToken(token: string) {
  cachedToken = token;
  if (typeof window !== 'undefined') {
    localStorage.setItem('crm_auth_token', token);
  }
}

export async function ensureAuthenticated(): Promise<string> {
  const existing = getAuthToken();
  if (existing) return existing;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@education.uz',
        password: 'AdminPassword123!',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setAuthToken(data.accessToken);
      return data.accessToken;
    }
  } catch (e) {
    console.warn('Auto login failed or backend offline:', e);
  }
  return '';
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string>),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  // If 401 Unauthorized, try re-authenticating once
  if (res.status === 401 && !(options?.headers as any)?.['X-Retry']) {
    const newToken = await ensureAuthenticated();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      headers['X-Retry'] = 'true';
      const retryRes = await fetch(url, { ...options, headers });
      if (retryRes.ok) return retryRes.json();
    }
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errorBody.message || 'API so\'rovida xatolik yuz berdi');
  }

  return res.json();
}

export const crmApi = {
  // Analytics
  getKpis: () => fetchApi<any>('/analytics/kpis'),
  getFunnel: () => fetchApi<any>('/analytics/funnel'),

  // Leads
  getLeads: (search?: string, scoreTier?: string) => {
    const q = new URLSearchParams();
    if (search) q.append('search', search);
    if (scoreTier && scoreTier !== 'ALL') q.append('scoreTier', scoreTier);
    const qs = q.toString();
    return fetchApi<any[]>(`/leads${qs ? `?${qs}` : ''}`);
  },
  createLead: (dto: { fullName: string; phone: string; preferredCourse?: string; source?: string }) =>
    fetchApi<any>('/leads', { method: 'POST', body: JSON.stringify(dto) }),
  updateLeadStatus: (id: string, status: string, lostReason?: string) =>
    fetchApi<any>(`/leads/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, lostReason }),
    }),

  // Bookings
  getBookings: () => fetchApi<any[]>('/bookings'),
  createBooking: (dto: { leadId: string; groupId: string; bookingDate: string }) =>
    fetchApi<any>('/bookings', { method: 'POST', body: JSON.stringify(dto) }),
  updateBookingStatus: (id: string, status: string, reason?: string) =>
    fetchApi<any>(`/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason }),
    }),

  // Conversations
  getConversations: () => fetchApi<any[]>('/conversations'),
  sendMessage: (conversationId: string, content: string) =>
    fetchApi<any>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  takeOverConversation: (id: string) =>
    fetchApi<any>(`/conversations/${id}/takeover`, { method: 'POST' }),
  resolveConversation: (id: string) =>
    fetchApi<any>(`/conversations/${id}/resolve`, { method: 'POST' }),

  // Courses & Groups
  getCourses: () => fetchApi<any[]>('/courses'),
  getGroups: () => fetchApi<any[]>('/groups'),

  // Knowledge Base
  getKnowledgeBase: () => fetchApi<any[]>('/knowledge-base'),
  publishArticle: (id: string) =>
    fetchApi<any>(`/knowledge-base/${id}/publish`, { method: 'PUT' }),
  archiveArticle: (id: string) =>
    fetchApi<any>(`/knowledge-base/${id}`, { method: 'DELETE' }),

  // Tasks
  getTasks: () => fetchApi<any[]>('/tasks'),
  updateTask: (id: string, data: any) =>
    fetchApi<any>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Audit Logs
  getAuditLogs: () => fetchApi<any[]>('/audit'),
};
