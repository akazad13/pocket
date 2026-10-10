import type {Backup} from './backup';
import type {Expense} from './expenses';

export function parseCsv(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"') {
        if (next === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(cell.trim());
        cell = '';
      } else if (c === '\r') {
        // Skip carriage return
      } else if (c === '\n') {
        row.push(cell.trim());
        if (row.some(x => x.length > 0)) lines.push(row);
        row = [];
        cell = '';
      } else {
        cell += c;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some(x => x.length > 0)) lines.push(row);
  }
  return lines;
}

function cleanCell(val: string): string {
  // Strip formula injection quote prefix if present
  return val.replace(/^'/, '').trim();
}

function parseDate(raw: string): string {
  const s = cleanCell(raw);
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return s;
}

function parseCents(raw: string): number {
  const s = cleanCell(raw).replace(/[^0-9.]/g, '');
  const num = parseFloat(s);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

export function csvToBackup(csvText: string, defaultCategory = 'Groceries'): Backup {
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw Error('CSV file is empty.');
  }

  let dateIdx = 0;
  let catIdx = 1;
  let amountIdx = 2;
  let methodIdx = -1;
  let noteIdx = -1;
  let startIndex = 0;

  // Header detection
  const first = rows[0].map(h => cleanCell(h).toLowerCase());
  const hasDate = first.some(h => h.includes('date'));
  const hasAmount = first.some(h => h.includes('amount') || h.includes('cost') || h.includes('taka') || h.includes('bdt'));

  if (hasDate || hasAmount) {
    startIndex = 1;
    first.forEach((h, i) => {
      if (h.includes('date')) dateIdx = i;
      else if (h.includes('category')) catIdx = i;
      else if (h.includes('amount') || h.includes('cost') || h.includes('taka') || h.includes('bdt') || h.includes('cents')) amountIdx = i;
      else if (h.includes('method') || h.includes('paid with')) methodIdx = i;
      else if (h.includes('note') || h.includes('desc') || h.includes('memo') || h.includes('remark')) noteIdx = i;
    });
  }

  const expenses: Expense[] = [];
  const categoriesSet = new Set<string>();

  for (let i = startIndex; i < rows.length; i++) {
    const r = rows[i];
    const date = parseDate(r[dateIdx] ?? '');
    const category = cleanCell(r[catIdx] ?? '') || defaultCategory;
    const cents = parseCents(r[amountIdx] ?? '');
    const method = methodIdx >= 0 ? cleanCell(r[methodIdx] ?? '') : '';
    const note = noteIdx >= 0 ? cleanCell(r[noteIdx] ?? '') : '';

    if (cents > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      categoriesSet.add(category);
      expenses.push({
        id: crypto.randomUUID(),
        category,
        cents,
        date,
        note: note.slice(0, 200),
        method: method.slice(0, 30),
        account: '',
      });
    }
  }

  if (expenses.length === 0) {
    throw Error('No valid expense rows found in CSV. Expected columns: Date, Category, Amount.');
  }

  return {
    app: 'pocket',
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: Array.from(categoriesSet),
    budgets: {},
    expenses,
  };
}
