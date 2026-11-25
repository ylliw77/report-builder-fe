'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Database, Pencil, Plus, Trash2 } from 'lucide-react';
import { DatasourceFormModal } from '@/components/datasources/DatasourceFormModal';
import { api } from '@/lib/api';
import type { DataSource } from '@/types/api';

export default function DataSourcesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DataSource | null>(null);

  const { data: datasources = [], isLoading } = useQuery({
    queryKey: ['datasources'],
    queryFn: async () => (await api.get<DataSource[]>('/datasource')).data,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/datasource/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['datasources'] }),
  });

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(ds: DataSource) {
    setEditing(ds);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DataSources</h1>
          <p className="text-sm text-slate-500">
            Connect external PostgreSQL, MySQL, MSSQL, or SQLite databases.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add DataSource
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Engine</th>
              <th className="px-4 py-3">Host / Database</th>
              <th className="px-4 py-3">Username</th>
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
            {!isLoading && datasources.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No databases connected yet.
                </td>
              </tr>
            )}
            {datasources.map((ds) => (
              <tr key={ds.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-slate-400" />
                    {ds.name}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs">
                    {ds.client}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                  {ds.host}:{ds.port}/{ds.database}
                </td>
                <td className="px-4 py-3 text-slate-600">{ds.username}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <button
                      onClick={() => openEdit(ds)}
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${ds.name}"?`)) {
                          deleteMutation.mutate(ds.id);
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
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <DatasourceFormModal
          initialData={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() =>
            queryClient.invalidateQueries({ queryKey: ['datasources'] })
          }
        />
      )}
    </div>
  );
}
