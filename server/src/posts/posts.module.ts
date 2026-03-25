import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatModule } from '../chat/chat.module';
import { ReelsModule } from '../reels/reels.module';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [PrismaModule, NotificationsModule, ChatModule, ReelsModule, RedisModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}

