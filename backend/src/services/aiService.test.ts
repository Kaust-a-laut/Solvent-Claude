import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiService } from './aiService';
import { AIProviderFactory } from './aiProviderFactory';

// Mock dependencies
vi.mock('./aiProviderFactory');
vi.mock('./searchService');
vi.mock('./contextService', () => ({
  contextService: {
    enrichContext: vi.fn().mockImplementation(async (data) => ({
      messages: data.messages,
      provenance: { active: [], suppressed: [] }
    }))
  }
}));
vi.mock('./pollinationsService', () => ({
  pollinationsService: {
    generateImage: vi.fn().mockResolvedValue({ base64: 'dGVzdA==', imageUrl: 'test.png' })
  }
}));
vi.mock('./localImageService', () => ({
  localImageService: {
    checkModelAvailability: vi.fn().mockResolvedValue({ available: true })
  }
}));

describe('AIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list available models correctly', async () => {
    const mockProviders = [
      { id: 'ollama', name: 'Ollama', defaultModel: 'llama3', isReady: () => true },
      { id: 'gemini', name: 'Gemini', defaultModel: 'gemini-2.0-flash', isReady: () => true }
    ];
    (AIProviderFactory.getAllProviders as any).mockResolvedValue(mockProviders);

    const models = await aiService.listAvailableModels();
    
    expect(models).toHaveProperty('ollama');
    expect(models).toHaveProperty('gemini');
    expect(models.gemini).toContain('gemini-2.0-flash');
  });

  it('should detect image generation intent', async () => {
    // In processChat, it calls this.generateImage which might call pollinationsService
    const mockGemini = { 
      id: 'gemini',
      complete: vi.fn().mockRejectedValue(new Error('direct gemini image fail')),
      isReady: () => true 
    };
    (AIProviderFactory.getProvider as any).mockResolvedValue(mockGemini);

    const data: any = {
      messages: [{ role: 'user', content: 'generate an image of a cat' }],
      mode: 'vision',
      provider: 'gemini',
      model: 'gemini-1.5-flash'
    };

    const result = await aiService.processChat(data);
    expect(result.isGeneratedImage).toBe(true);
    expect(result.response).toContain('generated the image');
    expect(result.imageUrl).toBeDefined();
  });

  it('should handle thinking mode by injecting system instructions', async () => {
    const mockGroq = { 
      id: 'groq',
      complete: vi.fn().mockResolvedValue('I am thinking'),
      isReady: () => true 
    };
    (AIProviderFactory.getProvider as any).mockResolvedValue(mockGroq);

    const data: any = {
      messages: [{ role: 'user', content: 'Hello' }],
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      thinkingModeEnabled: true
    };

    await aiService.processChat(data);
    
    // Check if provider was called with thinking instruction
    const callArgs = (mockGroq.complete as any).mock.calls[0][0];
    expect(callArgs[0].content).toContain('[DEEP THINKING MODE ACTIVE]');
  });
});