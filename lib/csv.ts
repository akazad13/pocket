import type { Entry } from './activity';

// Quote every cell; prefix cells starting with = + - @ so spreadsheets do not evaluate them as formulas.
export const toCsv = (rows: (string | number)[][]) =>
  rows
    .map(r =>
      r
        .map(
          cell =>
            '"' +
            String(cell)
              .replace(/^[=+\-@\t\r]/, "'$&")
              .replace(/"/g, '""') +
            '"'
        )
        .join(',')
    )
    .join('\r\n');

/**
 * Converts a filtered list of activity entries (expenses, income, transfers) into CSV string.
 */
export function entriesToCsv(entries: Entry[], names: Record<string, string> = {}): string {
  const header = ['Date', 'Type', 'Category / Details', 'Amount (BDT)', 'Account', 'Payment Method', 'Note'];
  let totalSpent = 0;
  let totalEarned = 0;
  let totalTransferred = 0;

  const dataRows: (string | number)[][] = entries.map(entry => {
    if (entry.kind === 'expense') {
      totalSpent += entry.item.cents;
      return [
        entry.item.date,
        'Expense',
        entry.item.category,
        (entry.item.cents / 100).toFixed(2),
        names[entry.item.account] || '',
        entry.item.method || '',
        entry.item.note || '',
      ];
    } else if (entry.kind === 'income') {
      totalEarned += entry.item.cents;
      return [
        entry.item.date,
        'Income',
        entry.item.source,
        (entry.item.cents / 100).toFixed(2),
        names[entry.item.account] || '',
        '',
        entry.item.note || '',
      ];
    } else {
      totalTransferred += entry.item.cents;
      const fromName = names[entry.item.from] || 'Account';
      const toName = names[entry.item.to] || 'Account';
      return [
        entry.item.date,
        'Transfer',
        `${fromName} -> ${toName}`,
        (entry.item.cents / 100).toFixed(2),
        fromName,
        '',
        entry.item.note || '',
      ];
    }
  });

  const summaryRows: (string | number)[][] = [
    [],
    ['Summary', '', '', '', '', '', ''],
    ['Total Spent', '', '', (totalSpent / 100).toFixed(2), '', '', ''],
    ['Total Earned', '', '', (totalEarned / 100).toFixed(2), '', '', ''],
    ['Total Transferred', '', '', (totalTransferred / 100).toFixed(2), '', '', ''],
    ['Net Flow (Earned - Spent)', '', '', ((totalEarned - totalSpent) / 100).toFixed(2), '', '', ''],
  ];

  return toCsv([header, ...dataRows, ...summaryRows]);
}

export function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
