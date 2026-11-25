'use client';

import { useState } from 'react';
import { Image as ImageIcon, Sparkles } from 'lucide-react';
import { FieldPickerButton, type DatasetSchema } from './FieldPickerButton';
import type { PageSettings } from './visual-blocks';

interface Props {
  pageSettings: PageSettings;
  datasetSchemas: DatasetSchema[];
  onChange: (settings: PageSettings) => void;
}

const HEADER_PRESETS = [
  {
    label: 'Logo + Company Info',
    html: `<div style="width:100%;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #cbd5e1;padding-bottom:6px;font-family:Arial,sans-serif;">
  <div style="font-size:14px;font-weight:700;color:#0f172a;">COMPANY NAME</div>
  <div style="text-align:right;font-size:9px;color:#64748b;">
    <div>Document No: {{default bl_header.bl_no "-"}}</div>
    <div>Date: {{generatedAt}}</div>
  </div>
</div>`,
  },
  {
    label: 'Simple Title Bar',
    html: `<div style="width:100%;font-size:10px;color:#475569;border-bottom:1px solid #e2e8f0;padding-bottom:4px;font-family:Arial,sans-serif;">
  Official Report — {{generatedAt}}
</div>`,
  },
];

const FOOTER_PRESETS = [
  {
    label: 'Left Text + Page X of Y',
    html: `<div style="width:100%;font-size:9px;color:#64748b;display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:4px;font-family:Arial,sans-serif;">
  <span>Confidential — Generated on {{generatedAt}}</span>
  <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
</div>`,
  },
  {
    label: '3-Column Footer',
    html: `<div style="width:100%;font-size:9px;color:#64748b;display:grid;grid-template-columns:1fr 1fr 1fr;border-top:1px solid #cbd5e1;padding-top:4px;font-family:Arial,sans-serif;">
  <span>Ref: {{default bl_header.bl_no "-"}}</span>
  <span style="text-align:center;">COPY NON-NEGOTIABLE</span>
  <span style="text-align:right;">Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
</div>`,
  },
];

export function HeaderFooterDesigner({
  pageSettings,
  datasetSchemas,
  onChange,
}: Props) {
  const [section, setSection] = useState<'header' | 'footer'>('header');

  const isHeader = section === 'header';
  const currentHtml = isHeader
    ? pageSettings.headerHtml
    : pageSettings.footerHtml;
  const currentHeight = isHeader
    ? pageSettings.headerHeightMm
    : pageSettings.footerHeightMm;

  function setHtml(nextHtml: string) {
    onChange(
      isHeader
        ? { ...pageSettings, headerHtml: nextHtml }
        : { ...pageSettings, footerHtml: nextHtml },
    );
  }

  function setHeight(mm: number) {
    onChange(
      isHeader
        ? { ...pageSettings, headerHeightMm: mm }
        : { ...pageSettings, footerHeightMm: mm },
    );
  }

  function handleInsertLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const imgSnippet = `<img src="${reader.result}" style="height:28px;object-fit:contain;" />`;
        setHtml(currentHtml ? `${imgSnippet}\n${currentHtml}` : imgSnippet);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2 rounded-lg border bg-slate-50 p-2.5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-md border bg-white p-0.5">
          <button
            type="button"
            onClick={() => setSection('header')}
            className={`rounded px-2.5 py-1 text-[11px] font-semibold ${
              isHeader
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Page Header
          </button>
          <button
            type="button"
            onClick={() => setSection('footer')}
            className={`rounded px-2.5 py-1 text-[11px] font-semibold ${
              !isHeader
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Page Footer
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <label className="flex items-center gap-1 text-[11px] text-slate-600">
            Height (mm)
            <input
              type="number"
              min={10}
              max={80}
              value={currentHeight}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-14 rounded border bg-white px-1.5 py-0.5 text-slate-900"
            />
          </label>

          <label className="inline-flex cursor-pointer items-center gap-1 rounded border bg-white px-2 py-0.5 text-[11px] font-medium hover:bg-slate-100">
            <ImageIcon className="h-3 w-3" />
            + Logo
            <input
              type="file"
              accept="image/*"
              onChange={handleInsertLogo}
              className="hidden"
            />
          </label>

          <FieldPickerButton
            datasets={datasetSchemas}
            onInsert={(expr) => setHtml(`${currentHtml}${expr}`)}
          />
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-slate-400" />
        {(isHeader ? HEADER_PRESETS : FOOTER_PRESETS).map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setHtml(preset.html)}
            className="rounded border bg-white px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
          >
            {preset.label}
          </button>
        ))}
        {currentHtml && (
          <button
            type="button"
            onClick={() => setHtml('')}
            className="ml-auto text-[11px] text-red-600 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* HTML / Handlebars Designer Box */}
      <textarea
        rows={4}
        value={currentHtml}
        onChange={(e) => setHtml(e.target.value)}
        placeholder={
          isHeader
            ? 'Design repeating page header with HTML/inline CSS & {{variables}}...'
            : 'Design repeating page footer. Use <span class="pageNumber"></span> and <span class="totalPages"></span>.'
        }
        className="w-full rounded border bg-white p-2 font-mono text-[11px] leading-relaxed"
      />
    </div>
  );
}
