import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Backup & Restore')
@Controller('api/backup')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BackupController {
  constructor(private backupService: BackupService) {}

  @Get('export')
  @ApiOperation({ summary: 'Export complete user financial data as JSON' })
  async exportData(@CurrentUser('id') userId: bigint) {
    return this.backupService.exportData(userId);
  }

  @Post('import')
  @ApiOperation({ summary: 'Restore and import user financial data from JSON backup' })
  async importData(
    @CurrentUser('id') userId: bigint,
    @Body() backupData: any,
  ) {
    return this.backupService.importData(userId, backupData);
  }
}
