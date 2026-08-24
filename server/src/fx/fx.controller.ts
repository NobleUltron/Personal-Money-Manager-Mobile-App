import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { FxService, FxRatesResponse } from './fx.service';

@ApiTags('Exchange Rates (FX)')
@Controller('fx')
export class FxController {
  constructor(private readonly fxService: FxService) {}

  @Get('rates')
  @ApiOperation({ summary: 'Get real-time global FX market exchange rates' })
  @ApiQuery({ name: 'refresh', required: false, type: Boolean, description: 'Force pull from upstream FX providers' })
  @ApiResponse({ status: 200, description: 'Current exchange rates mapping with base currency USD' })
  async getRates(@Query('refresh') refresh?: string): Promise<FxRatesResponse> {
    const shouldRefresh = refresh === 'true' || refresh === '1';
    return this.fxService.fetchLatestRates(shouldRefresh);
  }

  @Get('convert')
  @ApiOperation({ summary: 'Convert amount between two currency codes using live mid-market rates' })
  @ApiQuery({ name: 'amount', required: true, type: Number, example: 100 })
  @ApiQuery({ name: 'from', required: true, type: String, example: 'USD' })
  @ApiQuery({ name: 'to', required: true, type: String, example: 'UGX' })
  convert(
    @Query('amount') amount: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const numAmount = parseFloat(amount) || 0;
    return this.fxService.convert(numAmount, from, to);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Trigger an immediate on-demand refresh of FX market data' })
  async forceRefresh(): Promise<FxRatesResponse> {
    return this.fxService.fetchLatestRates(true);
  }
}
