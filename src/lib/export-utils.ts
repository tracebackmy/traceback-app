import { Timestamp } from 'firebase/firestore';

interface ExportData {
  items: unknown[];
  claims: unknown[];
  users: unknown[];
  tickets: unknown[];
}

export const generateCSV = (data: unknown[], headers: string[]): string => {
  const csvHeaders = headers.join(',');
  const csvRows = data.map((row: unknown) => 
    headers.map(header => {
      const value = (row as Record<string, unknown>)[header];
      if (value instanceof Date) {
        return `"${value.toISOString()}"`;
      }
      if (value && typeof value === 'object' && 'toDate' in value) {
        return `"${(value as { toDate: () => Date }).toDate().toISOString()}"`;
      }
      return `"${String(value || '').replace(/"/g, '""')}"`;
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
};

export const downloadCSV = (csvData: string, filename: string): void => {
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const formatDateForExport = (timestamp: unknown): string => {
  if (!timestamp) return '';
  
  try {
    let date: Date;
    if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
      date = (timestamp as { toDate: () => Date }).toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp as string);
    }
    return date.toISOString();
  } catch {
    return '';
  }
};