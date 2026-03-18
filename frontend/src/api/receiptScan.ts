import client from './client';

export interface ScannedItem {
  name: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  discount?: number;
  category?: string;
}

export interface ReceiptScanResult {
  store_name?: string;
  trip_date?: string;
  currency: string;
  items: ScannedItem[];
}

export const receiptScanApi = {
  scan: (file: File, currency = 'EUR', lang = 'en') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('currency', currency);
    formData.append('lang', lang);
    return client.post<ReceiptScanResult>('/api/receipt/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }).then((r) => r.data);
  },
};
