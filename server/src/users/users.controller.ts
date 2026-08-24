import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Toggle2faDto, UpdatePasswordDto, UpdateProfileDto, ConvertCurrencyDto } from './dto/user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users & Settings')
@Controller('api/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile and preferences' })
  async getProfile(@CurrentUser('id') userId: bigint) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update username, email, currency preference' })
  async updateProfile(
    @CurrentUser('id') userId: bigint,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('password')
  @ApiOperation({ summary: 'Change account password' })
  async updatePassword(
    @CurrentUser('id') userId: bigint,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(userId, dto);
  }

  @Post('two-factor/toggle')
  @ApiOperation({ summary: 'Enable or disable 2FA security' })
  async toggle2FA(
    @CurrentUser('id') userId: bigint,
    @Body() dto: Toggle2faDto,
  ) {
    return this.usersService.toggle2FA(userId, dto);
  }
  @Post('convert-currency')
  @ApiOperation({ summary: 'Convert primary currency with optional balance scaling' })
  async convertCurrency(
    @CurrentUser('id') userId: bigint,
    @Body() dto: ConvertCurrencyDto,
  ) {
    return this.usersService.convertCurrency(userId, dto);
  }
}
