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
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto/subscription.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Subscriptions')
@Controller('api/subscriptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of recurring subscriptions sorted by due date' })
  async findAll(@CurrentUser('id') userId: bigint) {
    return this.subscriptionsService.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new recurring subscription' })
  async create(
    @CurrentUser('id') userId: bigint,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update recurring subscription' })
  async update(
    @CurrentUser('id') userId: bigint,
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel/delete a subscription' })
  async remove(@CurrentUser('id') userId: bigint, @Param('id') id: string) {
    return this.subscriptionsService.remove(userId, id);
  }
}
