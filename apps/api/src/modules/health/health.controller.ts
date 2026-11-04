import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  @ApiOperation({ summary: 'API System and Database Health Check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    const isDbConnected = this.connection.readyState === 1;
    return {
      status: isDbConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: isDbConnected ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    };
  }
}

