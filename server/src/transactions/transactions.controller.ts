import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import {
  CreateTransactionDto,
  QueryTransactionDto,
  UpdateTransactionDto,
} from './dto/transaction.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Transactions')
@Controller('api/transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of transactions with filters' })
  async findAll(
    @CurrentUser('id') userId: bigint,
    @Query() query: QueryTransactionDto,
  ) {
    return this.transactionsService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single transaction by ID' })
  async findOne(@CurrentUser('id') userId: bigint, @Param('id') id: string) {
    return this.transactionsService.findOne(userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new income or expense transaction' })
  async create(
    @CurrentUser('id') userId: bigint,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update existing transaction' })
  async update(
    @CurrentUser('id') userId: bigint,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transaction' })
  async remove(@CurrentUser('id') userId: bigint, @Param('id') id: string) {
    return this.transactionsService.remove(userId, id);
  }
}
