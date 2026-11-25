export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

export interface CreatedApiKeyResponse extends ApiKeyItem {
  api_key: string;
}

export type SupportedClient = 'pg' | 'mysql2' | 'mssql' | 'better-sqlite3';

export interface DataSource {
  id: string;
  name: string;
  client: SupportedClient;
  host: string;
  port: number;
  username: string;
  database: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDataSourcePayload {
  name: string;
  client: SupportedClient;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface QueryPreviewResponse {
  columns: string[];
  rows: Record<string, unknown>[];
  totalReturned: number;
  truncated: boolean;
  durationMs: number;
}

export interface SubQueryItem {
  key: string;
  sql: string;
}

export interface ReportTemplate {
  id: string;
  slug: string;
  name: string;
  html_template: string;
  sql_query: string | null;
  data_source_id: string | null;
  sub_queries?: SubQueryItem[];
  created_at: string;
  updated_at: string;
}

export interface Bucket {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  report_count?: string | number;
  created_at: string;
  updated_at: string;
}

export interface CreateBucketPayload {
  name: string;
  slug: string;
  description?: string;
}

export interface ReportQuery {
  id?: string;
  key: string;
  data_source_id: string;
  sql: string;
  result_mode: 'single' | 'list';
}

export interface ReportTemplate {
  id: string;
  slug: string;
  name: string;
  html_template: string;
  bucket_id: string | null;
  sql_query: string | null;
  data_source_id: string | null;
  queries?: ReportQuery[];
  created_at: string;
  updated_at: string;
};

export interface CreateReportPayload {
  slug: string;
  name: string;
  html_template: string;
  bucket_id?: string;
  sql_query?: string;
  data_source_id?: string;
  queries?: ReportQuery[];
};
