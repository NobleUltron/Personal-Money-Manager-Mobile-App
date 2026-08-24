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
import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Accounts')
@Controller('api/accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountsController {
  constructor(private accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all user accounts with calculated balances' })
  async findAll(@CurrentUser('id') userId: bigint) {
    return this.accountsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single account details' })
  async findOne(@CurrentUser('id') userId: bigint, @Param('id') id: string) {
    return this.accountsService.findOne(userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new account/wallet' })
  async create(
    @CurrentUser('id') userId: bigint,
    @Body() dto: CreateAccountDto,
  ) {
    return this.accountsService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update account details' })
  async update(
    @CurrentUser('id') userId: bigint,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountsService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an account' })
  async remove(@CurrentUser('id') userId: bigint, @Param('id') id: string) {
    return this.accountsService.remove(userId, id);
  }
}
