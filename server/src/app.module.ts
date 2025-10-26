import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [AuthModule, UsersModule, PostsModule, ChatModule, NotificationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
