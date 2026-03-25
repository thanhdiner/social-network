import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Request,
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

  @Post('dashboard/announcement')
  createAnnouncement(
    @Request()
    req: { admin: { adminId: string; username: string; name: string } },
    @Body()
    body: {
      title?: string;
      content: string;
      audience?: 'all' | 'active';
    },
  ) {
    return this.adminService.createAnnouncement({
      adminId: req.admin.adminId,
      adminName: req.admin.name,
      title: body.title,
      content: body.content,
      audience: body.audience,
    });
  }

  // ─── Account ───────────────────────────────────────────────────────────────

  @Get('account/profile')
  getAccountProfile(
    @Request()
    req: {
      admin: { adminId: string; username: string; name: string; sessionId?: string };
    },
  ) {
    return this.adminService.getAccountProfile(
      req.admin.adminId,
      req.admin.sessionId,
    );
  }

  @Put('account/profile')
  updateAccountProfile(
    @Request()
    req: {
      admin: { adminId: string; username: string; name: string; sessionId?: string };
    },
    @Body()
    body: {
      name?: string;
      email?: string;
      avatar?: string | null;
    },
  ) {
    return this.adminService.updateAccountProfile(req.admin.adminId, {
      name: body.name,
      email: body.email,
      avatar: body.avatar,
    });
  }

  @Put('account/password')
  updateAccountPassword(
    @Request()
    req: {
      admin: { adminId: string; username: string; name: string; sessionId?: string };
    },
    @Body()
    body: {
      currentPassword: string;
      newPassword: string;
      confirmPassword?: string;
    },
  ) {
    return this.adminService.updateAccountPassword(req.admin.adminId, {
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      confirmPassword: body.confirmPassword,
    });
  }

  @Put('account/security')
  updateAccountSecurity(
    @Request()
    req: {
      admin: { adminId: string; username: string; name: string; sessionId?: string };
    },
    @Body()
    body: {
      twoFactorEnabled?: boolean;
      loginAlertsEnabled?: boolean;
    },
  ) {
    return this.adminService.updateAccountSecurity(req.admin.adminId, {
      twoFactorEnabled: body.twoFactorEnabled,
      loginAlertsEnabled: body.loginAlertsEnabled,
    });
  }

  @Get('account/sessions')
  getAccountSessions(
    @Request()
    req: {
      admin: { adminId: string; username: string; name: string; sessionId?: string };
    },
  ) {
    return this.adminService.getAccountSessions(
      req.admin.adminId,
      req.admin.sessionId,
    );
  }

  @Delete('account/sessions/:sessionId')
  revokeAccountSession(
    @Request()
    req: {
      admin: { adminId: string; username: string; name: string; sessionId?: string };
    },
    @Param('sessionId') sessionId: string,
  ) {
    return this.adminService.revokeAccountSession(
      req.admin.adminId,
      sessionId,
      req.admin.sessionId,
    );
  }

  // ─── Users ────────────────────────────────────────────────────────────────────

  @Post('users')
  createUser(
    @Request()
    req: { admin: { adminId: string; username: string; name: string } },
    @Body()
    body: {
      name?: string;
      username: string;
      email: string;
      password: string;
      role?: 'admin' | 'user';
      isActive?: boolean;
      avatar?: string;
    },
  ) {
    return this.adminService.createUser({
      name: body.name,
      username: body.username,
      email: body.email,
      password: body.password,
      role: body.role,
      isActive: body.isActive,
      avatar: body.avatar,
    });
  }

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

  @Put('users/:userId')
  updateUser(
    @Param('userId') userId: string,
    @Body()
    body: {
      name?: string;
      username?: string;
      email?: string;
      bio?: string;
      avatar?: string;
    },
  ) {
    return this.adminService.updateUser(userId, {
      name: body.name,
      username: body.username,
      email: body.email,
      bio: body.bio,
      avatar: body.avatar,
    });
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
    @Query('media') media?: string,
  ) {
    return this.adminService.getPosts(page, limit, search, media);
  }

  @Get('posts/:postId')
  getPostDetail(@Param('postId') postId: string) {
    return this.adminService.getPostDetail(postId);
  }

  @Post('posts')
  createPost(
    @Body()
    body: {
      userId: string;
      content?: string;
      imageUrl?: string;
      videoUrl?: string;
    },
  ) {
    return this.adminService.createPost({
      userId: body.userId,
      content: body.content,
      imageUrl: body.imageUrl,
      videoUrl: body.videoUrl,
    });
  }

  @Put('posts/:postId')
  updatePost(
    @Param('postId') postId: string,
    @Body()
    body: {
      content?: string;
      imageUrl?: string | null;
      videoUrl?: string | null;
    },
  ) {
    return this.adminService.updatePost(postId, {
      content: body.content,
      imageUrl: body.imageUrl,
      videoUrl: body.videoUrl,
    });
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
    @Query('search') search?: string,
  ) {
    return this.adminService.getReels(page, limit, search);
  }

  @Delete('reels/:reelId')
  deleteReel(@Param('reelId') reelId: string) {
    return this.adminService.deleteReel(reelId);
  }

  // ─── Comments ─────────────────────────────────────────────────────────────────

  @Get('comments/banned-keywords')
  getCommentBannedKeywords() {
    return this.adminService.getCommentBannedKeywords();
  }

  @Post('comments/banned-keywords')
  createCommentBannedKeyword(@Body('keyword') keyword: string) {
    return this.adminService.createCommentBannedKeyword(keyword);
  }

  @Delete('comments/banned-keywords/:keywordId')
  deleteCommentBannedKeyword(@Param('keywordId') keywordId: string) {
    return this.adminService.deleteCommentBannedKeyword(keywordId);
  }

  @Get('comments')
  getComments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('flaggedOnly') flaggedOnly?: string,
  ) {
    return this.adminService.getComments(page, limit, search, flaggedOnly === 'true');
  }

  @Delete('comments/:commentId')
  deleteComment(@Param('commentId') commentId: string) {
    return this.adminService.deleteComment(commentId);
  }
}
