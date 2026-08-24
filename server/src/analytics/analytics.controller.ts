import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Analytics & Dashboard')
@Controller('api/analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get unified dashboard summary metrics and lists' })
  async getDashboard(@CurrentUser('id') userId: bigint) {
    return this.analyticsService.getDashboard(userId);
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get comprehensive financial analytics, trends, and charts' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getAnalytics(
    @CurrentUser('id') userId: bigint,
    @Query('days') days?: string
  ) {
    const daysNum = days ? parseInt(days, 10) || 30 : 30;
    return this.analyticsService.getAnalytics(userId, daysNum);
  }
}
