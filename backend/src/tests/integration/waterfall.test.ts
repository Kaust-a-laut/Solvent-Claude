import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WaterfallService, WaterfallStep } from '../../services/waterfallService';
import { AIProviderFactory } from '../../services/aiProviderFactory';

// Mock the Factory to return our controlled mock provider
vi.mock('../../services/aiProviderFactory');

describe('WaterfallService Integration (Mocked AI)', () => {
  let service: WaterfallService;
  let mockProvider: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WaterfallService();

    // Create a mock provider that handles JSON responses
    mockProvider = {
      generateChatCompletion: vi.fn().mockImplementation(async (messages, options) => {
        // Simple router based on context to return appropriate JSON
        const content = messages[0].content || "";
        
        if (content.includes("Analyze requirements")) {
            // Architect Step
            return JSON.stringify({
                logic: "Step 1: Write code.",
                assumptions: ["User wants JS"],
                complexity: "low"
            });
        }
        
        if (content.includes("Refine this implementation")) {
            // Reasoner Step
            return JSON.stringify({
                plan: "Detailed plan to write code.",
                steps: [{ title: "Coding", description: "Write the file." }]
            });
        }

        if (content.includes("final production-ready code")) {
            // Executor Step
            return JSON.stringify({
                code: "console.log('Hello Integration');",
                explanation: "Simple log.",
                files: ["hello.js"]
            });
        }

        if (content.includes("Senior Architect Review")) {
            // Reviewer Step
            // Simulate a passing score
            return JSON.stringify({
                score: 95,
                breakdown: { syntax: 20, security: 20, logic: 35, efficiency: 20 },
                issues: [],
                summary: "Looks good.",
                compilationStatus: "Not tested"
            });
        }

        return "{}";
      })
    };

    // Make the factory return our mock
    (AIProviderFactory.getProvider as any).mockReturnValue(mockProvider);
  });

  it('should run a full successful waterfall pipeline', async () => {
    const result = await service.runAgenticWaterfall("Build a hello world app");

    // Verify Structure
    expect(result).toBeDefined();
    expect(result.architect).toBeDefined();
    expect(result.executor).toBeDefined();
    expect(result.reviewer).toBeDefined();

    // Verify Content
    expect(result.architect.complexity).toBe('low');
    expect(result.executor.code).toContain('Hello Integration');
    expect(result.reviewer.score).toBe(95);

    // Verify interactions
    expect(mockProvider.generateChatCompletion).toHaveBeenCalledTimes(4); // Arch, Reason, Exec, Review
  });

  it('should retry when review score is low', async () => {
    // Override mock to fail the first review
    let reviewCount = 0;
    mockProvider.generateChatCompletion = vi.fn().mockImplementation(async (messages) => {
        const content = messages[0].content || "";
        if (content.includes("Senior Architect Review")) {
            reviewCount++;
            if (reviewCount === 1) {
                return JSON.stringify({ score: 50, issues: ["Too simple"], breakdown: {} });
            } else {
                return JSON.stringify({ score: 90, issues: [], breakdown: {} });
            }
        }
        // Return valid defaults for others
        if (content.includes("Analyze requirements")) return JSON.stringify({ logic: "logic" });
        if (content.includes("Refine this")) return JSON.stringify({ plan: "plan" });
        if (content.includes("final production")) return JSON.stringify({ code: "console.log('Retry');" });
        return "{}";
    });

    const result = await service.runAgenticWaterfall("Build app", 'auto', 2);

    expect(result.attempts).toBe(2);
    expect(result.history).toBeDefined();
    expect(result.history?.length).toBe(2);
    expect(result.reviewer.score).toBe(90);
  });
});
