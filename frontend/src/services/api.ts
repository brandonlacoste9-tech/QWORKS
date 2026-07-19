import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { 
  User, 
  TradesmanProfile, 
  Job, 
  Transaction, 
  Conversation, 
  Message, 
  Notification,
  DashboardStats,
  ServiceType,
  PriceGuideRange,
} from '../types';

const RAILWAY_API = 'https://q-emplois-api-production-f1a6.up.railway.app/api/v1';
const envApiUrl = import.meta.env.VITE_API_URL as string | undefined;
// Ignore stale Render URL baked into old Vercel builds (onrender.com returns 404)
const API_BASE_URL =
  envApiUrl && !envApiUrl.includes('onrender.com') ? envApiUrl : RAILWAY_API;

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          const isAuthAttempt = error.config?.url?.includes('/auth/login')
            || error.config?.url?.includes('/auth/register');
          if (!isAuthAttempt) {
            localStorage.removeItem('token');
            if (!window.location.pathname.startsWith('/login')) {
              window.location.href = '/login';
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await this.client.post('/auth/login', { email, password });
    return {
      user: response.data.user,
      token: response.data.accessToken,
    };
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    serviceTypes: ServiceType[];
  }): Promise<{ user: User; token: string }> {
    const response = await this.client.post('/auth/register', {
      ...data,
      consentGiven: true,
    });
    return {
      user: response.data.user,
      token: response.data.accessToken,
    };
  }

  async registerClient(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
  }): Promise<{ user: User; token: string }> {
    const response = await this.client.post('/auth/register', {
      ...data,
      consentGiven: true,
    });
    return {
      user: response.data.user,
      token: response.data.accessToken,
    };
  }

  async forgotPassword(email: string): Promise<void> {
    await this.client.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await this.client.post('/auth/reset-password', { token, password });
  }

  async getProfile(): Promise<TradesmanProfile> {
    const response = await this.client.get('/profile');
    return response.data;
  }

  async updateUser(data: Partial<Pick<User, 'firstName' | 'lastName' | 'email' | 'phone'>>) {
    const response = await this.client.put('/users/me', data);
    return response.data;
  }

  async updateProvider(data: {
    serviceTypes: ServiceType[];
    hourlyRate?: number;
    serviceRadiusKm?: number;
    licenseNumber?: string;
    licenseDocumentUrl?: string;
    locationAddress?: string;
    locationLat?: number;
    locationLng?: number;
  }) {
    const response = await this.client.put('/providers/me', data);
    return response.data;
  }

  /** @deprecated use updateUser + updateProvider */
  async updateProfile(data: Partial<TradesmanProfile>): Promise<TradesmanProfile> {
    await this.updateUser({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
    });
    if (data.serviceTypes?.length) {
      await this.updateProvider({
        serviceTypes: data.serviceTypes,
        hourlyRate: data.hourlyRate,
        serviceRadiusKm: data.serviceRadius,
        licenseNumber: data.licenseNumber,
        locationAddress: data.address?.street,
        locationLat: data.address?.coordinates?.lat,
        locationLng: data.address?.coordinates?.lng,
      });
    }
    return this.getProfile();
  }

  async getJobs(filters?: {
    status?: string;
    serviceType?: string;
    dateFrom?: string;
    dateTo?: string;
    perspective?: 'mine' | 'board';
  }): Promise<Job[]> {
    const response = await this.client.get('/jobs', { params: filters });
    return response.data;
  }

  async getJob(id: string): Promise<Job> {
    const response = await this.client.get(`/jobs/${id}`);
    return response.data;
  }

  async createJob(data: Partial<Job>): Promise<Job> {
    const response = await this.client.post('/jobs', {
      title: data.title,
      description: data.description,
      serviceType: data.serviceType,
      address: data.address?.street ?? '',
      city: data.address?.city,
      postalCode: data.address?.postalCode,
      locationLat: data.address?.coordinates?.lat,
      locationLng: data.address?.coordinates?.lng,
      scheduledDate: data.scheduledDate,
      estimatedPrice: data.estimatedPrice,
      estimatedDuration: data.estimatedDuration ?? 60,
      photoUrls: data.photoUrls,
    });
    return response.data;
  }

  async acceptJob(id: string): Promise<Job> {
    const response = await this.client.post(`/jobs/${id}/accept`);
    return response.data;
  }

  async startJobInquiry(jobId: string): Promise<{ conversationId: string; status: string }> {
    const response = await this.client.post(`/jobs/${jobId}/inquiry`);
    return response.data;
  }

  async applyToJob(id: string, message?: string): Promise<Job> {
    const response = await this.client.post(`/jobs/${id}/apply`, { message });
    return response.data;
  }

  async getJobApplications(jobId: string) {
    const response = await this.client.get(`/jobs/${jobId}/applications`);
    return response.data;
  }

  async selectTasker(jobId: string, taskerId: string): Promise<Job> {
    const response = await this.client.post(`/jobs/${jobId}/select/${taskerId}`);
    return response.data;
  }

  async withdrawApplication(jobId: string): Promise<void> {
    await this.client.post(`/jobs/${jobId}/applications/withdraw`);
  }

  async cancelJob(id: string): Promise<Job> {
    const response = await this.client.post(`/jobs/${id}/cancel`);
    return response.data;
  }

  async getPriceGuides(city?: string): Promise<Record<string, PriceGuideRange>> {
    const response = await this.client.get('/jobs/guides/prices', { params: city ? { city } : {} });
    return response.data;
  }

  async getPublicTaskerProfile(userId: string) {
    const response = await this.client.get(`/providers/${userId}/public`);
    return response.data;
  }

  async searchTaskers(params: {
    serviceType?: string;
    city?: string;
    postalCode?: string;
    verifiedOnly?: boolean;
  }): Promise<import('../types').TaskerCardData[]> {
    const response = await this.client.get('/providers', { params });
    return response.data;
  }

  async searchAddresses(q: string): Promise<Array<{ label: string; street: string; city: string; postalCode: string }>> {
    const response = await this.client.get('/geo/search', { params: { q } });
    return response.data;
  }

  async getPaymentConfig(): Promise<{ configured: boolean; publishableKey: string | null }> {
    const response = await this.client.get('/payments/config');
    return response.data;
  }

  async createTaskPaymentCheckout(taskId: string): Promise<{ checkoutUrl: string }> {
    const response = await this.client.post(`/payments/task/${taskId}/checkout`);
    return response.data;
  }

  async declineJob(id: string, reason?: string): Promise<Job> {
    const response = await this.client.post(`/jobs/${id}/decline`, { reason });
    return response.data;
  }

  async completeJob(id: string): Promise<Job> {
    const response = await this.client.post(`/jobs/${id}/complete`);
    return response.data;
  }

  async startJob(id: string): Promise<Job> {
    const response = await this.client.post(`/jobs/${id}/start`);
    return response.data;
  }

  async deleteJob(id: string): Promise<void> {
    await this.client.delete(`/jobs/${id}`);
  }

  async getCreditBalance(): Promise<{
    balance: number;
    isFoundingTasker: boolean;
    lifetimeDiscountPercent: number;
  }> {
    const response = await this.client.get('/credits/balance');
    return response.data;
  }

  async purchaseCreditPack(pack: 'starter' | 'standard' | 'pro'): Promise<{ checkoutUrl: string | null }> {
    const response = await this.client.post('/credits/purchase', { pack });
    return response.data;
  }

  async getCreditPacks(): Promise<Record<string, { credits: number; priceCad: number; label: string }>> {
    const response = await this.client.get('/credits/packs');
    return response.data;
  }

  async createReview(data: { taskId: string; rating: number; comment?: string }) {
    const response = await this.client.post('/reviews', data);
    return response.data;
  }

  async getReviewsForUser(userId: string) {
    const response = await this.client.get(`/reviews/user/${userId}`);
    return response.data;
  }

  async getReviewsForTask(taskId: string) {
    const response = await this.client.get(`/reviews/task/${taskId}`);
    return response.data;
  }

  async createEscrow(data: {
    providerId: string;
    taskDescription: string;
    totalAmount: number;
    milestones: { description: string; amount: number }[];
  }) {
    const response = await this.client.post('/payments/escrow', data);
    return response.data;
  }

  async getTransactions(): Promise<Transaction[]> {
    const response = await this.client.get('/credits/transactions');
    return response.data.map((t: { id: string; amount: number; type: string; description?: string; createdAt: string }) => ({
      id: t.id,
      jobId: '',
      amount: Math.abs(t.amount),
      fee: 0,
      netAmount: t.amount,
      status: 'completed' as const,
      type: t.type === 'purchase' ? 'payment' as const : 'payout' as const,
      createdAt: t.createdAt,
      description: t.description ?? t.type,
    }));
  }

  async getEarningsSummary(): Promise<{
    totalEarned: number;
    pendingPayout: number;
    thisMonth: number;
  }> {
    const stats = await this.getDashboardStats();
    return {
      totalEarned: stats.earningsThisMonth,
      pendingPayout: 0,
      thisMonth: stats.earningsThisMonth,
    };
  }

  async exportTransactions(): Promise<Blob> {
    const txs = await this.getTransactions();
    return new Blob([JSON.stringify(txs, null, 2)], { type: 'application/json' });
  }

  async getConversations(): Promise<Conversation[]> {
    const response = await this.client.get('/conversations');
    return response.data;
  }

  async getUnreadMessageCount(): Promise<number> {
    const response = await this.client.get('/conversations/unread-count');
    return response.data.total ?? 0;
  }

  async getJobConversations(jobId: string): Promise<import('../types').Conversation[]> {
    const response = await this.client.get(`/jobs/${jobId}/conversations`);
    return response.data;
  }

  async getMessages(
    conversationId: string,
    after?: string,
  ): Promise<{
    messages: Message[];
    job: import('../types').ConversationJobContext | null;
    conversationStatus?: import('../types').ConversationStatus;
    canSend?: boolean;
  }> {
    const response = await this.client.get(`/conversations/${conversationId}/messages`, {
      params: after ? { after } : {},
    });
    return response.data;
  }

  async sendMessage(
    conversationId: string,
    payload: string | { content?: string; attachmentUrl?: string; type?: 'text' | 'image' },
  ): Promise<Message> {
    const body = typeof payload === 'string' ? { content: payload } : payload;
    const response = await this.client.post(`/conversations/${conversationId}/messages`, body);
    return response.data;
  }

  async markAsRead(conversationId: string): Promise<void> {
    await this.client.post(`/conversations/${conversationId}/read`);
  }

  async searchMessages(q: string): Promise<import('../types').MessageSearchResult[]> {
    const response = await this.client.get('/conversations/search/messages', { params: { q } });
    return response.data.results ?? [];
  }

  async reportMessage(
    conversationId: string,
    messageId: string,
    reason: string,
    details?: string,
  ): Promise<void> {
    await this.client.post(`/conversations/${conversationId}/messages/${messageId}/report`, {
      reason,
      details,
    });
  }

  async getAdminConversations(params: { q?: string; page?: number } = {}) {
    const response = await this.client.get('/admin/conversations', { params });
    return response.data as {
      conversations: import('../types').AdminConversation[];
      total: number;
      page: number;
    };
  }

  async getAdminConversation(id: string) {
    const response = await this.client.get(`/admin/conversations/${id}`);
    return response.data as {
      id: string;
      status: string;
      job?: { id: string; title: string; status: string };
      client: { email: string; firstName?: string | null; lastName?: string | null };
      provider: { email: string; firstName?: string | null; lastName?: string | null };
      messages: import('../types').Message[];
    };
  }

  async getMessageReports(params: { status?: string; page?: number } = {}) {
    const response = await this.client.get('/admin/message-reports', { params });
    return response.data as {
      reports: import('../types').MessageReport[];
      total: number;
      page: number;
    };
  }

  async resolveMessageReport(
    id: string,
    status: 'reviewed' | 'dismissed',
    adminNote?: string,
  ) {
    const response = await this.client.patch(`/admin/message-reports/${id}`, { status, adminNote });
    return response.data;
  }

  async getNotifications(): Promise<Notification[]> {
    const response = await this.client.get('/notifications');
    return response.data;
  }

  async updateTelegramId(telegramId: string) {
    return this.client.put('/profile/notifications', { telegramId });
  }

  async disconnectTelegram() {
    return this.client.put('/profile/notifications', { telegramId: null });
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await this.client.post(`/notifications/${id}/read`);
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.client.get('/dashboard/stats');
    return response.data;
  }

  async getEscrowContracts() {
    const response = await this.client.get('/payments/escrow');
    return response.data;
  }

  async releaseEscrowMilestone(contractId: string, milestoneId: string) {
    const response = await this.client.post(
      `/payments/escrow/${contractId}/milestones/${milestoneId}/release`,
    );
    return response.data;
  }

  async getAuditLogs(params: { page?: number; action?: string; userId?: string } = {}) {
    const response = await this.client.get('/admin/audit-logs', { params });
    return response.data;
  }

  async getMilestoneInvoice(contractId: string, milestoneId: string): Promise<{ html: string; invoiceNumber: string }> {
    const response = await this.client.get(
      `/payments/escrow/${contractId}/milestones/${milestoneId}/invoice`,
    );
    return response.data;
  }

  async updateAvailability(data: {
    day: string;
    isAvailable: boolean;
    startTime?: string;
    endTime?: string;
  }): Promise<void> {
    await this.client.patch('/availability', data);
  }

  async uploadLicenseDocument(data: { data: string; filename: string; contentType: string }) {
    const token = localStorage.getItem('token');
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    // Convert base64 data URL → Blob → FormData (no base64 overhead)
    const base64 = data.data.includes(',') ? data.data.split(',')[1] : data.data;
    const byteChars = atob(base64);
    const byteArr = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
    const blob = new Blob([byteArr], { type: data.contentType });
    const form = new FormData();
    form.append('file', blob, data.filename);

    const res = await fetch(
      `${API_BASE_URL}/media/upload-file?purpose=document`,
      { method: 'POST', headers: authHeaders, body: form },
    );

    // Fallback: if multipart doc route not available, use legacy JSON endpoint
    if (res.status === 404 || res.status === 405) {
      const response = await this.client.post('/providers/me/license-document', data);
      return response.data;
    }

    if (!res.ok) {
      const errText = await res.text();
      let message = 'Échec du téléversement.';
      try { message = JSON.parse(errText).message ?? message; } catch { /* noop */ }
      throw new Error(message);
    }

    return res.json();
  }

  async uploadImage(data: {
    purpose: 'avatar' | 'task' | 'message';
    data: string;
    filename: string;
    contentType: string;
  }) {
    const token = localStorage.getItem('token');
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    // ── Attempt 1: multipart/form-data (no base64 overhead) ──────────────────
    try {
      const base64 = data.data.includes(',') ? data.data.split(',')[1] : data.data;
      const byteChars = atob(base64);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArr], { type: data.contentType });
      const form = new FormData();
      form.append('file', blob, data.filename);

      const res = await fetch(
        `${API_BASE_URL}/media/upload-file?purpose=${encodeURIComponent(data.purpose)}`,
        { method: 'POST', headers: authHeaders, body: form },
      );

      // If the new endpoint exists and succeeded, use it
      if (res.ok) return res.json() as Promise<{ url: string; purpose: string }>;

      // If it's a 404 the route isn't deployed yet — fall through to legacy
      if (res.status !== 404 && res.status !== 405) {
        const errText = await res.text();
        let message = 'Échec du téléversement.';
        try { message = JSON.parse(errText).message ?? message; } catch { /* noop */ }
        throw new Error(message);
      }
    } catch (err) {
      // Network error or decode error — only suppress if it's a "route not found" scenario
      if (err instanceof Error && err.message !== 'Échec du téléversement.') throw err;
    }

    // ── Fallback: legacy JSON / base64 endpoint ───────────────────────────────
    const response = await this.client.post('/media/upload', data);
    return response.data as { url: string; purpose: string };
  }

  async getAdminMetrics(days = 30) {
    const response = await this.client.get('/admin/metrics', { params: { days } });
    return response.data;
  }

  async getPendingVerifications() {
    const response = await this.client.get('/admin/verifications/pending');
    return response.data;
  }

  async triggerVerificationDigest() {
    const response = await this.client.post('/admin/verifications/digest');
    return response.data as { sent: boolean; count: number; overdue: number };
  }

  async approveVerification(providerId: string) {
    const response = await this.client.post(`/admin/verifications/${providerId}/approve`);
    return response.data;
  }

  async rejectVerification(providerId: string, reason?: string) {
    const response = await this.client.post(
      `/admin/verifications/${providerId}/reject`,
      reason ? { reason } : {},
    );
    return response.data;
  }

  async searchAdminProviders(q?: string, status?: string) {
    const response = await this.client.get('/admin/providers', { params: { q, status } });
    return response.data;
  }

  async generateInvite(data?: { maxRedemptions?: number; rewardCredits?: number; discountPct?: number }) {
    const response = await this.client.post('/admin/invites', data ?? {});
    return response.data as { code: string; maxRedemptions: number; rewardCredits: number };
  }

  async getAdminUsers(params: { q?: string; role?: string; page?: number } = {}) {
    const response = await this.client.get('/admin/users', { params });
    return response.data as {
      users: Array<{
        id: string;
        email: string;
        firstName?: string | null;
        lastName?: string | null;
        phone?: string | null;
        role: string;
        createdAt: string;
        isVerified: boolean;
        serviceTypes: string[];
        suspendedAt?: string | null;
        suspensionReason?: string | null;
      }>;
      total: number;
      page: number;
      pages: number;
    };
  }

  async updateUserRole(userId: string, role: string) {
    const response = await this.client.patch(`/admin/users/${userId}/role`, { role });
    return response.data;
  }

  async suspendUser(userId: string, reason?: string) {
    const response = await this.client.post(`/admin/users/${userId}/suspend`, { reason });
    return response.data as { success: boolean };
  }

  async unsuspendUser(userId: string) {
    const response = await this.client.post(`/admin/users/${userId}/unsuspend`);
    return response.data as { success: boolean };
  }

  async getAdminJobs(params: { status?: string; q?: string; page?: number } = {}) {
    const response = await this.client.get('/admin/jobs', { params });
    return response.data as {
      jobs: Array<{
        id: string;
        title: string;
        status: string;
        serviceType: string;
        city?: string | null;
        estimatedPrice: number;
        applications: number;
        clientId: string;
        clientEmail: string;
        clientName: string;
        createdAt: string;
      }>;
      total: number;
      page: number;
      pages: number;
    };
  }

  async seedDemoJobs() {
    const response = await this.client.post('/admin/seed-demo');
    return response.data as {
      created: number;
      updated: number;
      cancelled?: number;
      rotationIndex?: number;
      openCount?: number;
      total: number;
    };
  }
}

export const api = new ApiService();
export default api;