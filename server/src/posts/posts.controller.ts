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
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.postsService.findAll(pageNum, limitNum);
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
          const isLiked = await this.postsService.checkIfUserLiked(
            post.id,
            currentUserId,
          );
          return { ...post, isLiked };
        }),
      );
      return { ...result, posts: postsWithLikes };
    }

    return result;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    const post = await this.postsService.findOne(id);
    if (!post) {
      return { error: 'Post not found' };
    }

    const isLiked = await this.postsService.checkIfUserLiked(id, user.userId);

    return {
      ...post,
      isLiked,
    };
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  toggleLike(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.postsService.toggleLike(id, user.userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() updatePostDto: CreatePostDto,
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
}
