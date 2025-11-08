import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GeminiService } from './gemini.service';

class CompletePostDto {
  @IsString()
  content: string;
}

class ImprovePostDto {
  @IsString()
  content: string;
}

class GenerateIdeasDto {
  @IsOptional()
  @IsString()
  topic?: string;
}

@Controller('gemini')
@UseGuards(JwtAuthGuard)
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async completePost(@Body() dto: CompletePostDto) {
    try {
      console.log('[Gemini] Completing post:', dto.content);
      const result = await this.geminiService.completePost(dto.content);
      console.log('[Gemini] Completed successfully');
      return { content: result };
    } catch (error) {
      console.error('[Gemini] Error completing post:', error);
      throw error;
    }
  }

  @Post('improve')
  @HttpCode(HttpStatus.OK)
  async improvePost(@Body() dto: ImprovePostDto) {
    try {
      console.log('[Gemini] Improving post:', dto.content);
      const result = await this.geminiService.improvePost(dto.content);
      console.log('[Gemini] Improved successfully');
      return { content: result };
    } catch (error) {
      console.error('[Gemini] Error improving post:', error);
      throw error;
    }
  }

  @Post('ideas')
  @HttpCode(HttpStatus.OK)
  async generateIdeas(@Body() dto: GenerateIdeasDto) {
    const result = await this.geminiService.generateIdeas(dto.topic);
    return { ideas: result };
  }
}
