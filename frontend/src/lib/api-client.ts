export interface RequestOptions extends RequestInit {
  retries?: number;
  backoff?: number;
}

export class APIError extends Error {
  constructor(
    public message: string,
    public status?: number,
    public statusText?: string,
    public body?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

let cachedSecret: string | null = null;

async function getSecret() {
  if (cachedSecret) return cachedSecret;

  try {
    if (window.electron?.getSessionSecret) {
      const secret = await window.electron.getSessionSecret();
      if (secret) {
        cachedSecret = secret;
        console.log('[API] Using Electron session secret');
        return cachedSecret;
      }
    }
  } catch (err) {
    console.warn('[API] Failed to get Electron session secret:', err);
  }

  // Fallback for pure web dev mode only — must match backend BACKEND_INTERNAL_SECRET
  const isProd = (import.meta as any).env?.PROD === true;
  if (isProd) {
    console.error('[API] FATAL: No session secret available in production. Set BACKEND_INTERNAL_SECRET.');
    throw new Error('No session secret available in production mode.');
  }
  cachedSecret = 'solvent_dev_insecure_default_32ch';
  console.warn('[API] DEV MODE: Using fallback session secret. Do not use in production.');
  return cachedSecret;
}

export async function fetchWithRetry(url: string, options: RequestOptions = {}): Promise<any> {
  const { retries = 3, backoff = 1000, ...fetchOptions } = options;
  const secret = await getSecret();
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const headers: any = {
        ...options.headers,
        'X-Solvent-Secret': secret
      };

      // If body is FormData, don't set Content-Type header to allow browser to set boundary
      if (options.body instanceof FormData) {
        delete headers['Content-Type'];
      }

      const response = await fetch(url, { ...fetchOptions, headers });
      
      if (!response.ok) {
        let errorBody;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text();
        }

        // Special handling for auth errors
        if (response.status === 401) {
          console.error('[API] Authorization failed. Secret or configuration issue.', {
            status: response.status,
            error: errorBody
          });
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
    } catch (err: any) {
      lastError = err;
      console.error(`[API] Attempt ${attempt + 1} failed:`, {
        message: err.message,
        status: err.status,
        body: err.body
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
