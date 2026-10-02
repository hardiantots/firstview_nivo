'use client';

import { supabase } from '@/lib/supabase';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Callers can specify a response type while legacy callers migrate gradually.
export async function authenticatedRequest<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new ApiError('Silakan masuk kembali.', 401);
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  headers.set('Authorization', 'Bearer ' + session.access_token);
  const controller = new AbortController();
  const abort = () => controller.abort(init.signal?.reason);
  const timer = setTimeout(() => controller.abort(), 20000);
  // Compose cancellation without AbortSignal.any, including older Safari clients.
  if (init.signal?.aborted) abort();
  else init.signal?.addEventListener('abort', abort, { once: true });
  try {
    const response = await fetch(path, {
      ...init,
      cache: 'no-store',
      headers,
      signal: controller.signal,
    });
    const text = await response.text();
    let result: unknown;
    try {
      result = text ? JSON.parse(text) : undefined;
    } catch {
      throw new ApiError('Respons layanan belum dapat dibaca. Silakan coba lagi.', response.status);
    }
    if (!response.ok) {
      const message =
        result &&
        typeof result === 'object' &&
        'error' in result &&
        typeof result.error === 'string'
          ? result.error
          : 'Permintaan belum berhasil.';
      throw new ApiError(message, response.status);
    }
    return result as T;
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', abort);
  }
}
