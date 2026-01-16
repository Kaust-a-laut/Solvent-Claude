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

export async function fetchWithRetry(url: string, options: RequestOptions = {}): Promise<any> {
  const { retries = 3, backoff = 1000, ...fetchOptions } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`[API] Fetching ${url} (Attempt ${attempt + 1}/${retries})`);
      
      const response = await fetch(url, fetchOptions);
      
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
