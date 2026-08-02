import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const instance = axios.create({ baseURL: BASE_URL });

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
      throw new ApiError(err.response.status, err.response.data?.message ?? 'Request failed');
    }
    throw err;
  }
}

export function apiGet<T>(url: string, params?: unknown): Promise<T> {
  return request<T>(() => instance.get(url, { params }));
}
