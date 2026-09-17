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

export function clearAuthToken() {
  cachedToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('crm_auth_token');
  }
}

export function setAuthToken(token: string) {
  cachedToken = token;
  if (typeof window !== 'undefined') {
    localStorage.setItem('crm_auth_token', token);
  }
}

let authRefreshPromise: Promise<string> | null = null;

export async function ensureAuthenticated(forceRefresh = false): Promise<string> {
  if (forceRefresh) {
    clearAuthToken();
  } else {
    const existing = getAuthToken();
    if (existing) return existing;
  }

  // Deduplicate concurrent re-authentication calls
  if (authRefreshPromise) {
    return authRefreshPromise;
  }

  authRefreshPromise = (async () => {
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
        if (data.accessToken) {
          setAuthToken(data.accessToken);
          return data.accessToken;
        }
      }
      clearAuthToken();
    } catch (e) {
      console.warn('Auto login failed or backend offline:', e);
      clearAuthToken();
    } finally {
      authRefreshPromise = null;
    }
    return '';
  })();

  return authRefreshPromise;
}

export async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  // If 401 Unauthorized, clear stale/invalid token and retry cleanly once
  const isRetry = Boolean(headers['X-Retry'] || (options?.headers as any)?.['X-Retry']);
  if (res.status === 401 && !isRetry) {
    clearAuthToken();
    const newToken = await ensureAuthenticated(true);
    if (newToken) {
      const retryHeaders: Record<string, string> = {
        ...headers,
        Authorization: `Bearer ${newToken}`,
        'X-Retry': 'true',
      };
      const retryRes = await fetch(url, { ...options, headers: retryHeaders });
      if (retryRes.ok) return retryRes.json();
      if (retryRes.status === 401) {
        clearAuthToken();
      }
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearAuthToken();
    }
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errorBody.message || 'API so\'rovida xatolik yuz berdi');
  }

  return res.json();
}

export const fetchApi = apiRequest;

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
  createArticle: (dto: { title: string; content: string; category?: string; tags?: string; status?: string }) =>
    fetchApi<any>('/knowledge-base', { method: 'POST', body: JSON.stringify(dto) }),
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

  // Enrollments
  enrollStudent: (dto: { leadId: string; groupId: string; monthlyFee?: number }) =>
    fetchApi<any>('/enrollments', { method: 'POST', body: JSON.stringify(dto) }),
  getEnrollments: (groupId?: string) =>
    fetchApi<any[]>(groupId ? `/enrollments?groupId=${groupId}` : '/enrollments'),
  getStudentPortal: (identifier: string) =>
    fetchApi<any>(`/enrollments/student/${encodeURIComponent(identifier)}`),
  getTeacherPortal: (teacherId?: string) =>
    fetchApi<any>(teacherId ? `/enrollments/teacher?teacherId=${teacherId}` : '/enrollments/teacher'),

  // Attendance
  recordAttendance: (dto: { groupId: string; date: string; records: any[]; markedById?: string }) =>
    fetchApi<any>('/attendance', { method: 'POST', body: JSON.stringify(dto) }),
  getGroupAttendance: (groupId: string, date?: string) =>
    fetchApi<any[]>(`/attendance/group/${groupId}${date ? `?date=${date}` : ''}`),

  // Grades
  recordGrade: (dto: {
    enrollmentId: string;
    score: number;
    maxScore?: number;
    gradeType?: string;
    title: string;
    comment?: string;
  }) => fetchApi<any>('/grades', { method: 'POST', body: JSON.stringify(dto) }),
  getGroupGrades: (groupId: string) => fetchApi<any[]>(`/grades/group/${groupId}`),

  // Payments & Finance
  getPayments: (status?: string) =>
    fetchApi<any[]>(status ? `/payments?status=${status}` : '/payments'),
  getFinanceSummary: () =>
    fetchApi<any>('/payments/summary'),
  getDebtors: () =>
    fetchApi<any[]>('/payments/debtors'),
  getReceipt: (paymentId: string) =>
    fetchApi<any>(`/payments/${paymentId}/receipt`),
  directPay: (dto: { leadId: string; amount: number; method: string; notes?: string }) =>
    fetchApi<any>('/payments/direct-pay', { method: 'POST', body: JSON.stringify(dto) }),
  notifyDebtor: (leadId: string) =>
    fetchApi<any>(`/payments/notify-debtor/${leadId}`, { method: 'POST' }),

  // Teachers Management
  getTeachers: () => fetchApi<any[]>('/teachers'),
  createTeacher: (dto: { fullName: string; phone: string; email?: string; password?: string; branchId?: string }) =>
    fetchApi<any>('/teachers', { method: 'POST', body: JSON.stringify(dto) }),
  deleteTeacher: (id: string) =>
    fetchApi<any>(`/teachers/${id}`, { method: 'DELETE' }),
};

