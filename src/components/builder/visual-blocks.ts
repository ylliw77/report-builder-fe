export type BlockType =
  | 'header'
  | 'text'
  | 'grid'
  | 'table'
  | 'summary'
  | 'image'
  | 'signature'
  | 'divider'
  | 'spacer'
  | 'page-break';

export type ImagePosition = 'block' | 'float-left' | 'float-right' | 'absolute';
export type PaperSize = 'A4' | 'Letter';
export type PageOrientation = 'portrait' | 'landscape';
export type SignaturePlacement =
  | 'inline'
  | 'last-page-bottom'
  | 'specific-page';

export interface SignerItem {
  label: string;
  name: string;
  title: string;
  imageSrc?: string;
  qrValue?: string; // Dynamic or static text/URL rendered as a QR code
}

export interface GridCellItem {
  label: string;
  content: string;
}

export interface SummaryRowItem {
  label: string;
  value: string;
  bold?: boolean;
}

export interface PageSettings {
  paperSize: PaperSize;
  orientation: PageOrientation;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  headerHtml: string;
  headerHeightMm: number;
  footerHtml: string;
  footerHeightMm: number;
  watermarkText: string;
  watermarkOpacity: number;
}

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  paperSize: 'A4',
  orientation: 'portrait',
  paddingTop: 24,
  paddingRight: 24,
  paddingBottom: 24,
  paddingLeft: 24,
  headerHtml: '',
  headerHeightMm: 22,
  footerHtml: `<div style="width:100%;font-size:9px;color:#64748b;display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:4px;font-family:Arial,sans-serif;">
  <span>Confidential — {{generatedAt}}</span>
  <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
</div>`,
  footerHeightMm: 18,
  watermarkText: '',
  watermarkOpacity: 0.08,
};

export function getPageDimensions(page: PageSettings): {
  width: number;
  height: number;
} {
  const base =
    page.paperSize === 'Letter'
      ? { width: 816, height: 1056 }
      : { width: 794, height: 1123 };

  return page.orientation === 'landscape'
    ? { width: base.height, height: base.width }
    : base;
}

export interface ReportBlock {
  id: string;
  type: BlockType;
  props: {
    marginTop?: number;
    marginBottom?: number;
    padding?: number;

    title?: string;
    subtitle?: string;
    content?: string;
    align?: 'left' | 'center' | 'right';

    gridCols?: 2 | 3;
    bordered?: boolean;
    cells?: GridCellItem[];

    datasetKey?: string;
    columns?: string[];
    tableStyle?: 'bordered' | 'minimal';

    summaryRows?: SummaryRowItem[];

    height?: number;

    src?: string;
    alt?: string;
    width?: number;
    imageHeight?: number;
    position?: ImagePosition;
    posX?: number;
    posY?: number;
    objectFit?: 'contain' | 'cover' | 'fill';

    signers?: SignerItem[];
    placement?: SignaturePlacement;
    targetPage?: number;
    sigPosX?: number;
    sigPosY?: number;
  };
}

export function createBlock(
  type: BlockType,
  availableColumns: string[] = [],
): ReportBlock {
  const id = `blk_${Math.random().toString(36).slice(2, 9)}`;

  switch (type) {
    case 'header':
      return {
        id,
        type,
        props: {
          title: 'BILLING ADVANCE SETTLEMENT',
          subtitle: 'Generated on {{generatedAt}}',
          align: 'left',
          marginTop: 0,
          marginBottom: 16,
          padding: 0,
        },
      };
    case 'text':
      return {
        id,
        type,
        props: {
          content: 'To: {{default header.customer_name "-"}}',
          align: 'left',
          marginTop: 0,
          marginBottom: 12,
          padding: 0,
        },
      };
    case 'grid':
      return {
        id,
        type,
        props: {
          gridCols: 2,
          bordered: false,
          marginTop: 0,
          marginBottom: 12,
          padding: 8,
          cells: [
            { label: 'To', content: '{{default header.customer_name "-"}}' },
            { label: 'Date', content: '{{default header.invoice_date "-"}}' },
          ],
        },
      };
    case 'table':
      return {
        id,
        type,
        props: {
          datasetKey: 'rows',
          tableStyle: 'minimal',
          columns:
            availableColumns.length > 0 ? availableColumns : ['id', 'name'],
          marginTop: 0,
          marginBottom: 16,
          padding: 0,
        },
      };
    case 'summary':
      return {
        id,
        type,
        props: {
          marginTop: 8,
          marginBottom: 16,
          padding: 0,
          summaryRows: [
            {
              label: 'Harga Jual',
              value: '{{formatNumber header.subtotal 2}}',
              bold: false,
            },
            {
              label: 'PPN 12%',
              value: '{{formatNumber header.tax 2}}',
              bold: false,
            },
            {
              label: 'Materai',
              value: '{{formatNumber header.stamp_duty 2}}',
              bold: false,
            },
            {
              label: 'Jumlah Yang Harus Dibayarkan',
              value: '{{formatNumber header.grand_total 2}}',
              bold: true,
            },
          ],
        },
      };
    case 'image':
      return {
        id,
        type,
        props: {
          src: '',
          alt: 'Logo',
          width: 140,
          imageHeight: 60,
          align: 'left',
          position: 'block',
          posX: 24,
          posY: 24,
          objectFit: 'contain',
          marginTop: 0,
          marginBottom: 12,
          padding: 0,
        },
      };
    case 'signature':
      return {
        id,
        type,
        props: {
          placement: 'last-page-bottom',
          targetPage: 1,
          marginTop: 24,
          marginBottom: 12,
          padding: 0,
          signers: [
            {
              label: 'JAKARTA, {{formatDate generatedAt "long"}}',
              name: '{{default header.approver_name "Finance Approver"}}',
              title: '{{default header.approver_title "Finance Division Head"}}',
              qrValue: '{{default header.qr_code ""}}',
            },
          ],
        },
      };
    case 'divider':
      return { id, type, props: { marginTop: 12, marginBottom: 12 } };
    case 'spacer':
      return { id, type, props: { height: 24 } };
    case 'page-break':
      return { id, type, props: {} };
  }
}

function renderBlockHtml(block: ReportBlock): string {
  const mt = block.props.marginTop ?? 0;
  const mb = block.props.marginBottom ?? 0;
  const pad = block.props.padding ?? 0;
  const boxStyle = `margin-top:${mt}px;margin-bottom:${mb}px;padding:${pad}px;`;

  switch (block.type) {
    case 'header':
      return `  <div style="${boxStyle}text-align:${block.props.align ?? 'left'};">
    <h1 style="margin:0;font-size:20px;color:#0f172a;letter-spacing:0.3px;">${block.props.title ?? ''}</h1>
    ${block.props.subtitle ? `<p style="margin:4px 0 0;font-size:12px;color:#64748b;">${block.props.subtitle}</p>` : ''}
  </div>`;

    case 'text':
      return `  <div style="${boxStyle}text-align:${block.props.align ?? 'left'};font-size:12px;line-height:1.6;color:#1e293b;white-space:pre-wrap;">
    ${block.props.content ?? ''}
  </div>`;

    case 'grid': {
      const cols = block.props.gridCols ?? 2;
      const bordered = block.props.bordered ?? true;
      const cells = block.props.cells ?? [];
      const borderCss = bordered ? 'border:1px solid #cbd5e1;' : '';
      const cellHtml = cells
        .map(
          (cell) => `    <div style="${borderCss}padding:${pad || 6}px;font-size:12px;line-height:1.5;">
      ${cell.label ? `<div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:3px;">${cell.label}</div>` : ''}
      <div style="white-space:pre-wrap;color:#0f172a;">${cell.content}</div>
    </div>`,
        )
        .join('\n');

      return `  <div style="margin-top:${mt}px;margin-bottom:${mb}px;display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:${bordered ? '0' : '12px'};clear:both;">
${cellHtml}
  </div>`;
    }

    case 'image': {
      const src = block.props.src || '';
      const w = block.props.width ?? 140;
      const h = block.props.imageHeight ?? 60;
      const fit = block.props.objectFit ?? 'contain';
      const pos = block.props.position ?? 'block';
      const imgTag = src
        ? `<img src="${src}" alt="${block.props.alt ?? ''}" style="width:${w}px;height:${h}px;object-fit:${fit};display:inline-block;" />`
        : `<div style="width:${w}px;height:${h}px;border:1px dashed #94a3b8;display:inline-flex;align-items:center;justify-content:center;font-size:11px;color:#64748b;">Image</div>`;

      if (pos === 'absolute') {
        return `  <div style="position:absolute;left:${block.props.posX ?? 24}px;top:${block.props.posY ?? 24}px;padding:${pad}px;z-index:10;">${imgTag}</div>`;
      }
      if (pos === 'float-left' || pos === 'float-right') {
        const dir = pos === 'float-left' ? 'left' : 'right';
        return `  <div style="float:${dir};margin-${dir === 'left' ? 'right' : 'left'}:12px;${boxStyle}">${imgTag}</div>`;
      }
      return `  <div style="${boxStyle}text-align:${block.props.align ?? 'left'};">${imgTag}</div>`;
    }

    case 'table': {
      const dataset = block.props.datasetKey?.trim() || 'rows';
      const cols = block.props.columns ?? ['id', 'name'];
      const isMinimal = block.props.tableStyle === 'minimal';
      const tableClass = isMinimal ? 'tbl-minimal' : 'tbl-bordered';
      const ths = cols.map((c) => `        <th>${c}</th>`).join('\n');
      const tds = cols
        .map((c) => `        <td>{{default this.${c} ""}}</td>`)
        .join('\n');
      return `  <div style="${boxStyle}clear:both;">
    <table class="${tableClass}">
      <thead><tr>\n${ths}\n      </tr></thead>
      <tbody>{{#each ${dataset}}}<tr>\n${tds}\n      </tr>{{/each}}</tbody>
    </table>
  </div>`;
    }

    case 'summary': {
      const rows = block.props.summaryRows ?? [];
      const rowHtml = rows
        .map(
          (r) => `    <tr>
      <td style="border:none;padding:4px 16px 4px 0;text-align:right;font-size:12px;${r.bold ? 'font-weight:700;' : ''}">${r.label}</td>
      <td style="border:none;border-bottom:${r.bold ? '2px double #0f172a' : '1px solid #334155'};padding:4px 0;text-align:right;font-size:12px;min-width:130px;${r.bold ? 'font-weight:700;' : ''}">${r.value}</td>
    </tr>`,
        )
        .join('\n');

      return `  <div style="${boxStyle}display:flex;justify-content:flex-end;clear:both;">
    <table style="width:auto;border-collapse:collapse;">
      <tbody>
${rowHtml}
      </tbody>
    </table>
  </div>`;
    }

    case 'signature': {
      const signers = block.props.signers ?? [];
      const cols = signers
        .map((s) => {
          let visual = `<div style="height:56px;"></div>`;
          if (s.qrValue?.trim()) {
            visual = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${s.qrValue}" style="width:68px;height:68px;margin:6px auto;display:block;" alt="QR Signature" />`;
          } else if (s.imageSrc) {
            visual = `<img src="${s.imageSrc}" style="height:52px;object-fit:contain;margin:4px auto;display:block;" />`;
          }

          return `
      <div style="flex:1;text-align:center;padding:0 12px;">
        <div style="font-size:11px;color:#334155;margin-bottom:4px;white-space:pre-wrap;">${s.label}</div>
        ${visual}
        <div style="border-top:1px solid #334155;padding-top:4px;font-size:12px;font-weight:600;color:#0f172a;">${s.name}</div>
        <div style="font-size:11px;color:#475569;">${s.title}</div>
      </div>`;
        })
        .join('');

      const isAbsolute =
        block.props.placement === 'specific-page' &&
        block.props.sigPosX !== undefined &&
        block.props.sigPosY !== undefined;

      const wrapperStyle = isAbsolute
        ? `position:absolute;left:${block.props.sigPosX}px;top:${block.props.sigPosY}px;width:calc(100% - ${(block.props.sigPosX ?? 0) * 2}px);`
        : `${boxStyle}clear:both;`;

      return `  <div style="${wrapperStyle}display:flex;justify-content:space-between;gap:16px;page-break-inside:avoid;break-inside:avoid;">
${cols}
  </div>`;
    }

    case 'divider':
      return `  <hr style="border:none;border-top:1px solid #334155;margin-top:${mt}px;margin-bottom:${mb}px;clear:both;" />`;

    case 'spacer':
      return `  <div style="height:${block.props.height ?? 24}px;clear:both;"></div>`;

    case 'page-break':
      return `  <div style="page-break-after:always;break-after:page;clear:both;"></div>`;
  }
}

function wrapHtmlDocument(bodyContent: string, page: PageSettings): string {
  const watermarkHtml = page.watermarkText.trim()
    ? `  <div class="watermark">${page.watermarkText}</div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    @page { size: ${page.paperSize} ${page.orientation}; }
    * { box-sizing: border-box; }
    body {
      position: relative;
      font-family: Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: ${page.paddingTop}px ${page.paddingRight}px ${page.paddingBottom}px ${page.paddingLeft}px;
      min-height: 100vh;
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
    table { width: 100%; border-collapse: collapse; font-size: 12px; position: relative; z-index: 1; }
    table.tbl-bordered th, table.tbl-bordered td { border: 1px solid #cbd5e1; padding: 7px 9px; text-align: left; vertical-align: top; }
    table.tbl-bordered th { background: #f1f5f9; font-weight: 600; }
    table.tbl-minimal th { border-top: 1.5px solid #0f172a; border-bottom: 1px solid #0f172a; padding: 6px 8px; text-align: left; font-weight: 600; }
    table.tbl-minimal td { border-bottom: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
  </style>
</head>
<body>
${watermarkHtml}
${bodyContent}
</body>
</html>`;
}

export function splitBlocksIntoPages(blocks: ReportBlock[]): ReportBlock[][] {
  const pages: ReportBlock[][] = [[]];
  const deferredLastPage: ReportBlock[] = [];
  const deferredSpecificPage: ReportBlock[] = [];

  for (const block of blocks) {
    if (block.type === 'page-break') {
      pages.push([]);
    } else if (
      block.type === 'signature' &&
      block.props.placement === 'last-page-bottom'
    ) {
      deferredLastPage.push(block);
    } else if (
      block.type === 'signature' &&
      block.props.placement === 'specific-page'
    ) {
      deferredSpecificPage.push(block);
    } else {
      pages[pages.length - 1].push(block);
    }
  }

  for (const sig of deferredSpecificPage) {
    const targetIdx = Math.max(0, (sig.props.targetPage ?? 1) - 1);
    while (pages.length <= targetIdx) {
      pages.push([]);
    }
    pages[targetIdx].push(sig);
  }

  pages[pages.length - 1].push(...deferredLastPage);
  return pages;
}

export function compileSinglePageHtml(
  pageBlocks: ReportBlock[],
  page: PageSettings,
): string {
  return wrapHtmlDocument(pageBlocks.map(renderBlockHtml).join('\n\n'), page);
}

export function compileBlocksToHtml(
  blocks: ReportBlock[],
  page: PageSettings = DEFAULT_PAGE_SETTINGS,
): string {
  const pages = splitBlocksIntoPages(blocks);
  const body = pages
    .map((pageBlocks, idx) => {
      const html = pageBlocks.map(renderBlockHtml).join('\n\n');
      return idx < pages.length - 1
        ? `${html}\n\n  <div style="page-break-after:always;break-after:page;clear:both;"></div>`
        : html;
    })
    .join('\n\n');

  const headerTag = page.headerHtml.trim()
    ? `<template id="pdf-header" data-height="${page.headerHeightMm}mm">
  <div style="width:100%;padding:0 10mm;box-sizing:border-box;">
    ${page.headerHtml}
  </div>
</template>`
    : '';

  const footerTag = page.footerHtml.trim()
    ? `<template id="pdf-footer" data-height="${page.footerHeightMm}mm">
  <div style="width:100%;padding:0 10mm;box-sizing:border-box;">
    ${page.footerHtml}
  </div>
</template>`
    : '';

  return `${headerTag}\n${footerTag}\n${wrapHtmlDocument(body, page)}`;
}
