export interface RequestOptions extends RequestInit {
  retries?: number;
  backoff?: number;
}

export interface ApiErrorResponse {
  error?: string;
  message?: string;
  status?: number;
  [key: string]: unknown;
}

export class APIError extends Error {
  constructor(
    public message: string,
    public status?: number,
    public statusText?: string,
    public body?: ApiErrorResponse | string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

let cachedSecret: string | null = null;

/**
 * Retrieves the session secret for authenticating with the backend.
 *
 * Priority order:
 * 1. Electron preload: `window.electron.getSessionSecret()`
 * 2. Env override: `VITE_BACKEND_SECRET` in frontend/.env
 * 3. Dev auto-fallback: uses backend's built-in dev default ('solvent_dev_insecure_default')
 *    when `import.meta.env.DEV` is true — no .env file required for local development
 *
 * @throws {Error} Only in production builds without Electron
 */
async function getSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;

  // Primary: Electron preload provides the secret
  if (window.electron?.getSessionSecret) {
    cachedSecret = await window.electron.getSessionSecret();
    return cachedSecret;
  }

  // Dev mode fallback: read secret from Vite env variable
  // Set VITE_BACKEND_SECRET in frontend/.env to match BACKEND_INTERNAL_SECRET
  const devSecret = (import.meta as any).env?.VITE_BACKEND_SECRET;
  if (devSecret) {
    cachedSecret = devSecret;
    return cachedSecret;
  }

  // Auto dev-mode fallback: use the backend's built-in dev default.
  // The backend defaults to 'solvent_dev_insecure_default' when BACKEND_INTERNAL_SECRET
  // is not set in its environment. This lets the full app work in browser dev mode
  // (npm run dev) without any .env file setup.
  // In production builds import.meta.env.DEV is false so this branch never runs.
  if ((import.meta as any).env?.DEV) {
    cachedSecret = 'solvent_dev_insecure_default';
    return cachedSecret;
  }

  // No auth available (production browser without Electron)
  throw new Error(
    'Authentication unavailable: Solvent requires the Electron environment.'
  );
}

export async function fetchWithRetry(
  url: string,
  options: RequestOptions = {}
): Promise<unknown> {
  const { retries = 3, backoff = 1000, ...fetchOptions } = options;
  const secret = await getSecret();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const headers: Record<string, string> = {
        ...options.headers,
        'X-Solvent-Secret': secret
      };

      // If body is FormData, don't set Content-Type header to allow browser to set boundary
      if (options.body instanceof FormData) {
        delete headers['Content-Type'];
      }

      const response = await fetch(url, { ...fetchOptions, headers });

      if (!response.ok) {
        let errorBody: ApiErrorResponse | string;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text();
        }

        const error = new APIError(
          `Request failed with status ${response.status}`,
          response.status,
          response.statusText,
          errorBody
        );

        // Don't retry on 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500) {
          throw error;
        }

        throw error;
      }

      return await response.json();
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[API] Attempt ${attempt + 1} failed:`, {
        message: lastError.message,
        status: (lastError as APIError).status,
        body: (lastError as APIError).body
      });

      if (attempt < retries - 1) {
        const delay = backoff * Math.pow(2, attempt);
        console.log(`[API] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
