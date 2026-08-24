import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTransferDto {
  @ApiProperty({ example: 'acc-uuid-source' })
  @IsString()
  @IsNotEmpty()
  fromAccountId: string;

  @ApiProperty({ example: 'acc-uuid-dest' })
  @IsString()
  @IsNotEmpty()
  toAccountId: string;

  @ApiProperty({ example: 100000 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: '2026-08-21' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Monthly allowance transfer', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}
