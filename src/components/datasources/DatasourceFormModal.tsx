'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, X, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type {
  CreateDataSourcePayload,
  DataSource,
  SupportedClient,
} from '@/types/api';

interface Props {
  initialData?: DataSource | null;
  onClose: () => void;
  onSaved: () => void;
}

const DEFAULT_PORTS: Record<SupportedClient, number> = {
  pg: 5432,
  mysql2: 3306,
  mssql: 1433,
  'better-sqlite3': 0,
};

export function DatasourceFormModal({ initialData, onClose, onSaved }: Props) {
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState<CreateDataSourcePayload>({
    name: initialData?.name ?? '',
    client: initialData?.client ?? 'pg',
    host: initialData?.host ?? 'localhost',
    port: initialData?.port ?? 5432,
    username: initialData?.username ?? '',
    password: '',
    database: initialData?.database ?? '',
  });

  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState('');

  function handleClientChange(client: SupportedClient) {
    setForm((prev) => ({
      ...prev,
      client,
      port: DEFAULT_PORTS[client] || prev.port,
    }));
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    setError('');

    try {
      const { data } = await api.post<{ ok: boolean; message: string }>(
        '/datasource/test',
        form,
      );
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err.response?.data?.message ?? 'Connection failed',
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (isEdit && initialData) {
        const payload: Partial<CreateDataSourcePayload> = { ...form };
        if (!payload.password) delete payload.password;
        await api.patch(`/datasource/${initialData.id}`, payload);
      } else {
        await api.post('/datasource', form);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to save'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">
            {isEdit ? 'Edit DataSource' : 'Add DataSource'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Connection Name
              </label>
              <input
                required
                placeholder="ERP Production DB"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Database Engine
              </label>
              <select
                value={form.client}
                onChange={(e) =>
                  handleClientChange(e.target.value as SupportedClient)
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="pg">PostgreSQL (pg)</option>
                <option value="mysql2">MySQL / MariaDB (mysql2)</option>
                <option value="mssql">SQL Server (mssql)</option>
                <option value="better-sqlite3">SQLite (better-sqlite3)</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Host
              </label>
              <input
                required
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Port
              </label>
              <input
                type="number"
                required
                min={1}
                max={65535}
                value={form.port}
                onChange={(e) =>
                  setForm({ ...form, port: Number(e.target.value) })
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Username
              </label>
              <input
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Password {isEdit && '(leave blank to keep current)'}
              </label>
              <input
                type="password"
                required={!isEdit}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Database Name
            </label>
            <input
              required
              value={form.database}
              onChange={(e) => setForm({ ...form, database: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          {testResult && (
            <div
              className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                testResult.ok
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-4">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !form.password}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              {testing && <Loader2 className="h-4 w-4 animate-spin" />}
              Test Connection
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
