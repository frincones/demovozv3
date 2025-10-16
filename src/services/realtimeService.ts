import type {
  RealtimeSessionConfig,
  RealtimeTool,
  ConversationItem,
  RealtimeEvent,
  ConnectionState
} from '@/types/realtime';

import { RealtimeError } from '@/types/realtime';

import type { AppConfig } from '@/types';

class RealtimeService {
  private client: any = null; // Will be OpenAI RealtimeWebSocket
  private connectionState: ConnectionState = 'disconnected';
  private config: RealtimeSessionConfig;
  private eventHandlers: Map<string, Function[]> = new Map();
  private tools: Map<string, Function> = new Map();
  private conversation: ConversationItem[] = [];
  private isInitialized = false;
  private lastConversationUpdate: number = 0;

  constructor(config: RealtimeSessionConfig) {
    this.config = config;
  }

  // Initialize OpenAI Realtime Client using beta package
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing OpenAI Realtime client...');

      // Dynamic import of OpenAI Realtime beta client
      const { RealtimeClient } = await import('@openai/realtime-api-beta');
      console.log('RealtimeClient imported successfully');

      // Check if API key is available
      if (!this.config.apiKey) {
        throw new Error('OpenAI API key is required. Please set VITE_OPENAI_API_KEY environment variable.');
      }

      console.log('API key found, creating client...');

      // Create client with API key
      // Note: dangerouslyAllowAPIKeyInBrowser is required for direct browser usage
      // In production, this should be replaced with a relay server
      const clientConfig: any = {
        apiKey: this.config.apiKey,
        dangerouslyAllowAPIKeyInBrowser: true
      };

      this.client = new RealtimeClient(clientConfig);
      console.log('RealtimeClient created successfully');

      // Configure the session
      await this.configureSession();
      console.log('Session configured');

      // Setup event listeners
      this.setupEventListeners();
      console.log('Event listeners setup');

      this.isInitialized = true;
      console.log('Realtime client initialization completed');
    } catch (error) {
      console.error('Failed to initialize Realtime client:', error);
      throw new RealtimeError({
        type: 'initialization_error',
        message: 'Failed to initialize OpenAI Realtime client',
        details: error
      });
    }
  }

  // Configure session with Lirvana-specific settings
  private async configureSession(): Promise<void> {
    if (!this.client) return;

    try {
      // Minimal configuration to avoid connection issues
      const sessionConfig = {
        model: this.config.model || 'gpt-4o-realtime-preview',
        modalities: ['text', 'audio'],
        instructions: this.getDefaultInstructions()
      };

      console.log('Configuring session with:', {
        model: sessionConfig.model,
        modalities: sessionConfig.modalities,
        instructions: 'simplified'
      });

      this.client.updateSession(sessionConfig);
    } catch (error) {
      console.error('Error configuring session:', error);
      throw error;
    }
  }

  // Get simplified instructions for audio compatibility
  private getDefaultInstructions(): string {
    return `You are Lirvana, a helpful assistant for Lirvan.com, a solar equipment company. Always ask for the user's location (country, city, department) to help them better. Be friendly and professional.`;
  }

  // Setup event listeners for RealtimeClient beta
  private setupEventListeners(): void {
    if (!this.client) return;

    // Connection error handling
    this.client.on('error', (error: any) => {
      console.error('RealtimeClient error:', error);
      this.connectionState = 'error';
      this.emit('error', error);
    });

    // Connection events with better debugging
    this.client.on('open', () => {
      console.log('[REALTIME] 🟢 Connection opened');
      this.connectionState = 'connected';
      this.emit('connected');
    });

    this.client.on('close', (event: any) => {
      console.log('[REALTIME] 🔴 Connection closed:', event?.code, event?.reason);
      this.connectionState = 'disconnected';
      this.emit('disconnected');
    });

    this.client.on('disconnect', (event: any) => {
      console.log('[REALTIME] 🔴 Disconnected:', event);
      this.connectionState = 'disconnected';
      this.emit('disconnected');
    });

    // Conversation item events
    this.client.on('conversation.item.created', (event: any) => {
      console.log('[REALTIME] conversation.item.created:', event?.item?.type, event?.item?.role);
    });

    this.client.on('conversation.item.truncated', (event: any) => {
      console.log('[REALTIME] conversation.item.truncated');
    });

    // Conversation events - prevent duplicate listeners
    this.client.on('conversation.updated', (event: any) => {
      try {
        // Rate limit conversation updates to prevent spam
        if (this.lastConversationUpdate && Date.now() - this.lastConversationUpdate < 500) {
          return; // Skip if less than 500ms since last update
        }
        this.lastConversationUpdate = Date.now();

        const itemsCount = event?.conversation?.items?.length || 0;
        console.log('[REALTIME] conversation.updated - items:', itemsCount);

        // Only process if we have actual items
        if (itemsCount > 0) {
          if (event?.conversation?.items) {
            this.conversation = event.conversation.items;
            this.emit('conversation.updated', this.conversation);
          }
        }
      } catch (error) {
        console.error('Error handling conversation update:', error);
      }
    });

    // Audio events
    this.client.on('input_audio_buffer.speech_started', () => {
      console.log('Speech started');
      this.emit('speech.started');
    });

    this.client.on('input_audio_buffer.speech_stopped', () => {
      console.log('Speech stopped');
      this.emit('speech.stopped');
    });

    // Response events
    this.client.on('response.created', (event: any) => {
      console.log('[REALTIME] response.created:', event?.response?.id);
      this.emit('response.started', event);
    });

    this.client.on('response.done', (event: any) => {
      console.log('[REALTIME] response.done:', event?.response?.status);
      this.emit('response.completed', event);
    });

    this.client.on('response.output_item.added', (event: any) => {
      try {
        console.log('[REALTIME] response.output_item.added:', event?.item?.type, event?.item?.role);
        if (event?.item?.type === 'message') {
          this.emit('message.received', event.item);
        }
      } catch (error) {
        console.error('Error handling output item:', error);
      }
    });

    this.client.on('response.output_item.done', (event: any) => {
      console.log('[REALTIME] response.output_item.done:', event?.item?.type);
    });

    this.client.on('response.content_part.added', (event: any) => {
      console.log('[REALTIME] response.content_part.added:', event?.part?.type);
    });

    this.client.on('response.content_part.done', (event: any) => {
      console.log('[REALTIME] response.content_part.done:', event?.part?.type);
    });

    // Tool calls
    this.client.on('response.function_call_arguments.done', (event: any) => {
      this.handleToolCall(event);
    });

    // Session events (CRITICAL for debugging)
    this.client.on('session.created', (event: any) => {
      console.log('[REALTIME] Session created with modalities:', event.session?.modalities);
    });

    this.client.on('session.updated', (event: any) => {
      console.log('[REALTIME] Session updated with modalities:', event.session?.modalities);
    });

    // Audio output events
    this.client.on('response.audio.delta', (event: any) => {
      console.log('[REALTIME] 🔊 Audio delta received, size:', event.delta?.byteLength || 0);
      this.emit('audio.delta', event.delta);
    });

    this.client.on('response.audio_transcript.delta', (event: any) => {
      console.log('[REALTIME] 📝 Audio transcript delta:', event.delta);
      this.emit('transcript.delta', event.delta);
    });

    this.client.on('response.audio.done', (event: any) => {
      console.log('[REALTIME] 🔊 Audio response completed');
    });

    // Text output events
    this.client.on('response.text.delta', (event: any) => {
      console.log('[REALTIME] 📝 Text delta:', event.delta);
      this.emit('text.delta', event.delta);
    });

    this.client.on('response.text.done', (event: any) => {
      console.log('[REALTIME] 📝 Text completed:', event?.text);
      this.emit('text.done', event.text);
    });
  }

  // Handle tool/function calls
  private async handleToolCall(event: any): Promise<void> {
    const { call_id, name, arguments: args } = event;

    if (this.tools.has(name)) {
      try {
        const toolFunction = this.tools.get(name)!;
        const result = await toolFunction(JSON.parse(args));

        // Send tool result back to the conversation
        this.client.addConversationItem({
          type: 'function_call_output',
          call_id,
          output: JSON.stringify(result)
        });

        this.client.createResponse();
      } catch (error) {
        console.error(`Error executing tool ${name}:`, error);

        this.client.addConversationItem({
          type: 'function_call_output',
          call_id,
          output: JSON.stringify({
            error: 'Tool execution failed',
            message: 'Lo siento, hubo un error procesando tu solicitud. ¿Podrías intentarlo de nuevo?'
          })
        });

        this.client.createResponse();
      }
    }
  }

  // Connect to OpenAI Realtime API
  async connect(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.connectionState === 'connected') return;

    try {
      this.connectionState = 'connecting';
      this.emit('connecting');

      await this.client.connect();

      // Use a more reliable connection detection
      let connectionCheckAttempts = 0;
      const maxAttempts = 10;

      const checkConnection = () => {
        if (this.client.isConnected()) {
          this.connectionState = 'connected';
          this.emit('connected');
          console.log('OpenAI Realtime API connected successfully');
        } else if (connectionCheckAttempts < maxAttempts) {
          connectionCheckAttempts++;
          setTimeout(checkConnection, 500);
        } else {
          this.connectionState = 'error';
          const error = new Error('Connection timeout - could not establish connection to OpenAI Realtime API');
          this.emit('error', error);
          console.error('Connection timeout after', maxAttempts, 'attempts');
        }
      };

      // Start checking connection immediately
      checkConnection();

      // NOTE: Removed automatic initial greeting as it may cause disconnection issues

    } catch (error) {
      console.error('Connection failed:', error);
      this.connectionState = 'error';
      this.emit('error', error);
      throw error;
    }
  }

  // Disconnect from API
  disconnect(): void {
    if (this.client) {
      this.client.disconnect();
    }
    this.connectionState = 'disconnected';
    this.emit('disconnected');
  }

  // Send user message using alternative approach due to beta API issues
  sendUserMessage(content: string): void {
    console.log('[REALTIME] Attempting to send message:', content);
    console.log('[REALTIME] Connection state:', this.connectionState);
    console.log('[REALTIME] Client connected:', this.client?.isConnected?.());

    if (!this.client) {
      throw new Error('Realtime client not initialized');
    }

    if (this.connectionState !== 'connected') {
      throw new Error(`Not connected to Realtime API (state: ${this.connectionState})`);
    }

    if (!this.client.isConnected()) {
      console.error('[REALTIME] Client reports not connected, updating state');
      this.connectionState = 'disconnected';
      throw new Error('Realtime client is not connected');
    }

    try {
      // Try alternative approach - manual conversation item creation
      const conversationItem = {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: content
          }
        ]
      };

      console.log('[REALTIME] Creating conversation item manually...');

      // Send raw event instead of using sendUserMessageContent
      this.client.realtime.send('conversation.item.create', {
        item: conversationItem
      });

      // Then create response
      setTimeout(() => {
        console.log('[REALTIME] Creating response manually...');
        this.client.realtime.send('response.create', {});
      }, 100);

      console.log('[REALTIME] ✅ Manual message approach sent');

    } catch (error) {
      console.error('[REALTIME] ❌ Error with manual approach:', error);

      // Fallback to original method
      try {
        console.log('[REALTIME] Falling back to sendUserMessageContent...');
        this.client.sendUserMessageContent([
          {
            type: 'input_text',
            text: content
          }
        ]);
        console.log('[REALTIME] ✅ Fallback message sent');
      } catch (fallbackError) {
        console.error('[REALTIME] ❌ Fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  // Send audio data
  sendAudioData(audioData: ArrayBuffer): void {
    if (!this.client || this.connectionState !== 'connected') {
      throw new Error('Not connected to Realtime API');
    }

    this.client.appendInputAudio(audioData);
  }

  // Create response (trigger AI response)
  createResponse(): void {
    if (!this.client || this.connectionState !== 'connected') {
      throw new Error('Not connected to Realtime API');
    }

    this.client.createResponse();
  }

  // Cancel current response
  cancelResponse(): void {
    if (!this.client) return;
    this.client.cancelResponse();
  }

  // Add tool/function
  addTool(tool: RealtimeTool, handler: Function): void {
    this.tools.set(tool.name, handler);

    // Update session with new tool
    if (this.client) {
      const currentTools = this.config.tools || [];
      const updatedTools = [...currentTools, tool];
      this.client.updateSession({ tools: updatedTools });
    }
  }

  // Remove tool
  removeTool(toolName: string): void {
    this.tools.delete(toolName);

    if (this.client) {
      const currentTools = this.config.tools || [];
      const updatedTools = currentTools.filter(tool => tool.name !== toolName);
      this.client.updateSession({ tools: updatedTools });
    }
  }

  // Event system
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // Getters
  get state(): ConnectionState {
    return this.connectionState;
  }

  get isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  get conversationItems(): ConversationItem[] {
    return [...this.conversation];
  }

  get availableTools(): string[] {
    return Array.from(this.tools.keys());
  }
}

export default RealtimeService;