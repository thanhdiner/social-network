import { Module } from '@nestjs/common';
import { LifeEventsService } from './life-events.service';
import { LifeEventsController } from './life-events.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LifeEventsController],
  providers: [LifeEventsService],
})
export class LifeEventsModule {}
