import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ChatService, type ConversationResponse } from './chat.service';

interface RequestWithUser extends Request {
  user: {
    userId: string;
  };
}

type UpdateCustomizationBody = Partial<{
  themeId: string;
  emoji: string;
  nicknameMe: string;
  nicknameThem: string;
}>;

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  getConversations(
    @Request() req: RequestWithUser,
  ): Promise<ConversationResponse[]> {
    this.logger.log(`GET /chat/conversations user=${req.user.userId}`);
    return this.chatService.getConversations(req.user.userId);
  }

  @Get('messages/:userId')
  getMessages(
    @Request() req: RequestWithUser,
    @Param('userId') userId: string,
  ) {
    this.logger.log(`GET /chat/messages/${userId} user=${req.user.userId}`);
    return this.chatService.getMessages(req.user.userId, userId);
  }

  @Get('customization/:userId')
  getCustomization(
    @Request() req: RequestWithUser,
    @Param('userId') userId: string,
  ) {
    this.logger.log(
      `GET /chat/customization/${userId} user=${req.user.userId}`,
    );
    return this.chatService.getConversationCustomization(
      req.user.userId,
      userId,
    );
  }

  @Put('customization/:userId')
  updateCustomization(
    @Request() req: RequestWithUser,
    @Param('userId') userId: string,
    @Body() body: UpdateCustomizationBody,
  ) {
    this.logger.log(
      `PUT /chat/customization/${userId} user=${req.user.userId}`,
    );
    return this.chatService.updateConversationCustomization(
      req.user.userId,
      userId,
      body,
    );
  }

  @Delete('customization/:userId')
  resetCustomization(
    @Request() req: RequestWithUser,
    @Param('userId') userId: string,
  ) {
    this.logger.log(
      `DELETE /chat/customization/${userId} user=${req.user.userId}`,
    );
    return this.chatService.resetConversationCustomization(
      req.user.userId,
      userId,
    );
  }

  @Post('messages')
  sendMessage(
    @Request() req: RequestWithUser,
    @Body()
    data: {
      receiverId: string;
      content: string;
      imageUrl?: string;
      videoUrl?: string;
      audioUrl?: string;
      replyToId?: string;
    },
  ) {
    this.logger.log(
      `POST /chat/messages from=${req.user.userId} to=${data.receiverId}`,
    );
    return this.chatService.sendMessage(
      req.user.userId,
      data.receiverId,
      data.content,
      data.imageUrl,
      data.videoUrl,
      data.audioUrl,
      data.replyToId,
    );
  }

  @Put('messages/:userId/read')
  markAsRead(@Request() req: RequestWithUser, @Param('userId') userId: string) {
    this.logger.log(
      `PUT /chat/messages/${userId}/read user=${req.user.userId}`,
    );
    return this.chatService.markAsRead(req.user.userId, userId);
  }

  @Delete('messages/:userId')
  deleteConversation(
    @Request() req: RequestWithUser,
    @Param('userId') userId: string,
  ) {
    this.logger.log(`DELETE /chat/messages/${userId} user=${req.user.userId}`);
    return this.chatService.deleteConversation(req.user.userId, userId);
  }

  @Post('messages/:messageId/react')
  addReaction(
    @Request() req: RequestWithUser,
    @Param('messageId') messageId: string,
    @Body() data: { emoji: string },
  ) {
    this.logger.log(
      `POST /chat/messages/${messageId}/react user=${req.user.userId} emoji=${data.emoji}`,
    );
    return this.chatService.addReaction(req.user.userId, messageId, data.emoji);
  }

  @Delete('messages/:messageId/react')
  removeReaction(
    @Request() req: RequestWithUser,
    @Param('messageId') messageId: string,
  ) {
    this.logger.log(
      `DELETE /chat/messages/${messageId}/react user=${req.user.userId}`,
    );
    return this.chatService.removeReaction(req.user.userId, messageId);
  }

  @Delete('messages/:messageId/delete')
  deleteMessage(
    @Request() req: RequestWithUser,
    @Param('messageId') messageId: string,
  ) {
    this.logger.log(
      `DELETE /chat/messages/${messageId}/delete user=${req.user.userId}`,
    );
    return this.chatService.deleteMessage(messageId, req.user.userId);
  }

  @Put('messages/:messageId/unsend')
  unsendMessage(
    @Request() req: RequestWithUser,
    @Param('messageId') messageId: string,
  ) {
    this.logger.log(
      `PUT /chat/messages/${messageId}/unsend user=${req.user.userId}`,
    );
    return this.chatService.unsendMessage(messageId, req.user.userId);
  }

  @Put('messages/:messageId/pin')
  pinMessage(
    @Request() req: RequestWithUser,
    @Param('messageId') messageId: string,
  ) {
    this.logger.log(
      `PUT /chat/messages/${messageId}/pin user=${req.user.userId}`,
    );
    return this.chatService.pinMessage(req.user.userId, messageId);
  }

  @Put('messages/:messageId/unpin')
  unpinMessage(
    @Request() req: RequestWithUser,
    @Param('messageId') messageId: string,
  ) {
    this.logger.log(
      `PUT /chat/messages/${messageId}/unpin user=${req.user.userId}`,
    );
    return this.chatService.unpinMessage(req.user.userId, messageId);
  }

  @Put('conversations/:userId/mute')
  muteConversation(
    @Request() req: RequestWithUser,
    @Param('userId') userId: string,
  ) {
    this.logger.log(
      `PUT /chat/conversations/${userId}/mute user=${req.user.userId}`,
    );
    return this.chatService.muteConversation(req.user.userId, userId);
  }

  @Delete('conversations/:userId/mute')
  unmuteConversation(
    @Request() req: RequestWithUser,
    @Param('userId') userId: string,
  ) {
    this.logger.log(
      `DELETE /chat/conversations/${userId}/mute user=${req.user.userId}`,
    );
    return this.chatService.unmuteConversation(req.user.userId, userId);
  }

  @Get('conversations/:userId/muted')
  checkIfMuted(
    @Request() req: RequestWithUser,
    @Param('userId') userId: string,
  ) {
    this.logger.log(
      `GET /chat/conversations/${userId}/muted user=${req.user.userId}`,
    );
    return this.chatService.checkIfMuted(req.user.userId, userId);
  }

  @Post('call-log')
  logCall(
    @Request() req: RequestWithUser,
    @Body()
    data: {
      receiverId: string;
      callType: 'voice' | 'video';
      callDuration: number;
      callStatus: 'completed' | 'missed' | 'rejected' | 'no-answer';
    },
  ) {
    this.logger.log(
      `POST /chat/call-log from=${req.user.userId} to=${data.receiverId} status=${data.callStatus} duration=${data.callDuration}`,
    );
    return this.chatService.logCall(
      req.user.userId,
      data.receiverId,
      data.callType,
      data.callDuration,
      data.callStatus,
    );
  }

  // Blocking APIs removed
}
