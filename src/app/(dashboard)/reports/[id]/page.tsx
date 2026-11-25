'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ReportBuilder } from '@/components/builder/ReportBuilder';
import { api } from '@/lib/api';
import type { ReportTemplate } from '@/types/api';

export default function EditReportPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', id],
    queryFn: async () => (await api.get<ReportTemplate>(`/reports/${id}`)).data,
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-500">Loading template...</div>;
  }

  if (error || !data) {
    return (
      <div className="p-6 text-sm text-red-600">
        Failed to load report template.
      </div>
    );
  }

  return <ReportBuilder initialData={data} />;
}
