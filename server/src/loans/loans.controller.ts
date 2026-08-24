import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { CreateLoanDto, RepayLoanDto, UpdateLoanDto } from './dto/loan.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Loans')
@Controller('api/loans')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LoansController {
  constructor(private loansService: LoansService) {}

  @Get()
  @ApiOperation({ summary: 'Get all lent and borrowed loans with summary' })
  async findAll(@CurrentUser('id') userId: bigint) {
    return this.loansService.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new loan record' })
  async create(
    @CurrentUser('id') userId: bigint,
    @Body() dto: CreateLoanDto,
  ) {
    return this.loansService.create(userId, dto);
  }

  @Post(':id/repay')
  @ApiOperation({ summary: 'Record repayment towards loan' })
  async repay(
    @CurrentUser('id') userId: bigint,
    @Param('id') id: string,
    @Body() dto: RepayLoanDto,
  ) {
    return this.loansService.repay(userId, id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update loan details' })
  async update(
    @CurrentUser('id') userId: bigint,
    @Param('id') id: string,
    @Body() dto: UpdateLoanDto,
  ) {
    return this.loansService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete loan record' })
  async remove(@CurrentUser('id') userId: bigint, @Param('id') id: string) {
    return this.loansService.remove(userId, id);
  }
}
