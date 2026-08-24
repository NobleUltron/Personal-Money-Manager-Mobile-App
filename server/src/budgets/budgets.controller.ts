import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/budget.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Budgets')
@Controller('api/budgets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BudgetsController {
  constructor(private budgetsService: BudgetsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all budgets with monthly spending progress' })
  async findAll(@CurrentUser('id') userId: bigint) {
    return this.budgetsService.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update category budget' })
  async createOrUpdate(
    @CurrentUser('id') userId: bigint,
    @Body() dto: CreateBudgetDto,
  ) {
    return this.budgetsService.createOrUpdate(userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a budget' })
  async remove(@CurrentUser('id') userId: bigint, @Param('id') id: string) {
    return this.budgetsService.remove(userId, id);
  }
}
