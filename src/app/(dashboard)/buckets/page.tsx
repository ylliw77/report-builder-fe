'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderKanban, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Bucket } from '@/types/api';

export default function BucketsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const { data: buckets = [], isLoading } = useQuery({
    queryKey: ['buckets'],
    queryFn: async () => (await api.get<Bucket[]>('/buckets')).data,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/buckets', {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      setName('');
      setSlug('');
      setDescription('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to create bucket'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/buckets/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['buckets'] }),
  });

  function handleNameChange(val: string) {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Buckets</h1>
        <p className="text-sm text-slate-500">
          Organize report templates by application, department, or client.
        </p>
      </div>

      {/* Create Bucket Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && slug.trim()) createMutation.mutate();
        }}
        className="grid gap-3 rounded-xl border bg-white p-4 shadow-sm sm:grid-cols-4"
      >
        <input
          required
          placeholder="Bucket Name (e.g. Logistics)"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="slug (e.g. logistics)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="rounded-lg border px-3 py-2 font-mono text-sm"
        />
        <input
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Create Bucket
        </button>
      </form>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Buckets Grid */}
      {isLoading ? (
        <div className="text-sm text-slate-400">Loading buckets...</div>
      ) : buckets.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-10 text-center text-sm text-slate-400">
          No buckets created yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buckets.map((bucket) => (
            <div
              key={bucket.id}
              className="flex flex-col justify-between rounded-xl border bg-white p-5 shadow-sm transition hover:border-slate-400"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5 text-slate-500" />
                    <h2 className="font-semibold text-slate-900">
                      {bucket.name}
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Delete bucket "${bucket.name}"? Reports inside will be kept unassigned.`,
                        )
                      ) {
                        deleteMutation.mutate(bucket.id);
                      }
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete bucket"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-400">
                  /{bucket.slug}
                </p>
                {bucket.description && (
                  <p className="mt-2 text-xs text-slate-600">
                    {bucket.description}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs">
                <span className="font-medium text-slate-600">
                  {Number(bucket.report_count ?? 0)} templates
                </span>
                <div className="flex gap-3">
                  <Link
                    href={`/reports?bucket_id=${bucket.id}`}
                    className="font-medium text-slate-900 underline"
                  >
                    View Reports
                  </Link>
                  <Link
                    href={`/reports/new?bucket_id=${bucket.id}`}
                    className="font-medium text-emerald-700 underline"
                  >
                    + New
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
