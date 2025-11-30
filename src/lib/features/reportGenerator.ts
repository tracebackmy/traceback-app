
import { Item, ClaimRequest } from '@/types';
import { formatDate } from '../utils/dataFormatter';

/**
 * Converts an array of objects to a CSV string and triggers a download.
 */
export const downloadCSV = (data: any[], filename: string) => {
  if (!data || !data.length) {
    alert('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Add header row
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const escaped = ('' + row[header]).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const generateItemsReport = (items: Item[]) => {
  const reportData = items.map(item => ({
    ID: item.id,
    Type: item.itemType,
    Title: item.title,
    Category: item.category,
    Status: item.status,
    Station: item.stationId,
    Date: formatDate(item.createdAt)
  }));
  
  downloadCSV(reportData, `Traceback_Items_Report_${Date.now()}`);
};

export const generateClaimsReport = (claims: ClaimRequest[]) => {
  const reportData = claims.map(c => ({
    ID: c.id,
    ItemID: c.itemId,
    UserID: c.userId,
    Status: c.status,
    Date: formatDate(c.createdAt)
  }));
  
  downloadCSV(reportData, `Traceback_Claims_Report_${Date.now()}`);
};
