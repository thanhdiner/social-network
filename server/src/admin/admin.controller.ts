import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminJwtGuard } from './admin.guard';

@Controller('admin')
@UseGuards(AdminJwtGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────────

  @Get('dashboard/stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/growth')
  getGrowthChart() {
    return this.adminService.getGrowthChart();
  }

  @Get('dashboard/activity')
  getRecentActivity() {
    return this.adminService.getRecentActivity();
  }

  // ─── Users ────────────────────────────────────────────────────────────────────

  @Get('users')
  getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.adminService.getUsers(page, limit, search, role);
  }

  @Get('users/:userId')
  getUserDetail(@Param('userId') userId: string) {
    return this.adminService.getUserDetail(userId);
  }

  @Put('users/:userId/role')
  updateUserRole(
    @Param('userId') userId: string,
    @Body('role') role: string,
  ) {
    return this.adminService.updateUserRole(userId, role);
  }

  @Put('users/:userId/toggle-active')
  toggleUserActive(@Param('userId') userId: string) {
    return this.adminService.toggleUserActive(userId);
  }

  @Delete('users/:userId')
  deleteUser(@Param('userId') userId: string) {
    return this.adminService.deleteUser(userId);
  }

  // ─── Posts ────────────────────────────────────────────────────────────────────

  @Get('posts')
  getPosts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getPosts(page, limit, search);
  }

  @Delete('posts/:postId')
  deletePost(@Param('postId') postId: string) {
    return this.adminService.deletePost(postId);
  }

  // ─── Reels ────────────────────────────────────────────────────────────────────

  @Get('reels')
  getReels(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getReels(page, limit);
  }

  @Delete('reels/:reelId')
  deleteReel(@Param('reelId') reelId: string) {
    return this.adminService.deleteReel(reelId);
  }
}
