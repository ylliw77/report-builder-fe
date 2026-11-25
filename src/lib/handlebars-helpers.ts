import Handlebars from 'handlebars';

let registered = false;

export function registerHandlebarsHelpers(): void {
  if (registered) return;
  registered = true;

  // Pick a single field by row index: {{get rows 0 "shipper"}} or {{get containers 2 "container_no"}}
  Handlebars.registerHelper(
    'get',
    (arr: unknown, index: number, field?: string) => {
      if (!Array.isArray(arr)) return '';
      const item = arr[index];
      if (item === undefined || item === null) return '';
      if (typeof field === 'string' && typeof item === 'object') {
        return (item as Record<string, unknown>)[field] ?? '';
      }
      return item;
    },
  );

  // Find a specific row matching a condition and return 1 field:
  // {{find charges "charge_type" "FREIGHT" "amount"}}
  Handlebars.registerHelper(
    'find',
    (
      arr: unknown,
      matchKey: string,
      matchVal: unknown,
      returnField?: string,
    ) => {
      if (!Array.isArray(arr)) return '';
      const found = arr.find(
        (item) =>
          item &&
          typeof item === 'object' &&
          String((item as Record<string, unknown>)[matchKey]) ===
            String(matchVal),
      );
      if (!found) return '';
      if (typeof returnField === 'string') {
        return (found as Record<string, unknown>)[returnField] ?? '';
      }
      return found;
    },
  );

  // Sum a numeric column into 1 value: {{sum containers "gross_weight"}}
  Handlebars.registerHelper('sum', (arr: unknown, field: string) => {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((total, item) => {
      const val =
        item && typeof item === 'object'
          ? Number((item as Record<string, unknown>)[field])
          : 0;
      return total + (Number.isNaN(val) ? 0 : val);
    }, 0);
  });

  Handlebars.registerHelper('default', (value: unknown, fallback = '') => {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    return value;
  });

  Handlebars.registerHelper(
    'formatNumber',
    (value: unknown, decimals = 2) => {
      const num = Number(value);
      if (Number.isNaN(num)) return value ?? '0';
      const digits = typeof decimals === 'number' ? decimals : 2;
      return num.toLocaleString('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
    },
  );

  Handlebars.registerHelper('formatDate', (value: unknown, style = 'medium') => {
    if (!value) return '';
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);

    const dateStyle =
      style === 'short' || style === 'long' || style === 'full'
        ? style
        : 'medium';

    return new Intl.DateTimeFormat('en-US', { dateStyle }).format(date);
  });

  Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
  Handlebars.registerHelper('gt', (a: number, b: number) => Number(a) > Number(b));
  Handlebars.registerHelper('lt', (a: number, b: number) => Number(a) < Number(b));

  Handlebars.registerHelper(
    'slice',
    (arr: unknown, start: number, end?: number) => {
      if (!Array.isArray(arr)) return [];
      return typeof end === 'number' ? arr.slice(start, end) : arr.slice(start);
    },
  );

  Handlebars.registerHelper('length', (arr: unknown) =>
    Array.isArray(arr) ? arr.length : 0,
  );

  Handlebars.registerHelper('inc', (value: number) => Number(value) + 1);
}
