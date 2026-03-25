import { Controller, Get, Post, Delete, Param, Query, UseGuards, Req, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  // GET /friends/status/:userId — friendship status with a user
  @Get('status/:userId')
  getStatus(@Req() req, @Param('userId') targetUserId: string) {
    return this.friendsService.getFriendshipStatus(req.user.userId, targetUserId);
  }

  // GET /friends/pending-count — số lời mời chưa đọc
  @Get('pending-count')
  getPendingCount(@Req() req) {
    return this.friendsService.getPendingCount(req.user.userId);
  }

  // GET /friends/requests/received — lời mời đã nhận
  @Get('requests/received')
  getReceived(
    @Req() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.friendsService.getReceivedRequests(req.user.userId, page, limit);
  }

  // GET /friends/requests/sent — lời mời đã gửi
  @Get('requests/sent')
  getSent(@Req() req) {
    return this.friendsService.getSentRequests(req.user.userId);
  }

  // GET /friends/suggestions — gợi ý kết bạn
  @Get('suggestions')
  getSuggestions(
    @Req() req,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.friendsService.getSuggestions(req.user.userId, limit);
  }

  // GET /friends — danh sách bạn bè
  @Get()
  getFriends(
    @Req() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.friendsService.getFriends(req.user.userId, page, limit);
  }

  // GET /friends/user/:userId — danh sách bạn bè của user khác
  @Get('user/:userId')
  getUserFriends(
    @Param('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.friendsService.getFriends(userId, page, limit);
  }

  // POST /friends/request/:userId — gửi lời mời
  @Post('request/:userId')
  sendRequest(@Req() req, @Param('userId') receiverId: string) {
    return this.friendsService.sendRequest(req.user.userId, receiverId);
  }

  // DELETE /friends/request/:userId — huỷ lời mời đã gửi
  @Delete('request/:userId')
  cancelRequest(@Req() req, @Param('userId') receiverId: string) {
    return this.friendsService.cancelRequest(req.user.userId, receiverId);
  }

  // POST /friends/accept/:requestId — chấp nhận
  @Post('accept/:requestId')
  acceptRequest(@Req() req, @Param('requestId') requestId: string) {
    return this.friendsService.acceptRequest(requestId, req.user.userId);
  }

  // POST /friends/reject/:requestId — từ chối
  @Post('reject/:requestId')
  rejectRequest(@Req() req, @Param('requestId') requestId: string) {
    return this.friendsService.rejectRequest(requestId, req.user.userId);
  }

  // DELETE /friends/:userId — huỷ kết bạn
  @Delete(':userId')
  unfriend(@Req() req, @Param('userId') targetUserId: string) {
    return this.friendsService.unfriend(req.user.userId, targetUserId);
  }
}
