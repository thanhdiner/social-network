import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ReelsService } from './reels.service';
import { CreateReelDto } from './dto/create-reel.dto';
import { UpdateReelDto } from './dto/update-reel.dto';
import { CreateReelCommentDto } from './dto/create-reel-comment.dto';
import { ShareReelDto } from './dto/share-reel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reels')
@UseGuards(JwtAuthGuard)
export class ReelsController {
  constructor(private readonly reelsService: ReelsService) {}

  @Post()
  create(@Request() req, @Body() createReelDto: CreateReelDto) {
    return this.reelsService.create(req.user.userId, createReelDto);
  }

  @Get()
  findAll(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.reelsService.findAll(req.user.userId, pageNum, limitNum);
  }

  @Get('user/:userId')
  findByUser(
    @Request() req,
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.reelsService.findByUser(userId, req.user.userId, pageNum, limitNum);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.reelsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateReelDto: UpdateReelDto) {
    return this.reelsService.update(id, req.user.userId, updateReelDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.reelsService.remove(id, req.user.userId);
  }

  @Post(':id/like')
  like(@Request() req, @Param('id') id: string) {
    return this.reelsService.like(id, req.user.userId);
  }

  @Get(':id/comments')
  getComments(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.reelsService.getComments(id, pageNum, limitNum);
  }

  @Get('comments/:commentId/replies')
  getCommentReplies(
    @Param('commentId') commentId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.reelsService.getCommentReplies(commentId, pageNum, limitNum);
  }

  @Post(':id/comments')
  createComment(
    @Request() req,
    @Param('id') id: string,
    @Body() createCommentDto: CreateReelCommentDto,
  ) {
    return this.reelsService.createComment(id, req.user.userId, createCommentDto);
  }

  @Delete('comments/:commentId')
  deleteComment(@Request() req, @Param('commentId') commentId: string) {
    return this.reelsService.deleteComment(commentId, req.user.userId);
  }

  @Post(':id/share')
  share(@Request() req, @Param('id') id: string, @Body() shareReelDto: ShareReelDto) {
    return this.reelsService.share(id, req.user.userId, shareReelDto);
  }

  @Post(':id/view')
  view(@Request() req, @Param('id') id: string) {
    return this.reelsService.view(id, req.user.userId);
  }
}
