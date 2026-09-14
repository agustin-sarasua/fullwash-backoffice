/** Response shapes from the backend admin API. snake_case, matching the wire format. */

export type Page<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type IdName = { id: number | string; name: string | null };

export type SortDir = 'asc' | 'desc';

export type AdminMe = {
  uid: string;
  email: string | null;
  name: string | null;
  is_admin: boolean;
};

export type Site = {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  machine_count: number;
  created_at: string;
  updated_at: string;
};

export type SiteDetail = Site & { machines: IdName[] };

export type MachineMetrics = {
  wash_count: number;
  tokens_consumed: number;
  unique_users: number;
  /** Consumption at list price. The bulk discount ladder puts realised revenue 0-15% below this. */
  estimated_revenue_uyu: number;
  last_wash_at: string | null;
};

export type Machine = {
  id: string;
  name: string;
  site: IdName | null;
  is_provisioned: boolean;
  created_at: string | null;
  period_label: string;
  period_start: string;
  period_end: string;
  metrics: MachineMetrics;
};

export type MachineSeriesPoint = {
  period_label: string;
  wash_count: number;
  tokens_consumed: number;
};

export type MachineAction = {
  id: number;
  action: string;
  trigger_type: string | null;
  timestamp: string;
  session_id: string | null;
  user_id: string | null;
  token_channel: string | null;
  tokens_left: number | null;
  seconds_left: number | null;
};

export type MachineDetail = Machine & {
  monthly_series: MachineSeriesPoint[];
  recent_actions: MachineAction[];
};

export type Client = {
  user_id: string;
  profile_id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  balance_tokens: number;
  pending_hold_tokens: number;
  total_washes: number;
  total_tokens_purchased: number;
  total_tokens_granted: number;
  total_spent_uyu: number;
  last_wash_at: string | null;
  last_purchase_at: string | null;
  home_site: IdName | null;
};

export type Payment = {
  id: number;
  status: string;
  amount: number;
  currency: string | null;
  gateway: string | null;
  gateway_payment_id: string | null;
  created_date: string | null;
};

export type ClientTransaction = {
  id: number;
  /** The real type, including ADMIN_GRANT -- unlike the app-facing schema. */
  transaction_type: string;
  tokens: number;
  signed_tokens: number;
  counts_toward_balance: boolean;
  machine: IdName | null;
  site: IdName | null;
  created_date: string;
  payment: Payment | null;
};

export type Grant = {
  id: number;
  user_id: string;
  tokens: number;
  reason: string;
  granted_by_uid: string;
  granted_by_email: string | null;
  transaction_id: number;
  created_at: string;
  balance_after: number | null;
};

export type ClientDetail = Client & {
  recent_grants: Grant[];
  recent_transactions: ClientTransaction[];
};

export type SegmentFilter = {
  site_ids?: number[] | null;
  include_unassigned_site?: boolean;
  inactive_days?: number | null;
  active_within_days?: number | null;
  min_balance_tokens?: number | null;
  max_balance_tokens?: number | null;
  min_total_washes?: number | null;
  max_total_washes?: number | null;
  min_total_spent_uyu?: number | null;
  max_total_spent_uyu?: number | null;
  spend_window_days?: number | null;
  has_push_token?: boolean;
  user_ids?: string[] | null;
  match_all?: boolean;
};

export type AudiencePreview = {
  matched_users: number;
  reachable_users: number;
  target_device_count: number;
  sample: Client[];
  evaluated_at: string;
  filters: SegmentFilter;
};

export type Campaign = {
  id: number;
  title: string;
  body: string;
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'PARTIAL' | 'FAILED';
  dry_run: boolean;
  audience_user_count: number;
  target_device_count: number;
  success_count: number;
  failure_count: number;
  invalidated_token_count: number;
  created_by_uid: string;
  created_by_email: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
};

export type CampaignDetail = Campaign & {
  segment: SegmentFilter | null;
  data: Record<string, string> | null;
  deep_link: string | null;
};

export type Recipient = {
  id: number;
  user_id: string;
  token_suffix: string | null;
  status: 'SENT' | 'FAILED' | 'UNREGISTERED';
  error_code: string | null;
  message_id: string | null;
  created_at: string;
};
