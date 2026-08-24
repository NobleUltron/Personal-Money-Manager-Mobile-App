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
import { GoalsService } from './goals.service';
import { CreateGoalDto, DepositGoalDto, UpdateGoalDto } from './dto/goal.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Savings Goals')
@Controller('api/goals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GoalsController {
  constructor(private goalsService: GoalsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all savings goals with progress and stats' })
  async findAll(@CurrentUser('id') userId: bigint) {
    return this.goalsService.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new savings goal' })
  async create(
    @CurrentUser('id') userId: bigint,
    @Body() dto: CreateGoalDto,
  ) {
    return this.goalsService.create(userId, dto);
  }

  @Post(':id/deposit')
  @ApiOperation({ summary: 'Deposit funds into a savings goal' })
  async deposit(
    @CurrentUser('id') userId: bigint,
    @Param('id') id: string,
    @Body() dto: DepositGoalDto,
  ) {
    return this.goalsService.deposit(userId, id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update savings goal details' })
  async update(
    @CurrentUser('id') userId: bigint,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a savings goal' })
  async remove(@CurrentUser('id') userId: bigint, @Param('id') id: string) {
    return this.goalsService.remove(userId, id);
  }
}
