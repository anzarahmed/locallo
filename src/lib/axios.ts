import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const instance = axios.create({ baseURL: BASE_URL });

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('seller_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(fn: () => Promise<{ data: { success: boolean; message: string; data: T } }>): Promise<T> {
  try {
    const res = await fn();
    return res.data.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      if (err.response.status === 401) {
        window.dispatchEvent(new Event('seller:unauthorized'));
      }
      throw new ApiError(err.response.status, err.response.data?.message ?? 'Request failed');
    }
    throw err;
  }
}

export function apiPost<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(() => instance.post(url, body));
}

export function apiGet<T>(url: string, params?: unknown): Promise<T> {
  return request<T>(() => instance.get(url, { params }));
}

export function apiPut<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(() => instance.put(url, body));
}

export function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(() => instance.patch(url, body));
}

export function apiDelete<T>(url: string): Promise<T> {
  return request<T>(() => instance.delete(url));
}
