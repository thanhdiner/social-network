import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('stories')
@UseGuards(JwtAuthGuard)
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  create(@Request() req, @Body() createStoryDto: CreateStoryDto) {
    return this.storiesService.create(req.user.userId, createStoryDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.storiesService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.storiesService.findOne(id, req.user.userId);
  }

  @Post(':id/view')
  addView(@Param('id') id: string, @Request() req) {
    return this.storiesService.addView(id, req.user.userId);
  }

  @Get('user/:username')
  getUserStories(@Param('username') username: string, @Request() req) {
    return this.storiesService.getUserStories(username, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.storiesService.remove(id, req.user.userId);
  }
}
