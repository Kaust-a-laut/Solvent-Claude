import axios from 'axios';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
}

export class SearchService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SERPER_API_KEY || '';
  }

  async search(query: string): Promise<SearchResult[]> {
    if (!this.apiKey) {
      console.warn('Serper API key not provided. Search will be skipped.');
      return [];
    }

    try {
      const response = await axios.post('https://google.serper.dev/search', {
        q: query,
        num: 5
      }, {
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      return (response.data.organic || []).map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        source: new URL(item.link).hostname
      }));
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }
}
