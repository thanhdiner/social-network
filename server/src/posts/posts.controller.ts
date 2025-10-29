import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type CurrentUserData,
} from '../common/decorators/current-user.decorator';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() createPostDto: CreatePostDto,
  ) {
    return this.postsService.create(user.userId, createPostDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const result = await this.postsService.findAll(
      pageNum,
      limitNum,
      user.userId,
    );

    // Add reaction info for each post
    const postsWithReactions = await Promise.all(
      result.posts.map(async (post) => {
        const reactionInfo = await this.postsService.checkIfUserLiked(
          post.id,
          user.userId,
        );
        const isSaved = await this.postsService.checkIfPostSaved(
          post.id,
          user.userId,
        );
        return {
          ...post,
          isLiked: reactionInfo.liked,
          reactionType: reactionInfo.type,
          isSaved,
        };
      }),
    );

    return { ...result, posts: postsWithReactions };
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async findByUserId(
    @Param('userId') userId: string,
    @Query('currentUserId') currentUserId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const result = await this.postsService.findByUserId(
      userId,
      pageNum,
      limitNum,
    );

    // Add isLiked for each post if currentUserId is provided
    if (currentUserId) {
      const postsWithLikes = await Promise.all(
        result.posts.map(async (post) => {
          const reactionInfo = await this.postsService.checkIfUserLiked(
            post.id,
            currentUserId,
          );
          const isSaved = await this.postsService.checkIfPostSaved(
            post.id,
            currentUserId,
          );
          return {
            ...post,
            isLiked: reactionInfo.liked,
            reactionType: reactionInfo.type,
            isSaved,
          };
        }),
      );
      return { ...result, posts: postsWithLikes };
    }

    return result;
  }

  @Get('saved')
  @UseGuards(JwtAuthGuard)
  getSavedPosts(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.postsService.getSavedPosts(
      user.userId,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    const post = await this.postsService.findOne(id);
    if (!post) {
      return { error: 'Post not found' };
    }

    const reactionInfo = await this.postsService.checkIfUserLiked(
      id,
      user.userId,
    );
    const isSaved = await this.postsService.checkIfPostSaved(id, user.userId);

    return {
      ...post,
      isLiked: reactionInfo.liked,
      reactionType: reactionInfo.type,
      isSaved,
    };
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  toggleLike(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body('type') type?: string,
  ) {
    return this.postsService.toggleLike(id, user.userId, type);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.postsService.update(id, user.userId, updatePostDto);
  }

  @Get('user/:userId/photos')
  @UseGuards(JwtAuthGuard)
  getUserPhotos(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 9;
    return this.postsService.getUserPhotos(userId, pageNum, limitNum);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.postsService.remove(id, user.userId);
  }

  @Post(':id/share')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  sharePost(
    @Param('id') postId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() body: { content?: string },
  ) {
    return this.postsService.sharePost(postId, user.userId, body.content);
  }

  @Post(':id/save')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  toggleSavePost(
    @Param('id') postId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.postsService.toggleSavePost(postId, user.userId);
  }
}
