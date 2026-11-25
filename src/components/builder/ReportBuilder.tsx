'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Editor from '@monaco-editor/react';
import Handlebars from 'handlebars';
import {
  ArrowLeft,
  Code2,
  Database,
  Download,
  Grid3X3,
  LayoutTemplate,
  Loader2,
  Play,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { registerHandlebarsHelpers } from '@/lib/handlebars-helpers';
import type {
  Bucket,
  DataSource,
  QueryPreviewResponse,
  ReportQuery,
  ReportTemplate,
} from '@/types/api';
import { JasperCanvas } from '../studio/JasperCanvas';
import {
  DEFAULT_BANDS,
  compileStudioToHtml,
  type StudioBand,
} from '../studio/jasper-types';
import type { DatasetSchema } from './FieldPickerButton';
import { VisualBuilderPane } from './VisualBuilderPane';
import {
  DEFAULT_PAGE_SETTINGS,
  compileBlocksToHtml,
  compileSinglePageHtml,
  createBlock,
  getPageDimensions,
  splitBlocksIntoPages,
  type PageSettings,
  type ReportBlock,
} from './visual-blocks';

registerHandlebarsHelpers();

function resolvePageTokens(
  html: string,
  pageNum: number,
  total: number,
): string {
  return html
    .replace(/<span class="pageNumber"><\/span>/gi, String(pageNum))
    .replace(/<span class="totalPages"><\/span>/gi, String(total));
}

function extractPdfTemplate(
  html: string,
  id: 'pdf-header' | 'pdf-footer',
): string {
  const regex = new RegExp(
    `<template id="${id}"[^>]*>([\\s\\S]*?)<\\/template>`,
    'i',
  );
  const match = html.match(regex);
  return match ? match[1] : '';
}

function stripPdfTemplates(html: string): string {
  return html
    .replace(/<template id="pdf-header"[^>]*>[\s\S]*?<\/template>/gi, '')
    .replace(/<template id="pdf-footer"[^>]*>[\s\S]*?<\/template>/gi, '');
}

interface Props {
  initialData?: ReportTemplate;
}

interface QueryResultState {
  columns: string[];
  rows: Record<string, unknown>[];
  mode: 'single' | 'list';
  durationMs: number;
}

export function ReportBuilder({ initialData }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const isEdit = Boolean(initialData);

  const [pageSettings, setPageSettings] = useState<PageSettings>(
    DEFAULT_PAGE_SETTINGS,
  );
  const [blocks, setBlocks] = useState<ReportBlock[]>(() => [
    createBlock('header'),
    createBlock('table'),
  ]);
  const [studioBands, setStudioBands] = useState<StudioBand[]>(DEFAULT_BANDS);

  const [name, setName] = useState(initialData?.name ?? '');
  const [slug, setSlug] = useState(initialData?.slug ?? '');
  const [bucketId, setBucketId] = useState(
    initialData?.bucket_id ?? searchParams.get('bucket_id') ?? '',
  );
  const [queries, setQueries] = useState<ReportQuery[]>(() =>
    Array.isArray(initialData?.queries) && initialData.queries.length > 0
      ? initialData.queries
      : [],
  );
  const [htmlTemplate, setHtmlTemplate] = useState(
    initialData?.html_template ??
      compileStudioToHtml(DEFAULT_BANDS, DEFAULT_PAGE_SETTINGS),
  );

  const [activeTab, setActiveTab] = useState<
    'studio' | 'visual' | 'template' | 'sql'
  >(isEdit ? 'template' : 'studio');
  const [zoom, setZoom] = useState(0.65);

  const [queryResults, setQueryResults] = useState<
    Record<string, QueryResultState>
  >({});
  const [sqlParams, setSqlParams] = useState('{}');
  const [runningSql, setRunningSql] = useState(false);
  const [sqlError, setSqlError] = useState('');
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [saveError, setSaveError] = useState('');

  const { data: datasources = [] } = useQuery({
    queryKey: ['datasources'],
    queryFn: async () => (await api.get<DataSource[]>('/datasource')).data,
  });

  const { data: buckets = [] } = useQuery({
    queryKey: ['buckets'],
    queryFn: async () => (await api.get<Bucket[]>('/buckets')).data,
  });

  function handleStudioChange(nextBands: StudioBand[]) {
    setStudioBands(nextBands);
    setHtmlTemplate(compileStudioToHtml(nextBands, pageSettings));
  }

  function handleBlocksChange(nextBlocks: ReportBlock[]) {
    setBlocks(nextBlocks);
    setHtmlTemplate(compileBlocksToHtml(nextBlocks, pageSettings));
  }

  function handlePageSettingsChange(nextSettings: PageSettings) {
    setPageSettings(nextSettings);
    if (activeTab === 'studio') {
      setHtmlTemplate(compileStudioToHtml(studioBands, nextSettings));
    } else {
      setHtmlTemplate(compileBlocksToHtml(blocks, nextSettings));
    }
  }

  function handleNameChange(val: string) {
    setName(val);
    if (!isEdit) {
      setSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      );
    }
  }

  function addQueryRow() {
    setQueries([
      ...queries,
      {
        key: queries.length === 0 ? 'header' : `dataset_${queries.length + 1}`,
        data_source_id: datasources[0]?.id ?? '',
        sql: '',
        result_mode: queries.length === 0 ? 'single' : 'list',
      },
    ]);
  }

  async function handleRunAllQueries() {
    const valid = queries.filter(
      (q) => q.key.trim() && q.data_source_id && q.sql.trim(),
    );
    if (valid.length === 0) return;

    setRunningSql(true);
    setSqlError('');

    try {
      const parsedParams = sqlParams.trim() ? JSON.parse(sqlParams) : {};
      const entries = await Promise.all(
        valid.map(async (q) => {
          const { data } = await api.post<QueryPreviewResponse>(
            `/datasource/${q.data_source_id}/preview`,
            { sql: q.sql, params: parsedParams, limit: 25 },
          );
          return [
            q.key.trim(),
            {
              columns: data.columns,
              rows: data.rows,
              mode: q.result_mode,
              durationMs: data.durationMs,
            },
          ] as const;
        }),
      );
      setQueryResults(Object.fromEntries(entries));
    } catch (err: any) {
      setSqlError(
        err.response?.data?.message ??
          err.message ??
          'Failed to execute SQL queries',
      );
    } finally {
      setRunningSql(false);
    }
  }

  function insertFieldSnippet(expr: string) {
    setHtmlTemplate((prev) => `${prev}\n${expr}`);
  }

  function insertTableForDataset(key: string, columns: string[]) {
    if (columns.length === 0) return;
    const headers = columns.map((c) => `        <th>${c}</th>`).join('\n');
    const cells = columns
      .map((c) => `        <td>{{default this.${c} ""}}</td>`)
      .join('\n');

    const tableHtml = `  <table>
    <thead>
      <tr>
${headers}
      </tr>
    </thead>
    <tbody>
      {{#each ${key}}}
      <tr>
${cells}
      </tr>
      {{/each}}
    </tbody>
  </table>`;

    setHtmlTemplate((prev) =>
      prev.includes('</body>')
        ? prev.replace('</body>', `${tableHtml}\n</body>`)
        : `${prev}\n${tableHtml}`,
    );
    setActiveTab('template');
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');

    const validQueries = queries
      .filter((q) => q.key.trim() && q.data_source_id && q.sql.trim())
      .map((q) => ({
        key: q.key.trim(),
        data_source_id: q.data_source_id,
        sql: q.sql,
        result_mode: q.result_mode,
      }));

    const payload = {
      name,
      slug,
      html_template: htmlTemplate,
      bucket_id: bucketId || undefined,
      queries: validQueries,
    };

    try {
      if (isEdit && initialData) {
        await api.patch(`/reports/${initialData.id}`, payload);
      } else {
        await api.post('/reports', payload);
      }
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
      router.push(bucketId ? `/reports?bucket_id=${bucketId}` : '/reports');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setSaveError(
        Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to save report'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleTestDownloadPdf() {
    if (!slug) return;
    setDownloadingPdf(true);
    setSaveError('');

    try {
      const parsedParams = sqlParams.trim() ? JSON.parse(sqlParams) : {};
      const hasQueries = queries.some(
        (q) => q.key.trim() && q.data_source_id && q.sql.trim(),
      );

      const body = hasQueries
        ? { params: parsedParams }
        : { data: previewContext };

      const response = await api.post(`/reports/${slug}/preview-pdf`, body, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slug}-preview.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setSaveError(
        'Save the template first, then click Test PDF to download from Puppeteer.',
      );
    } finally {
      setDownloadingPdf(false);
    }
  }

  const pageDims = getPageDimensions(pageSettings);

  const datasetSchemas: DatasetSchema[] = useMemo(
    () =>
      Object.entries(queryResults).map(([key, res]) => ({
        key,
        mode: res.mode,
        columns: res.columns,
      })),
    [queryResults],
  );

  const previewContext = useMemo(() => {
    const dynamicData: Record<string, unknown> = {};
    for (const [key, res] of Object.entries(queryResults)) {
      dynamicData[key] = res.mode === 'single' ? (res.rows[0] ?? {}) : res.rows;
    }

    return {
      rows: [
        { id: 1, name: 'Sample Row 1' },
        { id: 2, name: 'Sample Row 2' },
      ],
      ...dynamicData,
      generatedAt: new Date().toLocaleString(),
    };
  }, [queryResults]);

  const compiledHeaderHtml = useMemo(() => {
    const rawHeader =
      activeTab === 'studio' || activeTab === 'template'
        ? extractPdfTemplate(htmlTemplate, 'pdf-header')
        : pageSettings.headerHtml;

    if (!rawHeader.trim()) return '';
    try {
      return Handlebars.compile(rawHeader)(previewContext);
    } catch {
      return rawHeader;
    }
  }, [activeTab, htmlTemplate, pageSettings.headerHtml, previewContext]);

  const compiledFooterHtml = useMemo(() => {
    const rawFooter =
      activeTab === 'studio' || activeTab === 'template'
        ? extractPdfTemplate(htmlTemplate, 'pdf-footer')
        : pageSettings.footerHtml;

    if (!rawFooter.trim()) return '';
    try {
      return Handlebars.compile(rawFooter)(previewContext);
    } catch {
      return rawFooter;
    }
  }, [activeTab, htmlTemplate, pageSettings.footerHtml, previewContext]);

  const previewPages = useMemo(() => {
    if (activeTab === 'studio' || activeTab === 'template') {
      try {
        const compiled = Handlebars.compile(stripPdfTemplates(htmlTemplate))(
          previewContext,
        );
        return [compiled];
      } catch (err: any) {
        return [
          `<div style="padding:20px;color:#b91c1c;font-family:monospace;">Handlebars Error: ${err.message}</div>`,
        ];
      }
    }

    return splitBlocksIntoPages(blocks).map((pageBlocks) => {
      try {
        const raw = compileSinglePageHtml(pageBlocks, pageSettings);
        return Handlebars.compile(raw)(previewContext);
      } catch (err: any) {
        return `<div style="padding:20px;color:#b91c1c;font-family:monospace;">Handlebars Error: ${err.message}</div>`;
      }
    });
  }, [activeTab, blocks, htmlTemplate, pageSettings, previewContext]);

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={bucketId ? `/reports?bucket_id=${bucketId}` : '/reports'}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <select
            value={bucketId}
            onChange={(e) => setBucketId(e.target.value)}
            className="rounded-lg border bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700"
          >
            <option value="">No Bucket</option>
            {buckets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <input
            placeholder="Report Name (e.g. Bill of Lading)"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-48 rounded-lg border px-3 py-1.5 text-sm font-medium"
          />

          <div className="flex items-center rounded-lg border bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500">
            <span>/reports/</span>
            <input
              placeholder="bill-of-lading"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-32 bg-transparent font-mono text-slate-900 focus:outline-none"
            />
            <span>/pdf</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEdit && (
            <button
              onClick={handleTestDownloadPdf}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              {downloadingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Test PDF
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !name || !slug}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? 'Update Template' : 'Save Template'}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          {saveError}
        </div>
      )}

      {/* Split Pane Workspace */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        {/* Left Pane: Studio Canvas / Visual / HTML / Queries */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex border-b bg-slate-50 px-2 pt-2">
            <button
              onClick={() => setActiveTab('studio')}
              className={`inline-flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-semibold ${
                activeTab === 'studio'
                  ? 'border border-b-white bg-white text-slate-900'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              Studio Canvas
            </button>
            <button
              onClick={() => setActiveTab('visual')}
              className={`inline-flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-semibold ${
                activeTab === 'visual'
                  ? 'border border-b-white bg-white text-slate-900'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              Blocks
            </button>
            <button
              onClick={() => setActiveTab('template')}
              className={`inline-flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-semibold ${
                activeTab === 'template'
                  ? 'border border-b-white bg-white text-slate-900'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              HTML / Handlebars
            </button>
            <button
              onClick={() => setActiveTab('sql')}
              className={`inline-flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-semibold ${
                activeTab === 'sql'
                  ? 'border border-b-white bg-white text-slate-900'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              Queries ({queries.length})
            </button>
          </div>

          {activeTab === 'studio' && (
            <JasperCanvas
              bands={studioBands}
              pageSettings={pageSettings}
              datasetSchemas={datasetSchemas}
              onChange={handleStudioChange}
              onPageSettingsChange={handlePageSettingsChange}
            />
          )}

          {activeTab === 'visual' && (
            <VisualBuilderPane
              blocks={blocks}
              pageSettings={pageSettings}
              datasetSchemas={datasetSchemas}
              onChange={handleBlocksChange}
              onPageSettingsChange={handlePageSettingsChange}
            />
          )}

          {activeTab === 'template' && (
            <div className="flex min-h-0 flex-1 flex-col">
              {datasetSchemas.length > 0 && (
                <div className="flex max-h-24 flex-wrap items-center gap-1.5 overflow-y-auto border-b bg-slate-50 px-3 py-2">
                  {datasetSchemas.map((ds) => (
                    <div key={ds.key} className="flex flex-wrap items-center gap-1">
                      <span className="text-[11px] font-semibold text-slate-500">
                        {ds.key}:
                      </span>
                      {ds.columns.map((col) => (
                        <button
                          key={`${ds.key}.${col}`}
                          onClick={() =>
                            insertFieldSnippet(
                              ds.mode === 'single'
                                ? `{{default ${ds.key}.${col} ""}}`
                                : `{{default this.${col} ""}}`,
                            )
                          }
                          className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                        >
                          {col}
                        </button>
                      ))}
                      {ds.mode === 'list' && (
                        <button
                          onClick={() => insertTableForDataset(ds.key, ds.columns)}
                          className="rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-medium text-white hover:bg-slate-700"
                        >
                          + Table
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="min-h-0 flex-1">
                <Editor
                  height="100%"
                  defaultLanguage="html"
                  value={htmlTemplate}
                  onChange={(v) => setHtmlTemplate(v ?? '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    wordWrap: 'on',
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={addQueryRow}
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Query
                </button>

                <button
                  type="button"
                  onClick={handleRunAllQueries}
                  disabled={runningSql || queries.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {runningSql ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Run All Queries
                </button>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Shared Query Parameters (JSON)
                </label>
                <input
                  value={sqlParams}
                  onChange={(e) => setSqlParams(e.target.value)}
                  placeholder='{"blNo": "SSLSGJKTPAE1373"}'
                  className="w-full rounded-lg border px-3 py-1.5 font-mono text-xs"
                />
              </div>

              {sqlError && (
                <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600">
                  {sqlError}
                </div>
              )}

              {queries.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-xs text-slate-400">
                  No SQL queries configured yet. Click &quot;Add Query&quot; to
                  pull single form values (e.g. <code>bl_header</code>) or table
                  lists (e.g. <code>containers</code>) from any DataSource.
                </div>
              ) : (
                <div className="space-y-3">
                  {queries.map((q, idx) => {
                    const res = queryResults[q.key.trim()];
                    return (
                      <div
                        key={idx}
                        className="space-y-2 rounded-lg border bg-slate-50 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            value={q.key}
                            onChange={(e) => {
                              const next = [...queries];
                              next[idx] = { ...next[idx], key: e.target.value };
                              setQueries(next);
                            }}
                            placeholder="key (e.g. bl_header)"
                            className="w-36 rounded border bg-white px-2 py-1 font-mono text-xs font-semibold"
                          />

                          <select
                            value={q.data_source_id}
                            onChange={(e) => {
                              const next = [...queries];
                              next[idx] = {
                                ...next[idx],
                                data_source_id: e.target.value,
                              };
                              setQueries(next);
                            }}
                            className="flex-1 rounded border bg-white px-2 py-1 text-xs"
                          >
                            <option value="">-- DataSource --</option>
                            {datasources.map((ds) => (
                              <option key={ds.id} value={ds.id}>
                                {ds.name} ({ds.client})
                              </option>
                            ))}
                          </select>

                          <select
                            value={q.result_mode}
                            onChange={(e) => {
                              const next = [...queries];
                              next[idx] = {
                                ...next[idx],
                                result_mode: e.target.value as
                                  | 'single'
                                  | 'list',
                              };
                              setQueries(next);
                            }}
                            className="rounded border bg-white px-2 py-1 text-xs"
                          >
                            <option value="single">Single (1 row)</option>
                            <option value="list">List (Table)</option>
                          </select>

                          <button
                            type="button"
                            onClick={() =>
                              setQueries(queries.filter((_, i) => i !== idx))
                            }
                            className="text-slate-400 hover:text-red-600"
                            title="Remove query"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <textarea
                          rows={3}
                          value={q.sql}
                          onChange={(e) => {
                            const next = [...queries];
                            next[idx] = { ...next[idx], sql: e.target.value };
                            setQueries(next);
                          }}
                          placeholder="SELECT * FROM ... WHERE id = :id"
                          className="w-full rounded border bg-white px-2.5 py-1.5 font-mono text-xs"
                        />

                        {res && (
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>
                              Returned {res.rows.length} rows ·{' '}
                              {res.columns.length} cols ({res.durationMs}ms)
                            </span>
                            {res.mode === 'list' && (
                              <button
                                type="button"
                                onClick={() =>
                                  insertTableForDataset(
                                    q.key.trim(),
                                    res.columns,
                                  )
                                }
                                className="font-medium text-slate-900 underline"
                              >
                                Insert HTML Table →
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Pane: Multi-Page Fluid Live Preview */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b bg-white px-4 py-2 text-xs font-semibold text-slate-600">
            <span>
              Live Preview ({pageSettings.paperSize} · {pageSettings.orientation}{' '}
              · {previewPages.length}{' '}
              {previewPages.length === 1 ? 'page' : 'pages'})
            </span>
            <div className="flex items-center gap-1">
              {[0.5, 0.65, 0.8, 1].map((z) => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={`rounded px-2 py-0.5 text-[11px] ${
                    zoom === z
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {Math.round(z * 100)}%
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <div className="flex flex-col items-center gap-6">
              {previewPages.map((pageHtml, index) => (
                <div key={index} className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-500">
                    Page {index + 1} of {previewPages.length}
                  </span>
                  <div
                    style={{
                      width: pageDims.width * zoom,
                      height: pageDims.height * zoom,
                    }}
                    className="relative overflow-hidden bg-white shadow-md"
                  >
                    {compiledHeaderHtml && (
                      <div
                        className="pointer-events-none absolute top-2 right-4 left-4 z-10 overflow-hidden"
                        dangerouslySetInnerHTML={{
                          __html: resolvePageTokens(
                            compiledHeaderHtml,
                            index + 1,
                            previewPages.length,
                          ),
                        }}
                      />
                    )}

                    <iframe
                      title={`Page ${index + 1}`}
                      srcDoc={pageHtml}
                      sandbox="allow-same-origin"
                      style={{
                        width: pageDims.width,
                        height: pageDims.height,
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                      }}
                      className="border-0"
                    />

                    {compiledFooterHtml && (
                      <div
                        className="pointer-events-none absolute right-4 bottom-2 left-4 z-10 overflow-hidden"
                        dangerouslySetInnerHTML={{
                          __html: resolvePageTokens(
                            compiledFooterHtml,
                            index + 1,
                            previewPages.length,
                          ),
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
