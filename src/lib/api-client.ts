import { ApiResponse } from "../../shared/types"
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('casaconta_token');
  const headers: HeadersInit = { ...init?.headers };
  if (!(init?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(path, { ...init, headers });
  if (res.status === 401) {
    // Unauthorized, clear token and redirect to login
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.success || json.data === undefined) {
    throw new Error(json.error || 'Request failed');
  }
  return json.data;
}
export async function verifyAuth(): Promise<boolean> {
  try {
    await api('/api/auth/verify');
    return true;
  } catch {
    clearToken();
    return false;
  }
}
export function clearToken() {
  localStorage.removeItem('casaconta_token');
}