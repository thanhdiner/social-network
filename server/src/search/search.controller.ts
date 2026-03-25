import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type CurrentUserData,
} from '../common/decorators/current-user.decorator';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  async search(
    @Query('q') query: string,
    @Query('limit') limit: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.searchService.searchAll(query, user.userId, limitNum);
  }

  @Get('users')
  async searchUsers(
    @Query('q') query: string,
    @Query('limit') limit: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.searchService.searchUsers(query, user.userId, limitNum);
  }

  @Get('posts')
  async searchPosts(
    @Query('q') query: string,
    @Query('limit') limit: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.searchService.searchPosts(query, user.userId, limitNum);
  }

  @Get('reels')
  async searchReels(
    @Query('q') query: string,
    @Query('limit') limit: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.searchService.searchReels(query, limitNum);
  }

  @Get('popular')
  async getPopularSearches(@Query('limit') limit: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.searchService.getPopularSearches(limitNum);
  }
}
