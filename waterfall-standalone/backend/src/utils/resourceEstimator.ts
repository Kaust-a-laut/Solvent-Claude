export interface ResourceEstimate {
  estimatedTokens: number;
  estimatedCostUSD: number; // Rough estimate based on Llama 70B pricing ($0.70/1M tokens)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reason?: string;
}

export class ResourceEstimator {
  private static readonly COST_PER_1M_TOKENS = 0.70; // Groq Llama-3 70B approx

  static estimate(complexity: 'low' | 'medium' | 'high', promptLength: number): ResourceEstimate {
    let baseTokens = 0;
    
    switch (complexity) {
      case 'low': baseTokens = 500; break;
      case 'medium': baseTokens = 2500; break;
      case 'high': baseTokens = 10000; break;
      default: baseTokens = 1000;
    }

    // Add prompt overhead (approx 1 token per 4 chars)
    const promptTokens = Math.ceil(promptLength / 4);
    const totalEstimatedTokens = baseTokens + promptTokens;

    let riskLevel: ResourceEstimate['riskLevel'] = 'low';
    
    if (totalEstimatedTokens > 15000) riskLevel = 'critical';
    else if (totalEstimatedTokens > 8000) riskLevel = 'high';
    else if (totalEstimatedTokens > 3000) riskLevel = 'medium';

    return {
      estimatedTokens: totalEstimatedTokens,
      estimatedCostUSD: (totalEstimatedTokens / 1000000) * this.COST_PER_1M_TOKENS,
      riskLevel,
      reason: complexity === 'high' ? 'High architectural complexity detected.' : undefined
    };
  }
}
