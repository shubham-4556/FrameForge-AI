import type { WorkerEnv } from './env';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{ start: number; end: number; text: string }>;
}

export class OpenAiClient {
  constructor(private readonly env: WorkerEnv) {}

  private get apiKey(): string {
    if (!this.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    return this.env.OPENAI_API_KEY;
  }

  private url(path: string): string {
    return `${this.env.OPENAI_BASE_URL.replace(/\/+$/, '')}${path}`;
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const response = await fetch(this.url(path), {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        authorization: `Bearer ${this.apiKey}`,
      },
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`OpenAI ${path} failed with ${response.status}: ${detail.slice(0, 500)}`);
    }
    return response;
  }

  async chat(
    messages: ChatMessage[],
    options: { model?: string; json?: boolean; temperature?: number; maxTokens?: number } = {},
  ): Promise<string> {
    const response = await this.request('/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: options.model ?? this.env.OPENAI_TEXT_MODEL,
        messages,
        temperature: options.temperature ?? 0.7,
        ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
        ...(options.json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI returned an empty chat completion');
    return content;
  }

  async speech(text: string, options: { model?: string; voice?: string } = {}): Promise<Buffer> {
    const response = await this.request('/audio/speech', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: options.model ?? this.env.OPENAI_TTS_MODEL,
        voice: options.voice ?? this.env.OPENAI_TTS_VOICE,
        input: text,
        response_format: 'mp3',
      }),
    });
    return Buffer.from(await response.arrayBuffer());
  }

  async transcribe(
    audio: Buffer,
    filename: string,
    options: { model?: string; language?: string } = {},
  ): Promise<TranscriptionResult> {
    const form = new FormData();
    form.append('file', new Blob([audio]), filename);
    form.append('model', options.model ?? this.env.OPENAI_TRANSCRIBE_MODEL);
    form.append('response_format', 'verbose_json');
    if (options.language) form.append('language', options.language);

    const response = await this.request('/audio/transcriptions', {
      method: 'POST',
      body: form,
    });
    const payload = (await response.json()) as TranscriptionResult;
    if (!payload.text) throw new Error('OpenAI returned an empty transcription');
    return payload;
  }

  async image(prompt: string, options: { model?: string; size?: string } = {}): Promise<Buffer> {
    const response = await this.request('/images/generations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: options.model ?? this.env.OPENAI_IMAGE_MODEL,
        prompt,
        size: options.size ?? '1024x1024',
        n: 1,
      }),
    });
    const payload = (await response.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    const entry = payload.data?.[0];
    if (!entry) throw new Error('OpenAI returned no image');
    if (entry.b64_json) return Buffer.from(entry.b64_json, 'base64');
    if (entry.url) {
      const download = await fetch(entry.url);
      if (!download.ok) throw new Error(`Could not download generated image (${download.status})`);
      return Buffer.from(await download.arrayBuffer());
    }
    throw new Error('OpenAI image response had no data');
  }
}

export function imageSizeForAspect(aspectRatio: string | undefined): string {
  switch (aspectRatio) {
    case '9:16':
      return '1024x1536';
    case '1:1':
      return '1024x1024';
    case '4:5':
      return '1024x1536';
    case '21:9':
    case '16:9':
      return '1536x1024';
    default:
      return '1024x1024';
  }
}
