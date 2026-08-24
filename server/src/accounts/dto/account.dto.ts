import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({ example: 'Centenary Bank' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Centenary Bank', required: false })
  @IsString()
  @IsOptional()
  bank_name?: string;

  @ApiProperty({ example: '3200123456', required: false })
  @IsString()
  @IsOptional()
  account_number?: string;

  @ApiProperty({ example: 'Bank', enum: ['Bank', 'Mobile Money', 'Cash', 'Savings', 'Credit Card'] })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 500000, required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  initial_balance?: number;
}

export class UpdateAccountDto {
  @ApiProperty({ example: 'Centenary Bank' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Centenary Bank', required: false })
  @IsString()
  @IsOptional()
  bank_name?: string;

  @ApiProperty({ example: '3200123456', required: false })
  @IsString()
  @IsOptional()
  account_number?: string;

  @ApiProperty({ example: 'Bank' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 500000, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  initial_balance?: number;
}
