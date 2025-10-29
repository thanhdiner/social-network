import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  UseGuards,
  Param,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type CurrentUserData,
} from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChatGateway } from '../chat/chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private chatGateway: ChatGateway,
    private notificationsService: NotificationsService,
  ) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: CurrentUserData) {
    const profile = await this.usersService.findById(user.userId);
    if (!profile) {
      return { error: 'User not found' };
    }

    // Get user stats
    const stats = await this.usersService.getUserStats(profile.id);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = profile;
    return {
      ...userWithoutPassword,
      stats,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: CurrentUserData) {
    return {
      userId: user.userId,
      email: user.email,
    };
  }

  @Get('suggestions')
  @UseGuards(JwtAuthGuard)
  getSuggestedUsers(@CurrentUser() user: CurrentUserData) {
    return this.usersService.getSuggestedUsers(user.userId);
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  getActiveUsers(@CurrentUser() currentUser: CurrentUserData) {
    const onlineUserIds = this.chatGateway.getOnlineUserIds();
    // Get users that current user is following and are online
    return this.usersService.getActiveFollowingUsers(
      currentUser.userId,
      onlineUserIds,
    );
  }

  @Get(':userId/follow-status')
  @UseGuards(JwtAuthGuard)
  async getFollowStatus(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('userId') userId: string,
  ) {
    const isFollowing = await this.usersService.checkFollowStatus(
      currentUser.userId,
      userId,
    );
    const followsMe = await this.usersService.checkFollowStatus(
      userId,
      currentUser.userId,
    );
    return { isFollowing, followsMe };
  }

  @Get(':userId/followers')
  @UseGuards(JwtAuthGuard)
  async getFollowers(@Param('userId') userId: string) {
    return this.usersService.getFollowers(userId);
  }

  @Get(':userId/following')
  @UseGuards(JwtAuthGuard)
  async getFollowing(@Param('userId') userId: string) {
    return this.usersService.getFollowing(userId);
  }

  @Get(':username')
  @UseGuards(JwtAuthGuard)
  async getUserByUsername(@Param('username') username: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Get user stats
    const stats = await this.usersService.getUserStats(user.id);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      stats,
    };
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const updatedUser = await this.usersService.update(
      currentUser.userId,
      updateProfileDto,
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(
      currentUser.userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
    return { message: 'Đổi mật khẩu thành công' };
  }

  @Post(':userId/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async followUser(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('userId') userId: string,
  ) {
    await this.usersService.followUser(currentUser.userId, userId);

    // Get follower data for notification
    const follower = await this.usersService.findById(currentUser.userId);
    if (follower) {
      // Create notification in database
      await this.notificationsService.create({
        type: 'follow',
        content: `${follower.name} started following you`,
        userId: userId,
        actorId: follower.id,
        actorName: follower.name,
        actorUsername: follower.username,
        actorAvatar: follower.avatar || undefined,
      });

      // Notify via Socket.IO
      this.chatGateway.notifyFollow(currentUser.userId, userId, {
        id: follower.id,
        name: follower.name,
        username: follower.username ?? '',
        avatar: follower.avatar,
      });
    }

    return { message: 'Followed successfully' };
  }

  @Delete(':userId/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unfollowUser(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('userId') userId: string,
  ) {
    await this.usersService.unfollowUser(currentUser.userId, userId);

    // No notification for unfollow
    // Notify via Socket.IO
    this.chatGateway.notifyUnfollow(currentUser.userId, userId);

    return { message: 'Unfollowed successfully' };
  }
}
