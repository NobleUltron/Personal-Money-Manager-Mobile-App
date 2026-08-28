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
import {
  CreateAccountDto,
  UpdateAccountDto,
  CreateInvitationDto,
  UpdateMemberRoleDto,
  JoinAccountDto,
} from './dto/account.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Accounts')
@Controller('api/accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountsController {
  constructor(private accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all user accounts (personal & shared) with calculated balances' })
  async findAll(@CurrentUser('id') userId: bigint) {
    return this.accountsService.findAll(userId);
  }

  @Post('join')
  @ApiOperation({ summary: 'Join a shared account using a 6-8 digit invite code' })
  async joinAccount(
    @CurrentUser('id') userId: bigint,
    @Body() dto: JoinAccountDto,
  ) {
    return this.accountsService.joinAccountByCode(userId, dto);
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

  // --- SHARING & COLLABORATION ENDPOINTS ---

  @Post(':id/invitations')
  @ApiOperation({ summary: 'Create an invitation code to share account' })
  async createInvitation(
    @CurrentUser('id') userId: bigint,
    @Param('id') accountId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.accountsService.createInvitation(userId, accountId, dto);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get all members and active invitations for an account' })
  async getMembers(
    @CurrentUser('id') userId: bigint,
    @Param('id') accountId: string,
  ) {
    return this.accountsService.getMembers(userId, accountId);
  }

  @Patch(':id/members/:targetUserId')
  @ApiOperation({ summary: 'Update a member role in a shared account' })
  async updateMemberRole(
    @CurrentUser('id') userId: bigint,
    @Param('id') accountId: string,
    @Param('targetUserId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.accountsService.updateMemberRole(
      userId,
      accountId,
      BigInt(targetUserId),
      dto,
    );
  }

  @Delete(':id/members/:targetUserId')
  @ApiOperation({ summary: 'Remove a member or leave a shared account' })
  async removeMember(
    @CurrentUser('id') userId: bigint,
    @Param('id') accountId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.accountsService.removeMember(
      userId,
      accountId,
      BigInt(targetUserId),
    );
  }
}