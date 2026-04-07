// === Dashboard ===

export interface DashboardSummary {
  total_cost_usd: number;
  total_input: string;
  total_output: string;
  total_cache_read: string;
  total_cache_write: string;
  total_tokens: string;
  entry_count: number;
  session_count: number;
  first_entry: string | null;
  last_entry: string | null;
  today_cost_usd: number;
  settings: Record<string, unknown> | null;
}

export interface DashboardCharts {
  by_model: Array<{ model: string; cost_usd: number; total_tokens: string; entries: number }>;
  by_source: Array<{ source: string; cost_usd: number; total_tokens: string; entries: number }>;
  daily: Array<{ day: string; model: string; cost_usd: number; entries: number }>;
}

// === Analytics ===

export interface AnalyticsData {
  project_trend: Array<{ project: string; day: string; cost_usd: number }>;
  model_trend: Array<{ week: string; model: string; cost_usd: number; entries: number }>;
  top_sessions: Array<{ id: string; session_id: string; custom_name: string | null; source: string; total_cost_usd: number; entry_count: number; last_seen: string }>;
  period_comparison: { current_month: number; last_month: number; current_tokens: string; last_tokens: string; current_entries: number; last_entries: number };
  heatmap: Array<{ dow: number; hour: number; entries: number; cost_usd: number }>;
  data_range: { first_day: string; last_day: string; total_days: number } | null;
  hourly: { active_hours: number; total_cost: number; cost_per_active_hour: number; active_hours_today: number; cost_today: number } | null;
  daily_cost: Array<{ day: string; cost: number }>;
  streaks: { current_streak: number; record_streak: number; most_expensive_day: string | null; most_expensive_day_cost: number; active_days_total: number } | null;
}

export interface ProjectComparisonData {
  summary: Array<{ project_id: string; project: string; total_cost_usd: number; total_tokens: string; session_count: number; entry_count: number; cost_per_session: number }>;
  daily: Array<{ project_id: string; project: string; day: string; cost_usd: number }>;
}

// === Sessions ===

export interface SessionItem {
  id: string;
  session_id: string;
  custom_name: string | null;
  source: string;
  first_seen: string;
  last_seen: string;
  total_cost_usd: number;
  total_input: number;
  total_output: number;
  entry_count: number;
  project_id: string | null;
  project_name: string | null;
}

export interface SessionListResponse {
  sessions: SessionItem[];
  total: number;
  page: number;
  pages: number;
}

// === Entries ===

export interface EntryItem {
  id: string;
  timestamp: string;
  source: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
  cache_write: number;
  total_tokens: number;
  cost_usd: number;
  session_id: string;
  session_name: string | null;
  conversation_url: string | null;
}

export interface EntryListResponse {
  entries: EntryItem[];
  total: number;
  page: number;
  pages: number;
}

// === Projects ===

export interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  total_cost_usd: number;
  session_count: number;
  last_activity: string | null;
  sparkline?: Array<{ day: string; cost: number }>;
}

export interface ProjectListResponse {
  projects: ProjectItem[];
}

// === Admin ===

export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  role: string;
}
