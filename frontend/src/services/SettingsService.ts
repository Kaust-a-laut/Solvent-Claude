import { fetchWithRetry } from '../lib/api-client';

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  enabled: boolean;
  priority?: number;
}

export interface Settings {
  providers: Record<string, ProviderConfig>;
  defaultProvider: string;
  temperature: number;
  maxTokens: number;
  imageProvider: string;
  globalProvider: 'cloud' | 'local' | 'auto';
}

export interface ProviderCapabilities {
  id: string;
  name: string;
  description: string;
  version: string;
  defaultModel?: string;
  capabilities?: any;
  isReady: boolean;
}

export class SettingsService {
  static async getSettings(): Promise<Settings> {
    return await fetchWithRetry('/api/settings');
  }

  static async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    return await fetchWithRetry('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
  }

  static async getProviderConfig(providerId: string): Promise<ProviderConfig> {
    return await fetchWithRetry(`/api/settings/providers/${providerId}`);
  }

  static async updateProviderConfig(providerId: string, config: Partial<ProviderConfig>): Promise<ProviderConfig> {
    return await fetchWithRetry(`/api/settings/providers/${providerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
  }

  static async getAvailableProviders(): Promise<ProviderCapabilities[]> {
    return await fetchWithRetry('/api/settings/providers');
  }

  static async getProviderCapabilities(providerId: string): Promise<ProviderCapabilities> {
    return await fetchWithRetry(`/api/settings/providers/${providerId}/capabilities`);
  }

  static async validateProviderApiKey(providerId: string, apiKey: string): Promise<{ valid: boolean }> {
    return await fetchWithRetry(`/api/settings/providers/${providerId}/validate-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });
  }
}