import { StateCreator } from 'zustand';
import { AppState, Message } from './types';
import { ChatService } from '../services/ChatService';

export interface ActionSlice {
  sendMessage: (content: string, image?: string | null) => Promise<void>;
  generateImageAction: (prompt: string) => Promise<void>;
}

export const createActionSlice: StateCreator<AppState, [], [], ActionSlice> = (set, get) => ({
  sendMessage: async (content: string, image: string | null = null) => {
    const state = get();
    if (state.isProcessing) return;

    // Detect Image Generation Intent in Chat
    const imageKeywords = [
      'generate an image', 'create an image', 'draw', 'paint', 'make a picture',
      'show me a picture', 'generate a picture', 'create a picture',
      'imagine', 'render', 'visualize', 'generate image', 'make image', 'create image'
    ];
    
    // Improved detection: check for keywords or specific phrases
    const cleanContent = content.trim().replace(/^(please|can you|could you|i want to|i need to|i'd like to)\s+/i, '');
    const isExplicitRequest = /^(generate|draw|imagine|render|visualize|make|create)\b/i.test(cleanContent) ||
                             /\b(draw|generate|imagine|render|visualize|make|create)\b.*\b(image|picture|photo|graphic|art|sketch)\b/i.test(content);
    
    const isImageRequest = imageKeywords.some(k => content.toLowerCase().includes(k)) || isExplicitRequest;

    console.log(`[DEBUG] sendMessage: mode=${state.currentMode}, isImageRequest=${isImageRequest}, content="${content.substring(0, 30)}..."`);

    if (isImageRequest && (state.currentMode === 'vision' || isExplicitRequest)) {
      const prompt = content.replace(/generate an image of|create an image of|draw|paint|make a picture of|show me a picture of|generate a picture of|create a picture of|imagine|render|visualize|generate image of|make image of|generate|draw|make|please|can you|could you/gi, '').trim();
      console.log(`[DEBUG] Image intent detected. Prompt: "${prompt}"`);
      return state.generateImageAction(prompt || content);
    }

    const userMessage: Message = { role: 'user', content, image };
    state.addMessage(userMessage, state.currentMode);
    state.setIsProcessing(true);

    if (window.electron?.logAction) {
      window.electron.logAction({ type: 'user_message', content, mode: state.currentMode });
    }

    try {
      const result = await ChatService.sendMessage({
        messages: state.currentMode === 'coding' ? state.codingMessages : state.messages,
        codingHistory: state.codingMessages,
        currentMode: state.currentMode,
        modeConfigs: state.modeConfigs,
        selectedCloudModel: state.selectedCloudModel,
        selectedLocalModel: state.selectedLocalModel,
        selectedCloudProvider: state.selectedCloudProvider,
        globalProvider: state.globalProvider,
        temperature: state.temperature,
        maxTokens: state.maxTokens,
        deviceInfo: state.deviceInfo,
        notepadContent: state.notepadContent,
        openFiles: state.openFiles,
        browserContext: {
          history: state.browserHistory,
          lastSearchResults: state.lastSearchResults
        },
        apiKeys: state.apiKeys,
        thinkingModeEnabled: state.thinkingModeEnabled,
        imageProvider: state.imageProvider
      }, content, image);

      if (result.updatedNotepad) {
        state.setNotepadContent(result.updatedNotepad);
      }

      state.addMessage({ 
        role: 'assistant', 
        content: result.response,
        model: result.model,
        isGeneratedImage: result.isGeneratedImage,
        imageUrl: result.imageUrl,
        provenance: result.provenance // Attach provenance to the message
      }, state.currentMode);

      if (result.isGeneratedImage && result.imageUrl) {
        state.setLastGeneratedImage(result.imageUrl);
      }

      // Code Extraction & Auto-Update
      if (state.currentMode === 'coding' || result.response.includes('```')) {
        const codeBlocks = result.response.match(/```(?:[a-z]*)\n([\s\S]*?)```/g);
        if (codeBlocks && codeBlocks.length > 0) {
          const lastBlock = codeBlocks[codeBlocks.length - 1];
          const cleanedCode = lastBlock.replace(/```[a-z]*\n/g, '').replace(/```/g, '').trim();
          
          if (state.activeFile) {
            const newFiles = state.openFiles.map(f => 
              f.path === state.activeFile ? { ...f, content: cleanedCode } : f
            );
            state.setOpenFiles(newFiles);
            
            if (window.electron?.logAction) {
              window.electron.logAction({ type: 'ai_code_update', path: state.activeFile });
            }
          }
        }
      }

      if (result.newGraphData && result.newGraphData.nodes) {
        const mergedNodes = [...state.graphNodes];
        result.newGraphData.nodes.forEach((newNode: any) => {
          if (!mergedNodes.find(n => n.id === newNode.id)) {
            mergedNodes.push(newNode);
          }
        });
        const mergedEdges = [...state.graphEdges, ...(result.newGraphData.edges || [])];
        state.setGraphData(mergedNodes, mergedEdges);
      }
    } catch (error: any) {
      const errorMessage = error.body?.error || error.message || 'Service unavailable.';
      state.addMessage({ 
        role: 'assistant', 
        content: `Error: ${errorMessage}`,
        model: state.imageProvider === 'huggingface' ? 'Hugging Face' : 'System'
      });
    } finally {
      state.setIsProcessing(false);
    }
  },

  generateImageAction: async (prompt: string) => {
    const state = get();
    state.addMessage({ role: 'user', content: `Generate an image of: ${prompt}` });
    state.setIsProcessing(true);

    try {
      const imageUrl = await ChatService.generateImage(
        prompt, 
        state.imageProvider, 
        state.apiKeys,
        { localUrl: state.localImageUrl }
      );
      state.setLastGeneratedImage(imageUrl);
      state.addMessage({ 
        role: 'assistant', 
        content: `Here is the image I generated for: "${prompt}"`,
        model: state.imageProvider,
        isGeneratedImage: true,
        imageUrl
      });
    } catch (error: any) {
      const errorMessage = error.body?.error || error.message || 'Image generation failed.';
      state.addMessage({ 
        role: 'assistant', 
        content: `Error: ${errorMessage}`,
        model: state.imageProvider === 'huggingface' ? 'Hugging Face' : 'System'
      });
    } finally {
      state.setIsProcessing(false);
    }
  }
});
