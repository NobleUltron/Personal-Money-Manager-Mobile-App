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

export class P2PTransferDto {
  @ApiProperty({ example: 'acc-uuid-source' })
  @IsString()
  @IsNotEmpty()
  fromAccountId: string;

  @ApiProperty({ example: 'noble_user' })
  @IsString()
  @IsNotEmpty()
  recipientUsername: string;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Lunch contribution', required: false })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ example: '2026-09-01', required: false })
  @IsDateString()
  @IsOptional()
  date?: string;
}
