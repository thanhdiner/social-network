import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateStoryDto } from './dto/create-story.dto';

@Injectable()
export class StoriesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createStoryDto: CreateStoryDto) {
    // Story expires after 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return this.prisma.story.create({
      data: {
        userId,
        imageUrl: createStoryDto.imageUrl,
        videoUrl: createStoryDto.videoUrl,
        expiresAt,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            views: true,
          },
        },
      },
    });
  }

  async findAll(userId: string) {
    const now = new Date();

    // Get stories from users that current user follows (including their own)
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);
    const userIds = [userId, ...followingIds];

    // Get active stories (not expired) grouped by user
    const stories = await this.prisma.story.findMany({
      where: {
        userId: { in: userIds },
        expiresAt: { gt: now },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        views: {
          where: { userId },
          select: { id: true },
        },
        _count: {
          select: {
            views: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Define type for grouped stories
    type GroupedStory = {
      userId: string;
      user: {
        id: string;
        name: string;
        username: string;
        avatar: string | null;
      };
      hasUnviewed: boolean;
      stories: typeof stories;
    };

    // Group stories by user and mark if viewed by current user
    const groupedStories = stories.reduce<GroupedStory[]>((acc, story) => {
      const existingUser = acc.find((item) => item.userId === story.userId);
      const hasViewed = story.views.length > 0;

      if (existingUser) {
        existingUser.stories.push(story);
        if (!hasViewed) {
          existingUser.hasUnviewed = true;
        }
      } else {
        acc.push({
          userId: story.userId,
          user: story.user,
          hasUnviewed: !hasViewed,
          stories: [story],
        });
      }

      return acc;
    }, []);

    // Sort: users with unviewed stories first, then by most recent story
    return groupedStories.sort((a, b) => {
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return (
        new Date(b.stories[0].createdAt).getTime() -
        new Date(a.stories[0].createdAt).getTime()
      );
    });
  }

  async findOne(id: string, userId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        views: true,
        _count: {
          select: {
            views: true,
          },
        },
      },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    // Check if story has expired
    if (new Date(story.expiresAt) < new Date()) {
      throw new NotFoundException('Story has expired');
    }

    return story;
  }

  async addView(storyId: string, userId: string) {
    // Check if user already viewed this story
    const existingView = await this.prisma.storyView.findUnique({
      where: {
        storyId_userId: {
          storyId,
          userId,
        },
      },
    });

    if (existingView) {
      return existingView;
    }

    // Add view
    return this.prisma.storyView.create({
      data: {
        storyId,
        userId,
      },
    });
  }

  async getUserStories(username: string, currentUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();

    const stories = await this.prisma.story.findMany({
      where: {
        userId: user.id,
        expiresAt: { gt: now },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        views: {
          where: { userId: currentUserId },
          select: { id: true },
        },
        _count: {
          select: {
            views: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return stories;
  }

  async remove(id: string, userId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.userId !== userId) {
      throw new ForbiddenException('You can only delete your own stories');
    }

    await this.prisma.story.delete({
      where: { id },
    });

    return { message: 'Story deleted successfully' };
  }

  // Cleanup expired stories (can be called by a cron job)
  async cleanupExpiredStories() {
    const now = new Date();

    const result = await this.prisma.story.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });

    return { deleted: result.count };
  }
}
