'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { ApiKeyItem, CreatedApiKeyResponse } from '@/types/api';

export default function ApiKeysPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [createdKey, setCreatedKey] = useState<CreatedApiKeyResponse | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => (await api.get<ApiKeyItem[]>('/auth/api-keys')).data,
  });

  const createMutation = useMutation({
    mutationFn: async (keyName: string) =>
      (await api.post<CreatedApiKeyResponse>('/auth/api-keys', { name: keyName }))
        .data,
    onSuccess: (data) => {
      setCreatedKey(data);
      setName('');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/api-keys/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
        <p className="text-sm text-slate-500">
          External apps use the <code className="font-mono">x-api-key</code>{' '}
          header to download PDFs from{' '}
          <code className="font-mono">POST /reports/:slug/pdf</code>.
        </p>
      </div>

      {/* Create Key Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) createMutation.mutate(name.trim());
        }}
        className="flex max-w-md gap-2"
      >
        <input
          required
          placeholder="e.g. ERP App Production"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Generate Key
        </button>
      </form>

      {/* One-time Key Banner */}
      {createdKey && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Copy your new API key now — it won&apos;t be shown again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border bg-white px-3 py-2 font-mono text-xs">
              {createdKey.api_key}
            </code>
            <button
              onClick={() => handleCopy(createdKey.api_key)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Keys Table */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Key Prefix</th>
              <th className="px-4 py-3">Last Used</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Revoke</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && apiKeys.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No API keys generated yet.
                </td>
              </tr>
            )}
            {apiKeys.map((key) => (
              <tr key={key.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-slate-400" />
                    {key.name}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                  {key.key_prefix}••••••••
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {key.last_used_at
                    ? new Date(key.last_used_at).toLocaleString()
                    : 'Never'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(key.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      if (confirm(`Revoke API key "${key.name}"?`)) {
                        revokeMutation.mutate(key.id);
                      }
                    }}
                    className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    title="Revoke"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
