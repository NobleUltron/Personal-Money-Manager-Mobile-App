import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/transfer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Transfers')
@Controller('api/transfers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransfersController {
  constructor(private transfersService: TransfersService) {}

  @Post()
  @ApiOperation({ summary: 'Transfer money atomically between two user accounts' })
  async transfer(
    @CurrentUser('id') userId: bigint,
    @Body() dto: CreateTransferDto,
  ) {
    return this.transfersService.transfer(userId, dto);
  }
}
