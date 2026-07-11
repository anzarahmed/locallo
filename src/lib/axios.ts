import axios from 'axios';
import type { AxiosResponse } from 'axios';

interface ApiSuccess<T> { success: true; data: T }
interface ApiFail { success: false; message: string; errors?: string[] }
type ApiEnvelope<T> = ApiSuccess<T> | ApiFail

export class ApiError extends Error {
  readonly status: number;
  readonly errors?: string[];

  constructor(message: string, status: number, errors?: string[]) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => {
    const axiosError = error as { response?: { data?: ApiFail; status?: number } };
    const data = axiosError.response?.data;
    const status = axiosError.response?.status ?? 500;
    const message = data?.message ?? 'Something went wrong. Please try again.';
    if (status === 401) {
      window.dispatchEvent(new Event('admin:unauthorized'));
    }
    return Promise.reject(new ApiError(message, status, data?.errors));
  },
);

export async function apiGet<T>(url: string): Promise<T> {
  const res = await http.get<ApiEnvelope<T>>(url);
  return (res.data as ApiSuccess<T>).data;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await http.post<ApiEnvelope<T>>(url, body);
  return (res.data as ApiSuccess<T>).data;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const res = await http.put<ApiEnvelope<T>>(url, body);
  return (res.data as ApiSuccess<T>).data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await http.patch<ApiEnvelope<T>>(url, body);
  return (res.data as ApiSuccess<T>).data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await http.delete<ApiEnvelope<T>>(url);
  return (res.data as ApiSuccess<T>).data;
}
