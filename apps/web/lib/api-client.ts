const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface FetchOptions extends RequestInit {
  params?: Record<string, any>;
}

export async function apiClient<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, headers, ...restOptions } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('bc_access_token') : null;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const mergedHeaders = {
    ...defaultHeaders,
    ...headers,
  };

  try {
    const response = await fetch(url, {
      headers: mergedHeaders,
      ...restOptions,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.message || 'Request failed';
      throw new Error(errorMessage);
    }

    return data;
  } catch (err: any) {
    // Graceful fallback for mock/offline preview if API is not running
    console.warn(`API call to ${endpoint} failed:`, err?.message);
    throw err;
  }
}

apiClient.get = function <T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  return apiClient<T>(endpoint, { ...options, method: 'GET' });
};

apiClient.post = function <T = any>(endpoint: string, body?: any, options: FetchOptions = {}): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
};

apiClient.patch = function <T = any>(endpoint: string, body?: any, options: FetchOptions = {}): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
};

apiClient.delete = function <T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  return apiClient<T>(endpoint, { ...options, method: 'DELETE' });
};
