'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Bucket, ReportTemplate } from '@/types/api';

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const bucketId = searchParams.get('bucket_id') ?? '';

  const { data: buckets = [] } = useQuery({
    queryKey: ['buckets'],
    queryFn: async () => (await api.get<Bucket[]>('/buckets')).data,
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports', bucketId],
    queryFn: async () =>
      (
        await api.get<ReportTemplate[]>('/reports', {
          params: bucketId ? { bucket_id: bucketId } : undefined,
        })
      ).data,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/reports/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });

  function handleBucketFilter(nextId: string) {
    router.push(nextId ? `/reports?bucket_id=${nextId}` : '/reports');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Report Templates</h1>
          <p className="text-sm text-slate-500">
            Design multi-query or JSON-pushed PDF templates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={bucketId}
            onChange={(e) => handleBucketFilter(e.target.value)}
            className="rounded-lg border bg-white px-3 py-2 text-sm"
          >
            <option value="">All Buckets</option>
            {buckets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <Link
            href={bucketId ? `/reports/new?bucket_id=${bucketId}` : '/reports/new'}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            New Report
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Endpoint Slug</th>
              <th className="px-4 py-3">Bucket</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
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
            {!isLoading && reports.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No report templates found.
                </td>
              </tr>
            )}
            {reports.map((report) => {
              const bucket = buckets.find((b) => b.id === report.bucket_id);
              return (
                <tr key={report.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      {report.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    /reports/{report.slug}/pdf
                  </td>
                  <td className="px-4 py-3">
                    {bucket ? (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {bucket.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(report.updated_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Link
                        href={`/reports/${report.id}`}
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        title="Edit in Builder"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm(`Delete report "${report.name}"?`)) {
                            deleteMutation.mutate(report.id);
                          }
                        }}
                        className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
