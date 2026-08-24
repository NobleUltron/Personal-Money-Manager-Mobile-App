import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateGoalDto {
  @ApiProperty({ example: 'Emergency Fund' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 5000000 })
  @IsNumber()
  @Min(1)
  target_amount: number;

  @ApiProperty({ example: 500000, required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  current_amount?: number;

  @ApiProperty({ example: '2026-12-31', required: false })
  @IsDateString()
  @IsOptional()
  target_date?: string;

  @ApiProperty({ example: 'Savings', required: false, default: 'General' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: '#6366f1', required: false, default: '#6366f1' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: '6 months living expenses', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class DepositGoalDto {
  @ApiProperty({ example: 100000 })
  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class UpdateGoalDto {
  @ApiProperty({ example: 'Emergency Fund' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 5000000 })
  @IsNumber()
  @Min(1)
  target_amount: number;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(0)
  current_amount: number;

  @ApiProperty({ example: '2026-12-31', required: false })
  @IsDateString()
  @IsOptional()
  target_date?: string;

  @ApiProperty({ example: 'Savings', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: '#6366f1', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: '6 months living expenses', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
