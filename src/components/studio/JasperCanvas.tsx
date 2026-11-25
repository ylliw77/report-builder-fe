'use client';

import { useState } from 'react';
import { Rnd } from 'react-rnd';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Calendar,
  Copy,
  Hash,
  Image as ImageIcon,
  Italic,
  Layers,
  Minus,
  QrCode,
  Scissors,
  Square,
  Trash2,
  Type,
  Underline,
  Upload,
  Variable,
} from 'lucide-react';
import {
  FieldPickerButton,
  type DatasetSchema,
} from '../builder/FieldPickerButton';
import {
  getPageDimensions,
  type PageOrientation,
  type PageSettings,
  type PaperSize,
} from '../builder/visual-blocks';
import {
  createStudioElement,
  type BandType,
  type StudioBand,
  type StudioElement,
  type StudioElementType,
} from './jasper-types';

interface Props {
  bands: StudioBand[];
  pageSettings: PageSettings;
  datasetSchemas: DatasetSchema[];
  onChange: (bands: StudioBand[]) => void;
  onPageSettingsChange: (settings: PageSettings) => void;
}

const PALETTE: { type: StudioElementType; label: string; icon: typeof Type }[] = [
  { type: 'staticText', label: 'Static Text', icon: Type },
  { type: 'textField', label: 'Text Field', icon: Variable },
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'rectangle', label: 'Rectangle', icon: Square },
  { type: 'line', label: 'Line', icon: Minus },
  { type: 'qrCode', label: 'QR Code', icon: QrCode },
  { type: 'pageNumber', label: 'Page X of Y', icon: Hash },
  { type: 'currentDate', label: 'Date', icon: Calendar },
  { type: 'pageBreak', label: 'Break', icon: Scissors },
];

export function JasperCanvas({
  bands,
  pageSettings,
  datasetSchemas,
  onChange,
  onPageSettingsChange,
}: Props) {
  const [activeBandId, setActiveBandId] = useState<BandType>('pageHeader');
  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  const [propTab, setPropTab] = useState<'text' | 'appearance' | 'borders'>(
    'text',
  );
  const [showOutline, setShowOutline] = useState(false);
  const [snapGrid, setSnapGrid] = useState(5);
  const [canvasZoom, setCanvasZoom] = useState(0.65);

  const selectedBand =
    bands.find((b) => b.elements.some((e) => e.id === selectedElId)) ?? null;
  const selectedEl =
    selectedBand?.elements.find((e) => e.id === selectedElId) ?? null;

  const listDatasets = datasetSchemas.filter((d) => d.mode === 'list');
  const pageDims = getPageDimensions(pageSettings);
  const totalBandsHeight = bands.reduce((sum, b) => sum + b.height, 0);
  const sheetHeight = Math.max(
    pageDims.height,
    totalBandsHeight + pageSettings.paddingTop + pageSettings.paddingBottom + 24,
  );
  const printableWidth = Math.max(
    240,
    pageDims.width - pageSettings.paddingLeft - pageSettings.paddingRight,
  );

  function addElement(type: StudioElementType) {
    const newEl = createStudioElement(type, 15, 5);
    onChange(
      bands.map((b) =>
        b.id === activeBandId
          ? { ...b, elements: [...b.elements, newEl] }
          : b,
      ),
    );
    setSelectedElId(newEl.id);
  }

  function duplicateSelected() {
    if (!selectedBand || !selectedEl) return;
    const copy: StudioElement = {
      ...selectedEl,
      id: `el_${Math.random().toString(36).slice(2, 9)}`,
      x: selectedEl.x + 15,
      y: selectedEl.y + 10,
      style: { ...selectedEl.style },
    };
    onChange(
      bands.map((b) =>
        b.id === selectedBand.id
          ? { ...b, elements: [...b.elements, copy] }
          : b,
      ),
    );
    setSelectedElId(copy.id);
  }

  function updateElement(
    bandId: BandType,
    elId: string,
    patch: Partial<StudioElement>,
  ) {
    onChange(
      bands.map((b) =>
        b.id === bandId
          ? {
              ...b,
              elements: b.elements.map((e) =>
                e.id === elId ? { ...e, ...patch } : e,
              ),
            }
          : b,
      ),
    );
  }

  function updateStyle(patch: Partial<StudioElement['style']>) {
    if (!selectedBand || !selectedEl) return;
    updateElement(selectedBand.id, selectedEl.id, {
      style: { ...selectedEl.style, ...patch },
    });
  }

  function deleteSelected() {
    if (!selectedBand || !selectedEl) return;
    onChange(
      bands.map((b) =>
        b.id === selectedBand.id
          ? { ...b, elements: b.elements.filter((e) => e.id !== selectedEl.id) }
          : b,
      ),
    );
    setSelectedElId(null);
  }

  function updateBand(bandId: BandType, patch: Partial<StudioBand>) {
    onChange(bands.map((b) => (b.id === bandId ? { ...b, ...patch } : b)));
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedBand || !selectedEl) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateElement(selectedBand.id, selectedEl.id, { text: reader.result });
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-2.5">
      {/* Page Setup Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50 px-2.5 py-1.5 text-xs">
        <button
          type="button"
          onClick={() => setShowOutline((v) => !v)}
          className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium ${
            showOutline
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
          title="Toggle Jasper Outline Tree"
        >
          <Layers className="h-3.5 w-3.5" />
          Outline
        </button>

        <select
          value={pageSettings.paperSize}
          onChange={(e) =>
            onPageSettingsChange({
              ...pageSettings,
              paperSize: e.target.value as PaperSize,
            })
          }
          className="rounded border bg-white px-2 py-1 text-[11px] font-medium"
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
          className="rounded border bg-white px-2 py-1 text-[11px] font-medium"
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>

        <select
          value={snapGrid}
          onChange={(e) => setSnapGrid(Number(e.target.value))}
          className="rounded border bg-white px-2 py-1 text-[11px]"
          title="Snap to grid size"
        >
          <option value={1}>Snap: 1px</option>
          <option value={5}>Snap: 5px</option>
          <option value={10}>Snap: 10px</option>
        </select>

        <div className="flex items-center gap-0.5 rounded border bg-white p-0.5">
          {[0.5, 0.65, 0.8, 1].map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setCanvasZoom(z)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                canvasZoom === z
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {Math.round(z * 100)}%
            </button>
          ))}
        </div>

        <input
          value={pageSettings.watermarkText}
          onChange={(e) =>
            onPageSettingsChange({
              ...pageSettings,
              watermarkText: e.target.value,
            })
          }
          placeholder="Watermark"
          className="w-24 rounded border bg-white px-2 py-1 text-[11px]"
        />

        <div className="ml-auto flex items-center gap-1 text-[10px] text-slate-500">
          <span>Margin:</span>
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
                className="w-10 rounded border bg-white px-1 py-0.5 text-slate-900"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Element Palette Bar */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-white px-2 py-1.5">
        <span className="mr-1 text-[11px] font-semibold text-slate-500">
          Add to <span className="text-blue-700">{activeBandId}</span>:
        </span>
        {PALETTE.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => addElement(type)}
            className="inline-flex items-center gap-1 rounded border bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
          >
            <Icon className="h-3 w-3 text-slate-500" />
            {label}
          </button>
        ))}
      </div>

      {/* Middle Area: Collapsible Outline Tree + Full-Aspect-Ratio Paper Canvas */}
      <div className="flex min-h-0 flex-1 gap-2">
        {showOutline && (
          <div className="w-40 shrink-0 overflow-y-auto rounded-lg border bg-slate-50 p-2 text-[11px]">
            <div className="mb-1.5 font-bold uppercase tracking-wide text-slate-400">
              Outline
            </div>
            <div className="space-y-1.5">
              {bands.map((band) => (
                <div key={band.id}>
                  <button
                    type="button"
                    onClick={() => setActiveBandId(band.id)}
                    className={`flex w-full items-center justify-between rounded px-1.5 py-1 text-left font-semibold ${
                      activeBandId === band.id
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-slate-700 hover:bg-slate-200/70'
                    }`}
                  >
                    <span className="truncate">{band.label}</span>
                    <span className="text-[9px] text-slate-400">
                      {band.elements.length}
                    </span>
                  </button>
                  {band.elements.length > 0 && (
                    <div className="mt-0.5 ml-2 space-y-0.5 border-l pl-1.5">
                      {band.elements.map((el) => (
                        <button
                          key={el.id}
                          type="button"
                          onClick={() => {
                            setActiveBandId(band.id);
                            setSelectedElId(el.id);
                          }}
                          className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] ${
                            selectedElId === el.id
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {el.type}: {el.text || el.id.slice(0, 6)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable Band Canvas with Accurate Portrait / Landscape Sheet */}
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-slate-200 p-4">
          <div
            style={{
              width: pageDims.width * canvasZoom,
              height: sheetHeight * canvasZoom,
            }}
            className="mx-auto"
          >
            <div
              style={{
                width: pageDims.width,
                minHeight: sheetHeight,
                transform: `scale(${canvasZoom})`,
                transformOrigin: 'top left',
                paddingTop: pageSettings.paddingTop,
                paddingRight: pageSettings.paddingRight,
                paddingBottom: pageSettings.paddingBottom,
                paddingLeft: pageSettings.paddingLeft,
              }}
              className="relative bg-white shadow-md"
            >
              {/* Top Ruler showing exact paper dimensions */}
              <div className="mb-1 flex h-4 items-center justify-between border-b bg-slate-100 px-1.5 font-mono text-[10px] text-slate-500 select-none">
                <span>0px</span>
                <span>
                  {pageSettings.paperSize} ·{' '}
                  {pageSettings.orientation.toUpperCase()} ({pageDims.width}×
                  {pageDims.height}px)
                </span>
                <span>{printableWidth}px</span>
              </div>

              {bands.map((band) => {
                const isActiveBand = band.id === activeBandId;
                return (
                  <div
                    key={band.id}
                    onMouseDown={() => setActiveBandId(band.id)}
                    className={`relative border border-dashed border-slate-300 ${
                      isActiveBand ? 'ring-1 ring-inset ring-blue-500' : ''
                    }`}
                    style={{
                      width: printableWidth,
                      height: band.height,
                      backgroundImage:
                        'linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)',
                      backgroundSize: '10px 10px',
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="select-none text-base font-medium text-slate-300/80">
                        {band.label}
                      </span>
                    </div>

                    {/* Band Controls */}
                    <div className="absolute top-0.5 right-1 z-20 flex items-center gap-1.5 rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-slate-500 shadow-xs">
                      {band.id === 'detail' && (
                        <select
                          value={band.datasetKey || 'rows'}
                          onChange={(e) =>
                            updateBand(band.id, { datasetKey: e.target.value })
                          }
                          className="rounded border px-1 py-0 font-mono text-[10px] text-slate-800"
                        >
                          <option value="rows">rows</option>
                          {listDatasets.map((ds) => (
                            <option key={ds.key} value={ds.key}>
                              {ds.key}
                            </option>
                          ))}
                        </select>
                      )}
                      <label className="flex items-center gap-0.5">
                        H:
                        <input
                          type="number"
                          min={16}
                          max={600}
                          value={band.height}
                          onChange={(e) =>
                            updateBand(band.id, {
                              height: Number(e.target.value),
                            })
                          }
                          className="w-11 rounded border px-1 text-slate-800"
                        />
                      </label>
                    </div>

                    {/* Draggable / Resizable Elements */}
                    {band.elements.map((el) => {
                      const isSelected = el.id === selectedElId;
                      const s = el.style;
                      return (
                        <Rnd
                          key={el.id}
                          bounds="parent"
                          scale={canvasZoom}
                          dragGrid={[snapGrid, snapGrid]}
                          resizeGrid={[snapGrid, snapGrid]}
                          size={{ width: el.w, height: el.h }}
                          position={{ x: el.x, y: el.y }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setActiveBandId(band.id);
                            setSelectedElId(el.id);
                          }}
                          onDragStop={(_, d) =>
                            updateElement(band.id, el.id, {
                              x: Math.round(d.x),
                              y: Math.round(d.y),
                            })
                          }
                          onResizeStop={(_, __, ref, ___, pos) =>
                            updateElement(band.id, el.id, {
                              w: parseInt(ref.style.width, 10),
                              h: parseInt(ref.style.height, 10),
                              x: Math.round(pos.x),
                              y: Math.round(pos.y),
                            })
                          }
                          className={
                            isSelected
                              ? 'z-30 ring-1 ring-blue-600'
                              : 'z-10 hover:ring-1 hover:ring-blue-300'
                          }
                        >
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: s.verticalAlign,
                              justifyContent:
                                s.textAlign === 'center'
                                  ? 'center'
                                  : s.textAlign === 'right'
                                    ? 'flex-end'
                                    : 'flex-start',
                              textAlign: s.textAlign,
                              fontFamily: s.fontFamily,
                              fontSize: s.fontSize,
                              fontWeight: s.fontWeight,
                              fontStyle: s.fontStyle,
                              textDecoration: s.textDecoration,
                              color: s.color,
                              backgroundColor: s.transparent
                                ? 'transparent'
                                : s.backgroundColor,
                              borderTop: s.borderTop
                                ? `${s.borderWidth}px ${s.borderStyle} ${s.borderColor}`
                                : 'none',
                              borderRight: s.borderRight
                                ? `${s.borderWidth}px ${s.borderStyle} ${s.borderColor}`
                                : 'none',
                              borderBottom: s.borderBottom
                                ? `${s.borderWidth}px ${s.borderStyle} ${s.borderColor}`
                                : 'none',
                              borderLeft: s.borderLeft
                                ? `${s.borderWidth}px ${s.borderStyle} ${s.borderColor}`
                                : 'none',
                              padding: `${s.paddingTop}px ${s.paddingRight}px ${s.paddingBottom}px ${s.paddingLeft}px`,
                              overflow: 'hidden',
                            }}
                          >
                            {el.type === 'image' ? (
                              el.text ? (
                                <img
                                  src={el.text}
                                  alt=""
                                  className="pointer-events-none h-full w-full object-contain"
                                />
                              ) : (
                                <span className="text-[10px] text-slate-400">
                                  Image
                                </span>
                              )
                            ) : el.type === 'qrCode' ? (
                              <span className="font-mono text-[10px] text-slate-500">
                                [QR]
                              </span>
                            ) : (
                              <span className="w-full truncate">{el.text}</span>
                            )}
                          </div>
                        </Rnd>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Jasper-Style 3-Tab Properties Inspector */}
      {selectedEl && selectedBand && (
        <div className="rounded-lg border bg-slate-50 p-2.5 text-xs">
          <div className="mb-2 flex items-center justify-between border-b pb-1.5">
            <div className="flex gap-1">
              {(['text', 'appearance', 'borders'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setPropTab(tab)}
                  className={`rounded px-2.5 py-1 text-[11px] font-semibold capitalize ${
                    propTab === tab
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab === 'text'
                    ? 'Text Field / Data'
                    : tab === 'borders'
                      ? 'Borders & Padding'
                      : 'Appearance'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={duplicateSelected}
                className="inline-flex items-center gap-1 rounded border bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                title="Duplicate element"
              >
                <Copy className="h-3 w-3" />
                Duplicate
              </button>
              <button
                type="button"
                onClick={deleteSelected}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>

          {propTab === 'text' && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  value={selectedEl.text}
                  onChange={(e) =>
                    updateElement(selectedBand.id, selectedEl.id, {
                      text: e.target.value,
                    })
                  }
                  placeholder="Static text, {{expression}}, or Image URL"
                  className="flex-1 rounded border bg-white px-2 py-1 font-mono text-xs"
                />
                {selectedEl.type === 'image' ? (
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded border bg-white px-2 py-1 font-medium hover:bg-slate-100">
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <FieldPickerButton
                    datasets={datasetSchemas}
                    onInsert={(expr) =>
                      updateElement(selectedBand.id, selectedEl.id, {
                        text: selectedEl.text
                          ? `${selectedEl.text} ${expr}`
                          : expr,
                      })
                    }
                  />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedEl.style.fontFamily}
                  onChange={(e) => updateStyle({ fontFamily: e.target.value })}
                  className="rounded border bg-white px-1.5 py-0.5 text-[11px]"
                >
                  <option value="Arial, sans-serif">Sans-Serif (Arial)</option>
                  <option value="'Times New Roman', serif">Serif (Times)</option>
                  <option value="'Courier New', monospace">Monospace</option>
                </select>

                <label className="flex items-center gap-1">
                  Size
                  <input
                    type="number"
                    min={6}
                    max={48}
                    value={selectedEl.style.fontSize}
                    onChange={(e) =>
                      updateStyle({ fontSize: Number(e.target.value) })
                    }
                    className="w-12 rounded border bg-white px-1.5 py-0.5"
                  />
                </label>

                <div className="flex rounded border bg-white">
                  <button
                    type="button"
                    onClick={() =>
                      updateStyle({
                        fontWeight:
                          selectedEl.style.fontWeight === 'bold'
                            ? 'normal'
                            : 'bold',
                      })
                    }
                    className={`p-1 ${selectedEl.style.fontWeight === 'bold' ? 'bg-slate-200' : ''}`}
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateStyle({
                        fontStyle:
                          selectedEl.style.fontStyle === 'italic'
                            ? 'normal'
                            : 'italic',
                      })
                    }
                    className={`p-1 ${selectedEl.style.fontStyle === 'italic' ? 'bg-slate-200' : ''}`}
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateStyle({
                        textDecoration:
                          selectedEl.style.textDecoration === 'underline'
                            ? 'none'
                            : 'underline',
                      })
                    }
                    className={`p-1 ${selectedEl.style.textDecoration === 'underline' ? 'bg-slate-200' : ''}`}
                  >
                    <Underline className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex rounded border bg-white">
                  {(
                    [
                      ['left', AlignLeft],
                      ['center', AlignCenter],
                      ['right', AlignRight],
                    ] as const
                  ).map(([align, Icon]) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => updateStyle({ textAlign: align })}
                      className={`p-1 ${selectedEl.style.textAlign === align ? 'bg-slate-200' : ''}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>

                <select
                  value={selectedEl.style.verticalAlign}
                  onChange={(e) =>
                    updateStyle({
                      verticalAlign: e.target.value as
                        | 'flex-start'
                        | 'center'
                        | 'flex-end',
                    })
                  }
                  className="rounded border bg-white px-1.5 py-0.5 text-[11px]"
                >
                  <option value="flex-start">Top</option>
                  <option value="center">Middle</option>
                  <option value="flex-end">Bottom</option>
                </select>
              </div>
            </div>
          )}

          {propTab === 'appearance' && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                {(['x', 'y', 'w', 'h'] as const).map((k) => (
                  <label key={k} className="flex items-center gap-1 uppercase">
                    {k}
                    <input
                      type="number"
                      value={selectedEl[k]}
                      onChange={(e) =>
                        updateElement(selectedBand.id, selectedEl.id, {
                          [k]: Number(e.target.value),
                        })
                      }
                      className="w-14 rounded border bg-white px-1.5 py-0.5"
                    />
                  </label>
                ))}
                <label className="flex items-center gap-1">
                  Text
                  <input
                    type="color"
                    value={selectedEl.style.color}
                    onChange={(e) => updateStyle({ color: e.target.value })}
                  />
                </label>
                <label className="flex items-center gap-1">
                  Bg
                  <input
                    type="color"
                    value={selectedEl.style.backgroundColor}
                    onChange={(e) =>
                      updateStyle({
                        backgroundColor: e.target.value,
                        transparent: false,
                      })
                    }
                  />
                </label>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={selectedEl.style.transparent}
                    onChange={(e) =>
                      updateStyle({ transparent: e.target.checked })
                    }
                  />
                  Transparent
                </label>
              </div>

              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[11px] font-medium text-slate-500">
                  Print When:
                </span>
                <input
                  value={selectedEl.printWhen ?? ''}
                  onChange={(e) =>
                    updateElement(selectedBand.id, selectedEl.id, {
                      printWhen: e.target.value,
                    })
                  }
                  placeholder='e.g. (eq header.status "DRAFT")'
                  className="flex-1 rounded border bg-white px-2 py-0.5 font-mono text-[11px]"
                />
              </div>
            </div>
          )}

          {propTab === 'borders' && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                {(
                  [
                    ['Top', 'borderTop'],
                    ['Right', 'borderRight'],
                    ['Bottom', 'borderBottom'],
                    ['Left', 'borderLeft'],
                  ] as const
                ).map(([label, key]) => (
                  <label key={key} className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={selectedEl.style[key]}
                      onChange={(e) => updateStyle({ [key]: e.target.checked })}
                    />
                    {label}
                  </label>
                ))}
                <select
                  value={selectedEl.style.borderStyle}
                  onChange={(e) =>
                    updateStyle({
                      borderStyle: e.target.value as
                        | 'solid'
                        | 'dashed'
                        | 'dotted',
                    })
                  }
                  className="rounded border bg-white px-1.5 py-0.5 text-[11px]"
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
                <label className="flex items-center gap-1">
                  W
                  <input
                    type="number"
                    min={0.5}
                    max={6}
                    step={0.5}
                    value={selectedEl.style.borderWidth}
                    onChange={(e) =>
                      updateStyle({ borderWidth: Number(e.target.value) })
                    }
                    className="w-12 rounded border bg-white px-1 py-0.5"
                  />
                </label>
                <input
                  type="color"
                  value={selectedEl.style.borderColor}
                  onChange={(e) => updateStyle({ borderColor: e.target.value })}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                <span className="font-medium text-slate-500">Padding (px):</span>
                {(
                  [
                    ['T', 'paddingTop'],
                    ['R', 'paddingRight'],
                    ['B', 'paddingBottom'],
                    ['L', 'paddingLeft'],
                  ] as const
                ).map(([label, key]) => (
                  <label key={key} className="flex items-center gap-1">
                    {label}
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={selectedEl.style[key]}
                      onChange={(e) =>
                        updateStyle({ [key]: Number(e.target.value) })
                      }
                      className="w-12 rounded border bg-white px-1 py-0.5 text-slate-900"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
