import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateLoanDto {
  @ApiProperty({ example: 'borrowed', enum: ['borrowed', 'lent'] })
  @IsString()
  @IsIn(['borrowed', 'lent'])
  type: string;

  @ApiProperty({ example: 'Alex Makerere' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 250000 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 0, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount_paid?: number;

  @ApiProperty({ example: '2026-10-15', required: false })
  @IsDateString()
  @IsOptional()
  due_date?: string;

  @ApiProperty({ example: 'acc-uuid-123', required: false })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  sync_account?: boolean;
}

export class RepayLoanDto {
  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0.01)
  repayment_amount: number;

  @ApiProperty({ example: 'acc-uuid-123', required: false })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  sync_account?: boolean;
}

export class UpdateLoanDto {
  @ApiProperty({ example: 'borrowed', enum: ['borrowed', 'lent'] })
  @IsString()
  @IsIn(['borrowed', 'lent'])
  type: string;

  @ApiProperty({ example: 'Alex Makerere' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 250000 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  amount_paid: number;

  @ApiProperty({ example: '2026-10-15', required: false })
  @IsDateString()
  @IsOptional()
  due_date?: string;

  @ApiProperty({ example: 'acc-uuid-123', required: false })
  @IsString()
  @IsOptional()
  accountId?: string;
}
