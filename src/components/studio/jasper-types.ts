import type { PageSettings } from '../builder/visual-blocks';

export type BandType =
  | 'pageHeader'
  | 'title'
  | 'columnHeader'
  | 'detail'
  | 'summary'
  | 'pageFooter';

export type StudioElementType =
  | 'staticText'
  | 'textField'
  | 'image'
  | 'rectangle'
  | 'line'
  | 'qrCode'
  | 'pageNumber'
  | 'currentDate'
  | 'pageBreak';

export interface ElementStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'flex-start' | 'center' | 'flex-end';
  color: string;
  backgroundColor: string;
  transparent: boolean;
  borderTop: boolean;
  borderRight: boolean;
  borderBottom: boolean;
  borderLeft: boolean;
  borderStyle: 'solid' | 'dashed' | 'dotted';
  borderColor: string;
  borderWidth: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
}

export interface StudioElement {
  id: string;
  type: StudioElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  blankWhenNull?: boolean;
  printWhen?: string; // Handlebars condition, e.g. "(eq header.status 'DRAFT')"
  style: ElementStyle;
}

export interface StudioBand {
  id: BandType;
  label: string;
  height: number;
  datasetKey?: string;
  elements: StudioElement[];
}

export const DEFAULT_ELEMENT_STYLE: ElementStyle = {
  fontFamily: 'Arial, sans-serif',
  fontSize: 10,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'left',
  verticalAlign: 'center',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  transparent: true,
  borderTop: false,
  borderRight: false,
  borderBottom: false,
  borderLeft: false,
  borderStyle: 'solid',
  borderColor: '#000000',
  borderWidth: 1,
  paddingTop: 2,
  paddingRight: 4,
  paddingBottom: 2,
  paddingLeft: 4,
};

export const DEFAULT_BANDS: StudioBand[] = [
  { id: 'pageHeader', label: 'Page Header', height: 90, elements: [] },
  { id: 'title', label: 'Title', height: 50, elements: [] },
  { id: 'columnHeader', label: 'Column Header', height: 28, elements: [] },
  {
    id: 'detail',
    label: 'Detail 1',
    height: 24,
    datasetKey: 'rows',
    elements: [],
  },
  { id: 'summary', label: 'Summary', height: 110, elements: [] },
  { id: 'pageFooter', label: 'Page Footer', height: 40, elements: [] },
];

export function createStudioElement(
  type: StudioElementType,
  x = 16,
  y = 6,
): StudioElement {
  const id = `el_${Math.random().toString(36).slice(2, 9)}`;
  const base = { ...DEFAULT_ELEMENT_STYLE };

  switch (type) {
    case 'staticText':
      return { id, type, x, y, w: 140, h: 20, text: 'Static Label', style: base };
    case 'textField':
      return {
        id,
        type,
        x,
        y,
        w: 150,
        h: 20,
        text: '{{default this.name ""}}',
        blankWhenNull: true,
        style: base,
      };
    case 'rectangle':
      return {
        id,
        type,
        x,
        y,
        w: 240,
        h: 30,
        text: '',
        style: {
          ...base,
          transparent: false,
          backgroundColor: '#dc2626',
          borderTop: true,
          borderRight: true,
          borderBottom: true,
          borderLeft: true,
        },
      };
    case 'line':
      return {
        id,
        type,
        x,
        y,
        w: 300,
        h: 4,
        text: '',
        style: { ...base, borderBottom: true, borderWidth: 1 },
      };
    case 'image':
      return { id, type, x, y, w: 100, h: 50, text: '', style: base };
    case 'qrCode':
      return {
        id,
        type,
        x,
        y,
        w: 68,
        h: 68,
        text: '{{default header.qr_code "SAMPLE"}}',
        style: base,
      };
    case 'pageNumber':
      return {
        id,
        type,
        x,
        y,
        w: 110,
        h: 18,
        text: 'Page <span class="pageNumber"></span> of <span class="totalPages"></span>',
        style: { ...base, fontSize: 9, textAlign: 'right' },
      };
    case 'currentDate':
      return {
        id,
        type,
        x,
        y,
        w: 130,
        h: 18,
        text: '{{formatDate generatedAt "medium"}}',
        style: { ...base, fontSize: 9 },
      };
    case 'pageBreak':
      return {
        id,
        type,
        x: 0,
        y,
        w: 300,
        h: 8,
        text: '--- PAGE BREAK ---',
        style: {
          ...base,
          fontSize: 8,
          color: '#b45309',
          borderBottom: true,
          borderStyle: 'dashed',
          borderColor: '#f59e0b',
        },
      };
  }
}

function buildElementCss(el: StudioElement): string {
  const s = el.style;
  const bg = s.transparent ? 'transparent' : s.backgroundColor;
  const b = (enabled: boolean) =>
    enabled ? `${s.borderWidth}px ${s.borderStyle} ${s.borderColor}` : 'none';

  return [
    `position:absolute`,
    `left:${el.x}px`,
    `top:${el.y}px`,
    `width:${el.w}px`,
    `height:${el.h}px`,
    `box-sizing:border-box`,
    `overflow:hidden`,
    `display:flex`,
    `align-items:${s.verticalAlign}`,
    `justify-content:${s.textAlign === 'center' ? 'center' : s.textAlign === 'right' ? 'flex-end' : 'flex-start'}`,
    `text-align:${s.textAlign}`,
    `font-family:${s.fontFamily}`,
    `font-size:${s.fontSize}px`,
    `font-weight:${s.fontWeight}`,
    `font-style:${s.fontStyle}`,
    `text-decoration:${s.textDecoration}`,
    `color:${s.color}`,
    `background:${bg}`,
    `border-top:${b(s.borderTop)}`,
    `border-right:${b(s.borderRight)}`,
    `border-bottom:${b(s.borderBottom)}`,
    `border-left:${b(s.borderLeft)}`,
    `padding:${s.paddingTop}px ${s.paddingRight}px ${s.paddingBottom}px ${s.paddingLeft}px`,
  ].join(';');
}

function renderStudioElementHtml(el: StudioElement): string {
  let rendered = '';

  if (el.type === 'pageBreak') {
    rendered = `    <div style="page-break-after:always;break-after:page;clear:both;"></div>`;
  } else {
    const css = buildElementCss(el);

    if (el.type === 'image') {
      const inner = el.text
        ? `<img src="${el.text}" style="width:100%;height:100%;object-fit:contain;" />`
        : '';
      rendered = `    <div style="${css}">${inner}</div>`;
    } else if (el.type === 'qrCode') {
      const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${el.text || 'QR'}`;
      rendered = `    <div style="${css}"><img src="${qrSrc}" style="width:100%;height:100%;object-fit:contain;" /></div>`;
    } else if (el.type === 'rectangle' || el.type === 'line') {
      rendered = `    <div style="${css}"></div>`;
    } else {
      rendered = `    <div style="${css}"><span style="width:100%;white-space:pre-wrap;line-height:1.25;">${el.text}</span></div>`;
    }
  }

  if (el.printWhen?.trim()) {
    return `    {{#if ${el.printWhen.trim()}}}\n${rendered}\n    {{/if}}`;
  }

  return rendered;
}

export function compileStudioToHtml(
  bands: StudioBand[],
  page: PageSettings,
): string {
  const pageHeader = bands.find((b) => b.id === 'pageHeader');
  const pageFooter = bands.find((b) => b.id === 'pageFooter');

  const bodyBands = bands
    .filter((b) => b.id !== 'pageHeader' && b.id !== 'pageFooter')
    .map((band) => {
      if (band.elements.length === 0) return '';
      const els = band.elements.map(renderStudioElementHtml).join('\n');
      const bandDiv = `  <div style="position:relative;width:100%;height:${band.height}px;page-break-inside:avoid;">\n${els}\n  </div>`;

      if (band.id === 'detail') {
        const key = band.datasetKey?.trim() || 'rows';
        return `  {{#each ${key}}}\n${bandDiv}\n  {{/each}}`;
      }
      return bandDiv;
    })
    .filter(Boolean)
    .join('\n');

  const headerTag =
    pageHeader && pageHeader.elements.length > 0
      ? `<template id="pdf-header" data-height="${Math.ceil(pageHeader.height * 0.264583) + 6}mm">
  <div style="position:relative;width:100%;height:${pageHeader.height}px;padding:0 ${page.paddingRight}px 0 ${page.paddingLeft}px;box-sizing:border-box;font-family:Arial,sans-serif;">
${pageHeader.elements.map(renderStudioElementHtml).join('\n')}
  </div>
</template>`
      : '';

  const footerTag =
    pageFooter && pageFooter.elements.length > 0
      ? `<template id="pdf-footer" data-height="${Math.ceil(pageFooter.height * 0.264583) + 6}mm">
  <div style="position:relative;width:100%;height:${pageFooter.height}px;padding:0 ${page.paddingRight}px 0 ${page.paddingLeft}px;box-sizing:border-box;font-family:Arial,sans-serif;">
${pageFooter.elements.map(renderStudioElementHtml).join('\n')}
  </div>
</template>`
      : '';

  const watermarkHtml = page.watermarkText.trim()
    ? `  <div class="watermark">${page.watermarkText}</div>`
    : '';

  return `${headerTag}
${footerTag}
<!DOCTYPE html>
<html>
<head>
  <style>
    @page { size: ${page.paperSize} ${page.orientation}; }
    * { box-sizing: border-box; }
    body {
      position: relative;
      margin: 0;
      padding: ${page.paddingTop}px ${page.paddingRight}px ${page.paddingBottom}px ${page.paddingLeft}px;
      font-family: Arial, sans-serif;
      color: #0f172a;
    }
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 72px;
      font-weight: 800;
      letter-spacing: 6px;
      color: #0f172a;
      opacity: ${page.watermarkOpacity ?? 0.08};
      pointer-events: none;
      white-space: nowrap;
      z-index: 0;
    }
  </style>
</head>
<body>
${watermarkHtml}
${bodyBands}
</body>
</html>`;
}
