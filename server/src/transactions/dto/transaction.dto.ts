import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({ example: 'acc-uuid-123' })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({ example: 'expense', enum: ['deposit', 'withdrawal', 'income', 'expense'] })
  @IsString()
  @IsIn(['deposit', 'withdrawal', 'income', 'expense'])
  type: string;

  @ApiProperty({ example: 45000 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: '2026-08-21' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Groceries at supermarket', required: false })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ example: 'Food & Dining', required: false, default: 'Other' })
  @IsString()
  @IsOptional()
  category?: string;
}

export class UpdateTransactionDto {
  @ApiProperty({ example: 'acc-uuid-123' })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({ example: 'expense', enum: ['deposit', 'withdrawal', 'income', 'expense'] })
  @IsString()
  @IsIn(['deposit', 'withdrawal', 'income', 'expense'])
  type: string;

  @ApiProperty({ example: 45000 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: '2026-08-21' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Groceries at supermarket', required: false })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ example: 'Food & Dining' })
  @IsString()
  @IsNotEmpty()
  category: string;
}

export class QueryTransactionDto {
  @ApiProperty({ example: 1, required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 20, required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({ example: 'acc-uuid-123', required: false })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiProperty({ example: 'expense', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ example: 'Food & Dining', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 'supermarket', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ example: '2026-08-01', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2026-08-31', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
