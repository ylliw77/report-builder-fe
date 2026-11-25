'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Database, FileText, KeyRound, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import type { ApiKeyItem, DataSource, ReportTemplate } from '@/types/api';

export default function DashboardOverviewPage() {
  const { data: datasources = [] } = useQuery({
    queryKey: ['datasources'],
    queryFn: async () => (await api.get<DataSource[]>('/datasource')).data,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => (await api.get<ReportTemplate[]>('/reports')).data,
  });

  const { data: apiKeys = [] } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => (await api.get<ApiKeyItem[]>('/auth/api-keys')).data,
  });

  const cards = [
    {
      label: 'DataSources',
      count: datasources.length,
      href: '/datasources',
      icon: Database,
    },
    {
      label: 'Report Templates',
      count: reports.length,
      href: '/reports',
      icon: FileText,
    },
    {
      label: 'Active API Keys',
      count: apiKeys.length,
      href: '/api-keys',
      icon: KeyRound,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-slate-500">
            Manage database connections, report templates, and external API keys.
          </p>
        </div>
        <Link
          href="/reports/new"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          New Report
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, count, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-slate-400"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              <Icon className="h-5 w-5 text-slate-400" />
            </div>
            <p className="mt-2 text-3xl font-bold">{count}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
