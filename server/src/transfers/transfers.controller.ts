import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TransfersService } from './transfers.service';
import { CreateTransferDto, P2PTransferDto } from './dto/transfer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Transfers')
@Controller('api/transfers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransfersController {
  constructor(private transfersService: TransfersService) {}

  @Get('lookup')
  @ApiOperation({ summary: 'Search registered users by username or email for P2P transfer' })
  @ApiQuery({ name: 'query', required: true, description: 'Username or email substring to search' })
  async lookupUser(
    @CurrentUser('id') userId: bigint,
    @Query('query') query: string,
  ) {
    return this.transfersService.lookupUser(query, userId);
  }

  @Post('p2p')
  @ApiOperation({ summary: 'Atomically transfer funds to another registered user' })
  async transferToUser(
    @CurrentUser('id') userId: bigint,
    @Body() dto: P2PTransferDto,
  ) {
    return this.transfersService.transferToUser(userId, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Transfer money atomically between own user accounts' })
  async transfer(
    @CurrentUser('id') userId: bigint,
    @Body() dto: CreateTransferDto,
  ) {
    return this.transfersService.transfer(userId, dto);
  }
}
