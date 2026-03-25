import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private connected = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const tls = this.configService.get<string>('REDIS_TLS') === 'true';

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      lazyConnect: true,
      tls: tls ? {} : undefined,
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.logger.log('Redis connected');
    });

    this.client.on('error', (err) => {
      if (this.connected) {
        this.logger.warn(`Redis error: ${err.message}`);
      }
    });

    // Attempt connection but don't throw if Redis is unavailable
    this.client.connect().catch((err) => {
      this.logger.warn(`Redis unavailable – falling back to in-memory: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  isConnected(): boolean {
    return this.client.status === 'ready';
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected()) return;
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected()) return null;
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected()) return;
    await this.client.del(key);
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.isConnected()) return [];
    return this.client.keys(pattern);
  }
}
