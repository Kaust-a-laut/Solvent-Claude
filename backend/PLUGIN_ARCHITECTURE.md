# Plugin Architecture (v1.0)

The Plugin Architecture enables dynamic registration of AI providers and tools without modifying core system files.

## Overview

The system consists of:
- **Plugin Manager**: Discovers and registers plugins from designated directories
- **Provider Plugins**: Extend AI provider capabilities (e.g., Anthropic, OpenAI)
- **Tool Plugins**: Add new functionality (e.g., Jira Sync, GitHub PR Creator)

## Plugin Types

### Provider Plugins
Implement `IProviderPlugin` interface with methods:
- `complete()`: Generate text completions
- `stream()`: Generate streaming completions (optional)
- `embed()`: Generate embeddings (optional)
- `vision()`: Handle vision tasks (optional)

### Tool Plugins
Implement `IToolPlugin` interface with:
- `schema`: JSON schema for function calling
- `execute()`: Execute the tool with given arguments
- `validate()`: Validate arguments before execution (optional)

## Directory Structure

```
backend/src/plugins/
├── providers/
│   ├── gemini.ts
│   ├── groq.ts
│   └── ollama.ts
└── tools/
    └── fileOperations.ts
```

## Creating a New Provider Plugin

Create a new file in `backend/src/plugins/providers/`:

```typescript
import { IProviderPlugin } from '../../types/plugins';
import { ChatMessage, CompletionOptions } from '../../types/ai';

export class MyProviderPlugin implements IProviderPlugin {
  id = 'my-provider';
  name = 'My Provider';
  description = 'Description of my provider';
  version = '1.0.0';
  defaultModel = 'my-default-model';

  private isInitialized = false;

  async initialize(options: Record<string, any>): Promise<void> {
    // Initialize your provider with options
    this.isInitialized = true;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  async complete(messages: ChatMessage[], options: CompletionOptions): Promise<string> {
    // Implement completion logic
    return "completion result";
  }
}

export default MyProviderPlugin;
```

## Creating a New Tool Plugin

Create a new file in `backend/src/plugins/tools/`:

```typescript
import { IToolPlugin } from '../../types/plugins';

export class MyToolPlugin implements IToolPlugin {
  id = 'my-tool';
  name = 'My Tool';
  description = 'Description of my tool';
  version = '1.0.0';

  schema = {
    name: 'my_tool',
    description: 'Description of what the tool does',
    parameters: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          description: 'Description of param1'
        }
      },
      required: ['param1']
    }
  };

  async initialize(options: Record<string, any>): Promise<void> {
    // Initialize your tool
  }

  isReady(): boolean {
    return true;
  }

  async execute(args: Record<string, any>): Promise<any> {
    // Implement tool execution logic
    return { result: 'success' };
  }
}

export default MyToolPlugin;
```

## API Endpoints

- `GET /api/v1/plugins` - Discover available providers and tools

## Hot Reloading

The system supports reloading plugins without restarting the server by calling `pluginManager.reload()`.

## Benefits

1. **Zero-Core-Change Scaling**: Drop a new plugin file and it instantly becomes available
2. **Community/Third-Party Tools**: Easy creation of specialized tools
3. **Encapsulation**: Reduces complexity in core services