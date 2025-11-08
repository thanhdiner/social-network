import { Injectable } from '@nestjs/common';
import {
  GenerateContentResult,
  GenerativeModel,
  GoogleGenerativeAI,
} from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: GenerativeModel;

  constructor() {
    // Use environment variable for API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Use Gemini 1.5 Flash model (fast and stable)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
  }

  /**
   * Execute a prompt against Gemini and return plain text.
   */
  private async generateText(prompt: string): Promise<string> {
    // Small helper to safely stringify objects (skip functions)
    const safeStringify = (obj: any) => {
      try {
        return JSON.stringify(
          obj,
          (k, v) => (typeof v === 'function' ? `[Function:${k}]` : v),
          2,
        );
      } catch {
        return String(obj);
      }
    };

    console.log(
      '[Gemini] Prompt (truncated 1000 chars):',
      (prompt || '').toString().slice(0, 1000),
    );

    try {
      // The SDK accepts either a plain string/array or an object with `contents`.
      // Pass the prompt string directly to avoid format errors like "request is not iterable".
      console.log(
        '[Gemini] Request preview (first 1000 chars):',
        (prompt || '').slice(0, 1000),
      );
      const result: GenerateContentResult =
        await this.model.generateContent(prompt);
      // Log a preview of the raw result for debugging
      console.log(
        '[Gemini] Raw result preview:',
        safeStringify(result).slice(0, 2000),
      );

      const text = result?.response?.text?.()?.trim?.();
      if (!text) {
        console.error(
          '[Gemini] Empty text in response:',
          safeStringify(result),
        );
        throw new Error('Empty response from Gemini');
      }

      console.log(
        '[Gemini] Extracted text (truncated 1000 chars):',
        text.slice(0, 1000),
      );
      return text;
    } catch (error) {
      // Log detailed error if available in a type-safe way
      try {
        if (error && typeof error === 'object' && 'response' in error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          console.error(
            '[Gemini] API responded with error body:',
            safeStringify((error as any).response),
          );
        }
      } catch (e) {
        // ignore
      }

      const errMsg =
        error && typeof error === 'object' && 'message' in error
          ? (error as any).message
          : String(error);
      console.error(
        '[Gemini] Exception while calling model.generateContent:',
        errMsg,
      );
      throw error;
    }
  }

  // ===== Complete a post naturally =====
  async completePost(content: string): Promise<string> {
    try {
      const prompt = [
        'You are an AI assistant that helps users complete social media posts.',
        'User wrote: "' + content + '"',
        '',
        'Please complete this post naturally in Vietnamese, keeping the tone and meaning consistent.',
        'Make it slightly more engaging (2-4 sentences).',
        'Return only the completed post, no explanations.',
      ].join('\n');

      return await this.generateText(prompt);
    } catch (error) {
      console.error('Error completing post:', error);
      const reason = error instanceof Error ? error.message : 'Unknown error';
      throw new Error('Failed to complete post: ' + reason);
    }
  }

  // ===== Improve post quality =====
  async improvePost(content: string): Promise<string> {
    try {
      const prompt = [
        'You are an AI assistant that improves Vietnamese social media posts.',
        'User wrote: "' + content + '"',
        '',
        'Improve the post by:',
        '- Fixing grammar or spelling if needed',
        '- Making the text smoother and more natural',
        '- Adding emotional appeal while keeping the original tone and meaning',
        'Return only the improved post, no explanations.',
      ].join('\n');

      return await this.generateText(prompt);
    } catch (error) {
      console.error('Error improving post:', error);
      const reason = error instanceof Error ? error.message : 'Unknown error';
      throw new Error('Failed to improve post: ' + reason);
    }
  }

  // ===== Generate post ideas =====
  async generateIdeas(topic?: string): Promise<string[]> {
    try {
      const prompt = topic
        ? [
            'Suggest 5 engaging Vietnamese social media post ideas about "' +
              topic +
              '".',
            'Each idea should be one short line without numbering or explanations.',
          ].join('\n')
        : [
            'Suggest 5 engaging Vietnamese social media post ideas.',
            'Each idea should be one short line without numbering or explanations.',
          ].join('\n');

      const text = await this.generateText(prompt);

      return text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    } catch (error) {
      console.error('Error generating ideas:', error);
      const reason = error instanceof Error ? error.message : 'Unknown error';
      throw new Error('Failed to generate ideas: ' + reason);
    }
  }
}
