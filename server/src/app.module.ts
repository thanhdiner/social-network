import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UploadModule } from './upload/upload.module';
import { LifeEventsModule } from './life-events/life-events.module';
import { CommentsModule } from './comments/comments.module';
import { StoriesModule } from './stories/stories.module';
import { SearchModule } from './search/search.module';
import { ReelsModule } from './reels/reels.module';
import { GeminiModule } from './gemini/gemini.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PostsModule,
    ChatModule,
    NotificationsModule,
    UploadModule,
    LifeEventsModule,
    CommentsModule,
    StoriesModule,
    SearchModule,
    ReelsModule,
    GeminiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
