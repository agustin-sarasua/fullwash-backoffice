import { api, buildQuery, type QueryValue } from './client';
import type {
  AdminMe,
  AudiencePreview,
  Campaign,
  CampaignDetail,
  Client,
  ClientDetail,
  ClientProvider,
  ClientTransaction,
  Grant,
  Machine,
  MachineDetail,
  Page,
  Recipient,
  SegmentFilter,
  Site,
  SiteDetail,
  SortDir,
} from './types';

type Paged = { page?: number; page_size?: number; sort_by?: string; sort_dir?: SortDir };

export const adminApi = {
  me: () => api.get<AdminMe>('/admin/me'),

  // --- sites ---
  listSites: (params: Paged & { q?: string; is_active?: boolean } = {}) =>
    api.get<Page<Site>>(`/admin/sites${buildQuery(params as Record<string, QueryValue>)}`),
  getSite: (id: number) => api.get<SiteDetail>(`/admin/sites/${id}`),
  createSite: (body: Partial<Site>) => api.post<SiteDetail>('/admin/sites', body),
  updateSite: (id: number, body: Partial<Site>) =>
    api.patch<SiteDetail>(`/admin/sites/${id}`, body),
  deactivateSite: (id: number, detach = false) =>
    api.delete<SiteDetail>(`/admin/sites/${id}${buildQuery({ detach })}`),

  // --- machines ---
  listMachines: (
    params: Paged & {
      period?: string;
      q?: string;
      site_id?: number;
      unassigned?: boolean;
      provisioned?: boolean;
    } = {},
  ) => api.get<Page<Machine>>(`/admin/machines${buildQuery(params as Record<string, QueryValue>)}`),
  getMachine: (id: string, months = 6) =>
    api.get<MachineDetail>(`/admin/machines/${encodeURIComponent(id)}${buildQuery({ months })}`),
  updateMachine: (
    id: string,
    body: { name?: string; site_id?: number | null; is_provisioned?: boolean },
  ) => api.patch<MachineDetail>(`/admin/machines/${encodeURIComponent(id)}`, body),

  // --- clients ---
  listClients: (
    params: Paged & {
      q?: string;
      site_id?: number;
      min_balance?: number;
      max_balance?: number;
      inactive_days?: number;
      provider?: ClientProvider;
      created_from?: string;
      created_to?: string;
    } = {},
  ) => api.get<Page<Client>>(`/admin/clients${buildQuery(params as Record<string, QueryValue>)}`),
  getClient: (userId: string) =>
    api.get<ClientDetail>(`/admin/clients/${encodeURIComponent(userId)}`),
  listClientTransactions: (userId: string, params: Paged & { transaction_type?: string } = {}) =>
    api.get<Page<ClientTransaction>>(
      `/admin/clients/${encodeURIComponent(userId)}/transactions${buildQuery(
        params as Record<string, QueryValue>,
      )}`,
    ),
  grantTokens: (
    userId: string,
    body: { tokens: number; reason: string; idempotency_key?: string },
  ) => api.post<Grant>(`/admin/clients/${encodeURIComponent(userId)}/grants`, body),
  listClientGrants: (userId: string, params: Paged = {}) =>
    api.get<Page<Grant>>(
      `/admin/clients/${encodeURIComponent(userId)}/grants${buildQuery(
        params as Record<string, QueryValue>,
      )}`,
    ),
  listGrants: (params: Paged & { granted_by?: string } = {}) =>
    api.get<Page<Grant>>(`/admin/grants${buildQuery(params as Record<string, QueryValue>)}`),

  // --- notifications ---
  previewAudience: (segment: SegmentFilter) =>
    api.post<AudiencePreview>('/admin/notifications/audience/preview', segment),
  createCampaign: (body: {
    title: string;
    body: string;
    segment: SegmentFilter;
    deep_link?: string;
    dry_run?: boolean;
  }) => api.post<Campaign>('/admin/notifications/campaigns', body),
  listCampaigns: (params: Paged & { status?: string } = {}) =>
    api.get<Page<Campaign>>(
      `/admin/notifications/campaigns${buildQuery(params as Record<string, QueryValue>)}`,
    ),
  getCampaign: (id: number) => api.get<CampaignDetail>(`/admin/notifications/campaigns/${id}`),
  listRecipients: (id: number, params: Paged & { status?: string } = {}) =>
    api.get<Page<Recipient>>(
      `/admin/notifications/campaigns/${id}/recipients${buildQuery(
        params as Record<string, QueryValue>,
      )}`,
    ),
};
