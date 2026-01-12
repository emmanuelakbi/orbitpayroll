import type {
  ApiError,
  NonceResponse,
  VerifyRequest,
  VerifyResponse,
  RefreshResponse,
  Organization,
  CreateOrgRequest,
  UpdateOrgRequest,
  Contractor,
  ContractorInput,
  PayrollPreview,
  PayrollRun,
  PayrollRunDetail,
  CreatePayrollRunRequest,
  TreasuryResponse,
  Notification,
  PaginatedResponse,
  ListParams,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

// Token storage keys
const ACCESS_TOKEN_KEY = "orbitpayroll_access_token";
const REFRESH_TOKEN_KEY = "orbitpayroll_refresh_token";

// Token management
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Custom error class
export class ApiClientError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiClientError";
    this.code = error.code;
    this.details = error.details;
  }
}

// Request options
interface RequestOptions {
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  skipAuth?: boolean;
}

// Refresh token lock to prevent multiple refresh requests
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return false;
    }

    const data: RefreshResponse = await response.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, params, skipAuth = false } = options;

  // Build URL with query params
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  // Make request
  let response = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle 401 - try to refresh token
  if (response.status === 401 && !skipAuth) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken();
    }

    const refreshed = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;

    if (refreshed) {
      // Retry request with new token
      const newToken = getAccessToken();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
      }
      response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    }
  }

  // Handle errors
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      code: "UNKNOWN_ERROR",
      message: "An unknown error occurred",
    }));
    throw new ApiClientError(error);
  }

  // Handle empty responses
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}


// API Client with typed methods
export const api = {
  // Auth endpoints
  auth: {
    getNonce: (walletAddress: string) =>
      request<NonceResponse>("POST", "/auth/nonce", {
        body: { walletAddress },
        skipAuth: true,
      }),

    verify: (data: VerifyRequest) =>
      request<VerifyResponse>("POST", "/auth/verify", {
        body: data,
        skipAuth: true,
      }),

    refresh: (refreshToken: string) =>
      request<RefreshResponse>("POST", "/auth/refresh", {
        body: { refreshToken },
        skipAuth: true,
      }),

    logout: () => request<void>("POST", "/auth/logout"),
  },

  // Organization endpoints
  orgs: {
    list: () => request<Organization[]>("GET", "/orgs"),

    get: (id: string) => request<Organization>("GET", `/orgs/${id}`),

    create: (data: CreateOrgRequest) =>
      request<Organization>("POST", "/orgs", { body: data }),

    update: (id: string, data: UpdateOrgRequest) =>
      request<Organization>("PUT", `/orgs/${id}`, { body: data }),
  },

  // Contractor endpoints
  contractors: {
    list: (orgId: string, params?: ListParams) =>
      request<PaginatedResponse<Contractor>>(
        "GET",
        `/orgs/${orgId}/contractors`,
        { params }
      ),

    get: (orgId: string, id: string) =>
      request<Contractor>("GET", `/orgs/${orgId}/contractors/${id}`),

    create: (orgId: string, data: ContractorInput) =>
      request<Contractor>("POST", `/orgs/${orgId}/contractors`, { body: data }),

    update: (orgId: string, id: string, data: Partial<ContractorInput>) =>
      request<Contractor>("PUT", `/orgs/${orgId}/contractors/${id}`, {
        body: data,
      }),

    archive: (orgId: string, id: string) =>
      request<void>("DELETE", `/orgs/${orgId}/contractors/${id}`),
  },

  // Payroll endpoints
  payroll: {
    preview: (orgId: string) =>
      request<PayrollPreview>("POST", `/orgs/${orgId}/payroll-runs/preview`),

    create: (orgId: string, data: CreatePayrollRunRequest) =>
      request<PayrollRun>("POST", `/orgs/${orgId}/payroll-runs`, { body: data }),

    list: (orgId: string, params?: ListParams) =>
      request<PaginatedResponse<PayrollRun>>(
        "GET",
        `/orgs/${orgId}/payroll-runs`,
        { params }
      ),

    get: (orgId: string, id: string) =>
      request<PayrollRunDetail>("GET", `/orgs/${orgId}/payroll-runs/${id}`),
  },

  // Treasury endpoints
  treasury: {
    get: (orgId: string) =>
      request<TreasuryResponse>("GET", `/orgs/${orgId}/treasury`),
  },

  // Notification endpoints
  notifications: {
    list: (params?: ListParams) =>
      request<PaginatedResponse<Notification>>("GET", "/notifications", {
        params,
      }),

    markAsRead: (id: string) =>
      request<void>("PUT", `/notifications/${id}/read`),

    markAllAsRead: () => request<void>("PUT", "/notifications/read-all"),
  },
};
