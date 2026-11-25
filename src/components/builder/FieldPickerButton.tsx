'use client';

import { useState } from 'react';
import { Braces } from 'lucide-react';

export interface DatasetSchema {
  key: string;
  mode: 'single' | 'list';
  columns: string[];
}

interface Props {
  datasets: DatasetSchema[];
  onInsert: (expression: string) => void;
}

export function FieldPickerButton({ datasets, onInsert }: Props) {
  const [open, setOpen] = useState(false);

  const available = datasets.filter((d) => d.columns.length > 0);
  if (available.length === 0) return null;

  function handleSelect(dataset: DatasetSchema, col: string) {
    const expr =
      dataset.mode === 'single'
        ? `{{default ${dataset.key}.${col} ""}}`
        : `{{get ${dataset.key} 0 "${col}"}}`;
    onInsert(expr);
    setOpen(false);
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded border bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
        title="Insert a value from your SQL queries"
      >
        <Braces className="h-3 w-3" />
        Insert Field
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 max-h-56 w-56 overflow-y-auto rounded-lg border bg-white p-1.5 shadow-lg">
          {available.map((ds) => (
            <div key={ds.key} className="mb-1.5 last:mb-0">
              <div className="px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                {ds.key} ({ds.mode})
              </div>
              {ds.columns.map((col) => (
                <button
                  key={`${ds.key}.${col}`}
                  type="button"
                  onClick={() => handleSelect(ds, col)}
                  className="block w-full rounded px-2 py-1 text-left font-mono text-xs text-slate-700 hover:bg-slate-100"
                >
                  {col}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
