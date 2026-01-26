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
  if (window.electron?.getSessionSecret) {
    cachedSecret = await window.electron.getSessionSecret();
    return cachedSecret;
  }
  return 'solvent_default_secure_pass_2026'; // Fallback for pure web dev mode
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
