import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { LifeEventsService } from './life-events.service';
import { CreateLifeEventDto } from './dto/create-life-event.dto';
import { UpdateLifeEventDto } from './dto/update-life-event.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type CurrentUserData,
} from '../common/decorators/current-user.decorator';

@Controller('life-events')
export class LifeEventsController {
  constructor(private readonly lifeEventsService: LifeEventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() createLifeEventDto: CreateLifeEventDto,
  ) {
    return this.lifeEventsService.create(user.userId, createLifeEventDto);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  findByUserId(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.lifeEventsService.findByUserId(userId, limitNum);
  }

  @Get('user/:userId/all')
  @UseGuards(JwtAuthGuard)
  findAll(@Param('userId') userId: string) {
    return this.lifeEventsService.findAll(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.lifeEventsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() updateLifeEventDto: UpdateLifeEventDto,
  ) {
    return this.lifeEventsService.update(id, user.userId, updateLifeEventDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.lifeEventsService.remove(id, user.userId);
  }
}
