'use client';

import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  Columns2,
  GripVertical,
  Heading,
  Image as ImageIcon,
  Minus,
  MoveVertical,
  PenTool,
  Scissors,
  Table,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import {
  FieldPickerButton,
  type DatasetSchema,
} from './FieldPickerButton';
import { HeaderFooterDesigner } from './HeaderFooterDesigner';
import {
  createBlock,
  type BlockType,
  type ImagePosition,
  type PageOrientation,
  type PageSettings,
  type PaperSize,
  type ReportBlock,
  type SignaturePlacement,
} from './visual-blocks';

interface SortableRowProps {
  block: ReportBlock;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function getBlockSummary(block: ReportBlock): string {
  switch (block.type) {
    case 'header':
      return block.props.title || 'Untitled Header';
    case 'text':
      return block.props.content || 'Empty text block';
    case 'grid':
      return `${block.props.gridCols ?? 2}-col · ${(block.props.cells ?? []).length} boxes`;
    case 'image':
      return block.props.src
        ? `${block.props.position ?? 'block'} · ${block.props.width ?? 140}×${block.props.imageHeight ?? 60}px`
        : 'No image selected';
    case 'table':
      return `${block.props.datasetKey || 'rows'} · ${block.props.tableStyle ?? 'minimal'} · ${(block.props.columns ?? []).length} cols`;
    case 'summary':
      return `${(block.props.summaryRows ?? []).length} total rows`;
    case 'signature': {
      const count = (block.props.signers ?? []).length;
      const where =
        block.props.placement === 'specific-page'
          ? `Page ${block.props.targetPage ?? 1}`
          : (block.props.placement ?? 'last-page-bottom');
      return `${count} signers · ${where}`;
    }
    case 'divider':
      return 'Horizontal line';
    case 'spacer':
      return `${block.props.height ?? 24}px height`;
    case 'page-break':
      return 'Starts a new page';
  }
}

function SortableBlockRow({
  block,
  selected,
  onSelect,
  onDelete,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`flex cursor-pointer items-center justify-between rounded-lg border px-2.5 py-2 text-xs transition ${
        selected
          ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab text-slate-400 hover:text-slate-700"
          title="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
            block.type === 'page-break'
              ? 'bg-amber-100 text-amber-800'
              : block.type === 'signature'
                ? 'bg-indigo-100 text-indigo-800'
                : block.type === 'grid' || block.type === 'summary'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-700'
          }`}
        >
          {block.type}
        </span>
        <span className="truncate text-slate-500">
          {getBlockSummary(block)}
        </span>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="ml-2 shrink-0 text-slate-400 hover:text-red-600"
        title="Delete block"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface Props {
  blocks: ReportBlock[];
  pageSettings: PageSettings;
  datasetSchemas: DatasetSchema[];
  onChange: (blocks: ReportBlock[]) => void;
  onPageSettingsChange: (settings: PageSettings) => void;
}

const PALETTE: { type: BlockType; label: string; icon: typeof Heading }[] = [
  { type: 'header', label: 'Header', icon: Heading },
  { type: 'grid', label: 'Grid Box', icon: Columns2 },
  { type: 'text', label: 'Text', icon: Type },
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'table', label: 'Table', icon: Table },
  { type: 'summary', label: 'Totals', icon: Calculator },
  { type: 'signature', label: 'Signature / QR', icon: PenTool },
  { type: 'divider', label: 'Divider', icon: Minus },
  { type: 'spacer', label: 'Spacer', icon: MoveVertical },
  { type: 'page-break', label: 'Page Break', icon: Scissors },
];

export function VisualBuilderPane({
  blocks,
  pageSettings,
  datasetSchemas,
  onChange,
  onPageSettingsChange,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor));
  const [selectedId, setSelectedId] = useState<string | null>(
    blocks[0]?.id ?? null,
  );
  const [showHeaderFooter, setShowHeaderFooter] = useState(false);

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;
  const listDatasets = datasetSchemas.filter((d) => d.mode === 'list');

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      onChange(arrayMove(blocks, oldIndex, newIndex));
    }
  }

  function addBlock(type: BlockType) {
    const firstList = listDatasets[0];
    const next = createBlock(type, firstList?.columns ?? []);
    if (type === 'table' && firstList) {
      next.props.datasetKey = firstList.key;
    }
    onChange([...blocks, next]);
    setSelectedId(next.id);
  }

  function updateSelectedProp<K extends keyof ReportBlock['props']>(
    key: K,
    value: ReportBlock['props'][K],
  ) {
    if (!selectedBlock) return;
    onChange(
      blocks.map((b) =>
        b.id === selectedBlock.id
          ? { ...b, props: { ...b.props, [key]: value } }
          : b,
      ),
    );
  }

  function toggleTableColumn(col: string) {
    if (!selectedBlock) return;
    const current = selectedBlock.props.columns ?? [];
    const next = current.includes(col)
      ? current.filter((c) => c !== col)
      : [...current, col];
    updateSelectedProp('columns', next);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateSelectedProp('src', reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  const activeTableKey = selectedBlock?.props.datasetKey || 'rows';
  const activeTableSchema = datasetSchemas.find((d) => d.key === activeTableKey);
  const tableColumns = activeTableSchema?.columns.length
    ? activeTableSchema.columns
    : (selectedBlock?.props.columns ?? ['id', 'name']);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-3">
      {/* Page Setup Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-xs">
        <select
          value={pageSettings.paperSize}
          onChange={(e) =>
            onPageSettingsChange({
              ...pageSettings,
              paperSize: e.target.value as PaperSize,
            })
          }
          className="rounded border bg-white px-2 py-1 text-xs font-medium"
        >
          <option value="A4">A4</option>
          <option value="Letter">Letter</option>
        </select>

        <select
          value={pageSettings.orientation}
          onChange={(e) =>
            onPageSettingsChange({
              ...pageSettings,
              orientation: e.target.value as PageOrientation,
            })
          }
          className="rounded border bg-white px-2 py-1 text-xs font-medium"
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>

        <div className="flex items-center gap-1">
          <input
            value={pageSettings.watermarkText}
            onChange={(e) =>
              onPageSettingsChange({
                ...pageSettings,
                watermarkText: e.target.value,
              })
            }
            placeholder="Watermark"
            className="w-28 rounded border bg-white px-2 py-1 text-xs"
          />
          <FieldPickerButton
            datasets={datasetSchemas}
            onInsert={(expr) =>
              onPageSettingsChange({
                ...pageSettings,
                watermarkText: pageSettings.watermarkText
                  ? `${pageSettings.watermarkText} ${expr}`
                  : expr,
              })
            }
          />
        </div>

        <button
          type="button"
          onClick={() => setShowHeaderFooter((v) => !v)}
          className="inline-flex items-center gap-1 rounded border bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          Header / Footer
          {showHeaderFooter ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-500">
          <span>Pad:</span>
          {(
            [
              ['T', 'paddingTop'],
              ['R', 'paddingRight'],
              ['B', 'paddingBottom'],
              ['L', 'paddingLeft'],
            ] as const
          ).map(([label, key]) => (
            <label key={key} className="flex items-center gap-0.5">
              {label}
              <input
                type="number"
                min={0}
                max={120}
                value={pageSettings[key]}
                onChange={(e) =>
                  onPageSettingsChange({
                    ...pageSettings,
                    [key]: Number(e.target.value),
                  })
                }
                className="w-11 rounded border bg-white px-1 py-0.5 text-slate-900"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Collapsible Repeating Header & Footer Designer */}
      {showHeaderFooter && (
        <HeaderFooterDesigner
          pageSettings={pageSettings}
          datasetSchemas={datasetSchemas}
          onChange={onPageSettingsChange}
        />
      )}

      {/* Block Palette */}
      <div className="flex flex-wrap items-center gap-1.5 border-b pb-2">
        {PALETTE.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => addBlock(type)}
            className="inline-flex items-center gap-1 rounded-md border bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Icon className="h-3.5 w-3.5 text-slate-500" />
            {label}
          </button>
        ))}
      </div>

      {/* Compact Sortable Block List */}
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {blocks.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-xs text-slate-400">
            Click a block above to start building visually.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {blocks.map((block) => (
                <SortableBlockRow
                  key={block.id}
                  block={block}
                  selected={block.id === selectedId}
                  onSelect={() => setSelectedId(block.id)}
                  onDelete={() => {
                    const next = blocks.filter((b) => b.id !== block.id);
                    onChange(next);
                    if (selectedId === block.id) {
                      setSelectedId(next[0]?.id ?? null);
                    }
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Focused Properties Inspector for Selected Block */}
      {selectedBlock && (
        <div className="max-h-72 overflow-y-auto rounded-lg border bg-slate-50 p-3 text-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold uppercase text-slate-700">
              {selectedBlock.type} Properties
            </span>
          </div>

          {selectedBlock.type === 'header' && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  value={selectedBlock.props.title ?? ''}
                  onChange={(e) => updateSelectedProp('title', e.target.value)}
                  placeholder="Report Title"
                  className="flex-1 rounded border bg-white px-2.5 py-1.5 text-sm font-semibold"
                />
                <FieldPickerButton
                  datasets={datasetSchemas}
                  onInsert={(expr) =>
                    updateSelectedProp(
                      'title',
                      selectedBlock.props.title
                        ? `${selectedBlock.props.title} ${expr}`
                        : expr,
                    )
                  }
                />
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  value={selectedBlock.props.subtitle ?? ''}
                  onChange={(e) =>
                    updateSelectedProp('subtitle', e.target.value)
                  }
                  placeholder="Subtitle"
                  className="flex-1 rounded border bg-white px-2.5 py-1.5 text-xs"
                />
                <FieldPickerButton
                  datasets={datasetSchemas}
                  onInsert={(expr) =>
                    updateSelectedProp(
                      'subtitle',
                      selectedBlock.props.subtitle
                        ? `${selectedBlock.props.subtitle} ${expr}`
                        : expr,
                    )
                  }
                />
                <select
                  value={selectedBlock.props.align ?? 'left'}
                  onChange={(e) =>
                    updateSelectedProp(
                      'align',
                      e.target.value as 'left' | 'center' | 'right',
                    )
                  }
                  className="rounded border bg-white px-2 py-1"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>
          )}

          {selectedBlock.type === 'grid' && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5">
                  Columns:
                  <select
                    value={selectedBlock.props.gridCols ?? 2}
                    onChange={(e) =>
                      updateSelectedProp(
                        'gridCols',
                        Number(e.target.value) as 2 | 3,
                      )
                    }
                    className="rounded border bg-white px-2 py-1"
                  >
                    <option value={2}>2 Columns</option>
                    <option value={3}>3 Columns</option>
                  </select>
                </label>

                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={selectedBlock.props.bordered ?? true}
                    onChange={(e) =>
                      updateSelectedProp('bordered', e.target.checked)
                    }
                  />
                  Bordered Boxes
                </label>
              </div>

              {(selectedBlock.props.cells ?? []).map((cell, idx) => (
                <div
                  key={idx}
                  className="space-y-1.5 rounded border bg-white p-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      value={cell.label}
                      placeholder="Box Label (optional)"
                      onChange={(e) => {
                        const next = [...(selectedBlock.props.cells ?? [])];
                        next[idx] = { ...next[idx], label: e.target.value };
                        updateSelectedProp('cells', next);
                      }}
                      className="flex-1 rounded border px-2 py-1 text-xs font-semibold"
                    />
                    <FieldPickerButton
                      datasets={datasetSchemas}
                      onInsert={(expr) => {
                        const next = [...(selectedBlock.props.cells ?? [])];
                        next[idx] = {
                          ...next[idx],
                          content: next[idx].content
                            ? `${next[idx].content} ${expr}`
                            : expr,
                        };
                        updateSelectedProp('cells', next);
                      }}
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={cell.content}
                    placeholder="Content or {{handlebars}}"
                    onChange={(e) => {
                      const next = [...(selectedBlock.props.cells ?? [])];
                      next[idx] = { ...next[idx], content: e.target.value };
                      updateSelectedProp('cells', next);
                    }}
                    className="w-full rounded border px-2 py-1 font-mono text-xs"
                  />
                </div>
              ))}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateSelectedProp('cells', [
                      ...(selectedBlock.props.cells ?? []),
                      { label: 'Field', content: '' },
                    ])
                  }
                  className="rounded border bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-100"
                >
                  + Add Box
                </button>
                {(selectedBlock.props.cells ?? []).length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedProp(
                        'cells',
                        (selectedBlock.props.cells ?? []).slice(0, -1),
                      )
                    }
                    className="rounded border bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Remove Last
                  </button>
                )}
              </div>
            </div>
          )}

          {selectedBlock.type === 'summary' && (
            <div className="space-y-2">
              {(selectedBlock.props.summaryRows ?? []).map((row, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-center gap-1.5 rounded border bg-white p-2"
                >
                  <input
                    value={row.label}
                    placeholder="Label (e.g. PPN 12%)"
                    onChange={(e) => {
                      const next = [...(selectedBlock.props.summaryRows ?? [])];
                      next[idx] = { ...next[idx], label: e.target.value };
                      updateSelectedProp('summaryRows', next);
                    }}
                    className="w-36 rounded border px-2 py-1 text-xs"
                  />
                  <input
                    value={row.value}
                    placeholder="{{formatNumber header.total 2}}"
                    onChange={(e) => {
                      const next = [...(selectedBlock.props.summaryRows ?? [])];
                      next[idx] = { ...next[idx], value: e.target.value };
                      updateSelectedProp('summaryRows', next);
                    }}
                    className="flex-1 rounded border px-2 py-1 font-mono text-xs"
                  />
                  <FieldPickerButton
                    datasets={datasetSchemas}
                    onInsert={(expr) => {
                      const next = [...(selectedBlock.props.summaryRows ?? [])];
                      next[idx] = { ...next[idx], value: expr };
                      updateSelectedProp('summaryRows', next);
                    }}
                  />
                  <label className="inline-flex items-center gap-1 text-[11px]">
                    <input
                      type="checkbox"
                      checked={Boolean(row.bold)}
                      onChange={(e) => {
                        const next = [
                          ...(selectedBlock.props.summaryRows ?? []),
                        ];
                        next[idx] = { ...next[idx], bold: e.target.checked };
                        updateSelectedProp('summaryRows', next);
                      }}
                    />
                    Bold
                  </label>
                </div>
              ))}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateSelectedProp('summaryRows', [
                      ...(selectedBlock.props.summaryRows ?? []),
                      { label: 'Total', value: '', bold: true },
                    ])
                  }
                  className="rounded border bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-100"
                >
                  + Add Row
                </button>
                {(selectedBlock.props.summaryRows ?? []).length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedProp(
                        'summaryRows',
                        (selectedBlock.props.summaryRows ?? []).slice(0, -1),
                      )
                    }
                    className="rounded border bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Remove Last
                  </button>
                )}
              </div>
            </div>
          )}

          {selectedBlock.type === 'text' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <select
                  value={selectedBlock.props.align ?? 'left'}
                  onChange={(e) =>
                    updateSelectedProp(
                      'align',
                      e.target.value as 'left' | 'center' | 'right',
                    )
                  }
                  className="rounded border bg-white px-2 py-1"
                >
                  <option value="left">Align Left</option>
                  <option value="center">Align Center</option>
                  <option value="right">Align Right</option>
                </select>
                <FieldPickerButton
                  datasets={datasetSchemas}
                  onInsert={(expr) =>
                    updateSelectedProp(
                      'content',
                      selectedBlock.props.content
                        ? `${selectedBlock.props.content} ${expr}`
                        : expr,
                    )
                  }
                />
              </div>
              <textarea
                rows={3}
                value={selectedBlock.props.content ?? ''}
                onChange={(e) => updateSelectedProp('content', e.target.value)}
                className="w-full rounded border bg-white px-2.5 py-1.5"
              />
            </div>
          )}

          {selectedBlock.type === 'image' && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  value={selectedBlock.props.src ?? ''}
                  onChange={(e) => updateSelectedProp('src', e.target.value)}
                  placeholder="Image URL, {{field}}, or upload →"
                  className="flex-1 rounded border bg-white px-2.5 py-1.5"
                />
                <FieldPickerButton
                  datasets={datasetSchemas}
                  onInsert={(expr) => updateSelectedProp('src', expr)}
                />
                <label className="inline-flex cursor-pointer items-center gap-1 rounded border bg-white px-2.5 py-1.5 font-medium hover:bg-slate-100">
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-0.5 text-[11px] text-slate-500">
                  Width (px)
                  <input
                    type="number"
                    min={10}
                    value={selectedBlock.props.width ?? 140}
                    onChange={(e) =>
                      updateSelectedProp('width', Number(e.target.value))
                    }
                    className="rounded border bg-white px-2 py-1 text-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-[11px] text-slate-500">
                  Height (px)
                  <input
                    type="number"
                    min={10}
                    value={selectedBlock.props.imageHeight ?? 60}
                    onChange={(e) =>
                      updateSelectedProp('imageHeight', Number(e.target.value))
                    }
                    className="rounded border bg-white px-2 py-1 text-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-[11px] text-slate-500">
                  Fit
                  <select
                    value={selectedBlock.props.objectFit ?? 'contain'}
                    onChange={(e) =>
                      updateSelectedProp(
                        'objectFit',
                        e.target.value as 'contain' | 'cover' | 'fill',
                      )
                    }
                    className="rounded border bg-white px-2 py-1 text-slate-900"
                  >
                    <option value="contain">Contain</option>
                    <option value="cover">Cover</option>
                    <option value="fill">Stretch</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-0.5 text-[11px] text-slate-500">
                  Position Mode
                  <select
                    value={selectedBlock.props.position ?? 'block'}
                    onChange={(e) =>
                      updateSelectedProp(
                        'position',
                        e.target.value as ImagePosition,
                      )
                    }
                    className="rounded border bg-white px-2 py-1 text-slate-900"
                  >
                    <option value="block">Normal (Block)</option>
                    <option value="float-left">Float Left</option>
                    <option value="float-right">Float Right</option>
                    <option value="absolute">Absolute (X / Y)</option>
                  </select>
                </label>

                {selectedBlock.props.position === 'block' && (
                  <label className="flex flex-col gap-0.5 text-[11px] text-slate-500">
                    Alignment
                    <select
                      value={selectedBlock.props.align ?? 'left'}
                      onChange={(e) =>
                        updateSelectedProp(
                          'align',
                          e.target.value as 'left' | 'center' | 'right',
                        )
                      }
                      className="rounded border bg-white px-2 py-1 text-slate-900"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </label>
                )}

                {selectedBlock.props.position === 'absolute' && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <label className="flex flex-col gap-0.5 text-[11px] text-slate-500">
                      X (px)
                      <input
                        type="number"
                        value={selectedBlock.props.posX ?? 24}
                        onChange={(e) =>
                          updateSelectedProp('posX', Number(e.target.value))
                        }
                        className="rounded border bg-white px-2 py-1 text-slate-900"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5 text-[11px] text-slate-500">
                      Y (px)
                      <input
                        type="number"
                        value={selectedBlock.props.posY ?? 24}
                        onChange={(e) =>
                          updateSelectedProp('posY', Number(e.target.value))
                        }
                        className="rounded border bg-white px-2 py-1 text-slate-900"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedBlock.type === 'signature' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-0.5 text-[11px] text-slate-500">
                  Placement
                  <select
                    value={selectedBlock.props.placement ?? 'last-page-bottom'}
                    onChange={(e) =>
                      updateSelectedProp(
                        'placement',
                        e.target.value as SignaturePlacement,
                      )
                    }
                    className="rounded border bg-white px-2 py-1 text-xs text-slate-900"
                  >
                    <option value="last-page-bottom">Bottom of Last Page</option>
                    <option value="inline">Inline (Where Dragged)</option>
                    <option value="specific-page">Specific Page #</option>
                  </select>
                </label>

                {selectedBlock.props.placement === 'specific-page' && (
                  <label className="flex flex-col gap-0.5 text-[11px] text-slate-500">
                    Target Page #
                    <input
                      type="number"
                      min={1}
                      value={selectedBlock.props.targetPage ?? 1}
                      onChange={(e) =>
                        updateSelectedProp('targetPage', Number(e.target.value))
                      }
                      className="rounded border bg-white px-2 py-1 text-xs text-slate-900"
                    />
                  </label>
                )}
              </div>

              {(selectedBlock.props.signers ?? []).map((signer, idx) => (
                <div
                  key={idx}
                  className="space-y-1.5 rounded border bg-white p-2"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      value={signer.label}
                      placeholder="Location / Date / Header"
                      onChange={(e) => {
                        const next = [...(selectedBlock.props.signers ?? [])];
                        next[idx] = { ...next[idx], label: e.target.value };
                        updateSelectedProp('signers', next);
                      }}
                      className="flex-1 rounded border px-1.5 py-1 text-xs"
                    />
                    <FieldPickerButton
                      datasets={datasetSchemas}
                      onInsert={(expr) => {
                        const next = [...(selectedBlock.props.signers ?? [])];
                        next[idx] = {
                          ...next[idx],
                          label: next[idx].label
                            ? `${next[idx].label} ${expr}`
                            : expr,
                        };
                        updateSelectedProp('signers', next);
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex items-center gap-1">
                      <input
                        value={signer.name}
                        placeholder="Signer Name"
                        onChange={(e) => {
                          const next = [...(selectedBlock.props.signers ?? [])];
                          next[idx] = { ...next[idx], name: e.target.value };
                          updateSelectedProp('signers', next);
                        }}
                        className="w-full rounded border px-1.5 py-1 text-xs"
                      />
                      <FieldPickerButton
                        datasets={datasetSchemas}
                        onInsert={(expr) => {
                          const next = [...(selectedBlock.props.signers ?? [])];
                          next[idx] = { ...next[idx], name: expr };
                          updateSelectedProp('signers', next);
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        value={signer.title}
                        placeholder="Title / Role"
                        onChange={(e) => {
                          const next = [...(selectedBlock.props.signers ?? [])];
                          next[idx] = { ...next[idx], title: e.target.value };
                          updateSelectedProp('signers', next);
                        }}
                        className="w-full rounded border px-1.5 py-1 text-xs"
                      />
                      <FieldPickerButton
                        datasets={datasetSchemas}
                        onInsert={(expr) => {
                          const next = [...(selectedBlock.props.signers ?? [])];
                          next[idx] = { ...next[idx], title: expr };
                          updateSelectedProp('signers', next);
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      value={signer.qrValue ?? ''}
                      placeholder="QR Code value / URL (optional, e.g. {{header.qr_token}})"
                      onChange={(e) => {
                        const next = [...(selectedBlock.props.signers ?? [])];
                        next[idx] = { ...next[idx], qrValue: e.target.value };
                        updateSelectedProp('signers', next);
                      }}
                      className="flex-1 rounded border px-1.5 py-1 font-mono text-[11px]"
                    />
                    <FieldPickerButton
                      datasets={datasetSchemas}
                      onInsert={(expr) => {
                        const next = [...(selectedBlock.props.signers ?? [])];
                        next[idx] = { ...next[idx], qrValue: expr };
                        updateSelectedProp('signers', next);
                      }}
                    />
                  </div>
                </div>
              ))}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateSelectedProp('signers', [
                      ...(selectedBlock.props.signers ?? []),
                      {
                        label: 'Approved By',
                        name: '________________',
                        title: 'Role',
                        qrValue: '',
                      },
                    ])
                  }
                  className="rounded border bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-100"
                >
                  + Add Signer
                </button>
                {(selectedBlock.props.signers ?? []).length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedProp(
                        'signers',
                        (selectedBlock.props.signers ?? []).slice(0, -1),
                      )
                    }
                    className="rounded border bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Remove Last
                  </button>
                )}
              </div>
            </div>
          )}

          {selectedBlock.type === 'table' && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-slate-600">
                  Dataset:
                  <select
                    value={activeTableKey}
                    onChange={(e) => {
                      const nextKey = e.target.value;
                      const schema = datasetSchemas.find(
                        (d) => d.key === nextKey,
                      );
                      onChange(
                        blocks.map((b) =>
                          b.id === selectedBlock.id
                            ? {
                                ...b,
                                props: {
                                  ...b.props,
                                  datasetKey: nextKey,
                                  columns: schema?.columns.length
                                    ? schema.columns
                                    : b.props.columns,
                                },
                              }
                            : b,
                        ),
                      );
                    }}
                    className="rounded border bg-white px-2 py-1 font-mono text-xs text-slate-900"
                  >
                    <option value="rows">rows (default)</option>
                    {listDatasets.map((ds) => (
                      <option key={ds.key} value={ds.key}>
                        {ds.key}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-1.5 text-slate-600">
                  Style:
                  <select
                    value={selectedBlock.props.tableStyle ?? 'minimal'}
                    onChange={(e) =>
                      updateSelectedProp(
                        'tableStyle',
                        e.target.value as 'bordered' | 'minimal',
                      )
                    }
                    className="rounded border bg-white px-2 py-1 text-xs text-slate-900"
                  >
                    <option value="minimal">Minimal (Lines Only)</option>
                    <option value="bordered">Full Grid Border</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {tableColumns.map((col) => {
                  const selected = (selectedBlock.props.columns ?? []).includes(
                    col,
                  );
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => toggleTableColumn(col)}
                      className={`rounded px-2 py-0.5 font-mono text-xs ${
                        selected
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {col}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedBlock.type === 'spacer' && (
            <label className="flex items-center gap-2 text-slate-600">
              Height (px):
              <input
                type="number"
                min={8}
                max={200}
                value={selectedBlock.props.height ?? 24}
                onChange={(e) =>
                  updateSelectedProp('height', Number(e.target.value))
                }
                className="w-20 rounded border bg-white px-2 py-1"
              />
            </label>
          )}

          {selectedBlock.type === 'page-break' && (
            <p className="text-slate-500">
              Forces subsequent blocks onto a new PDF page.
            </p>
          )}

          {selectedBlock.type !== 'spacer' &&
            selectedBlock.type !== 'page-break' && (
              <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t pt-2 text-[11px] text-slate-500">
                <label className="flex items-center gap-1">
                  MT
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={selectedBlock.props.marginTop ?? 0}
                    onChange={(e) =>
                      updateSelectedProp('marginTop', Number(e.target.value))
                    }
                    className="w-14 rounded border bg-white px-1.5 py-0.5 text-slate-900"
                  />
                </label>
                <label className="flex items-center gap-1">
                  MB
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={selectedBlock.props.marginBottom ?? 0}
                    onChange={(e) =>
                      updateSelectedProp('marginBottom', Number(e.target.value))
                    }
                    className="w-14 rounded border bg-white px-1.5 py-0.5 text-slate-900"
                  />
                </label>
                {selectedBlock.type !== 'divider' && (
                  <label className="flex items-center gap-1">
                    Pad
                    <input
                      type="number"
                      min={0}
                      max={80}
                      value={selectedBlock.props.padding ?? 0}
                      onChange={(e) =>
                        updateSelectedProp('padding', Number(e.target.value))
                      }
                      className="w-14 rounded border bg-white px-1.5 py-0.5 text-slate-900"
                    />
                  </label>
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
}
