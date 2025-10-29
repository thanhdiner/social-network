import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateLifeEventDto } from './dto/create-life-event.dto';
import { UpdateLifeEventDto } from './dto/update-life-event.dto';

@Injectable()
export class LifeEventsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createLifeEventDto: CreateLifeEventDto) {
    return this.prisma.lifeEvent.create({
      data: {
        ...createLifeEventDto,
        userId,
        date: new Date(createLifeEventDto.date),
        endDate: createLifeEventDto.endDate
          ? new Date(createLifeEventDto.endDate)
          : null,
      },
    });
  }

  async findByUserId(userId: string, limit = 5) {
    return this.prisma.lifeEvent.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  async findAll(userId: string) {
    return this.prisma.lifeEvent.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.lifeEvent.findUnique({
      where: { id },
    });
  }

  async update(
    id: string,
    userId: string,
    updateLifeEventDto: UpdateLifeEventDto,
  ) {
    const event = await this.prisma.lifeEvent.findUnique({
      where: { id },
    });

    if (!event) {
      throw new Error('Life event not found');
    }

    if (event.userId !== userId) {
      throw new Error('Unauthorized');
    }

    return this.prisma.lifeEvent.update({
      where: { id },
      data: {
        ...updateLifeEventDto,
        date: updateLifeEventDto.date
          ? new Date(updateLifeEventDto.date)
          : undefined,
        endDate: updateLifeEventDto.endDate
          ? new Date(updateLifeEventDto.endDate)
          : undefined,
      },
    });
  }

  async remove(id: string, userId: string) {
    const event = await this.prisma.lifeEvent.findUnique({
      where: { id },
    });

    if (!event) {
      throw new Error('Life event not found');
    }

    if (event.userId !== userId) {
      throw new Error('Unauthorized');
    }

    return this.prisma.lifeEvent.delete({
      where: { id },
    });
  }
}
