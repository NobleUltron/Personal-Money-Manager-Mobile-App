import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'acc-uuid-123' })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({ example: 'Netflix Premium' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 45000 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'monthly', enum: ['monthly', 'yearly', 'weekly'] })
  @IsString()
  @IsIn(['monthly', 'yearly', 'weekly'])
  frequency: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  next_due_date: string;

  @ApiProperty({ example: 'Entertainment', required: false, default: 'Other' })
  @IsString()
  @IsOptional()
  category?: string;
}

export class UpdateSubscriptionDto {
  @ApiProperty({ example: 'acc-uuid-123' })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({ example: 'Netflix Premium' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 45000 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'monthly', enum: ['monthly', 'yearly', 'weekly'] })
  @IsString()
  @IsIn(['monthly', 'yearly', 'weekly'])
  frequency: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  next_due_date: string;

  @ApiProperty({ example: 'Entertainment' })
  @IsString()
  @IsNotEmpty()
  category: string;
}
