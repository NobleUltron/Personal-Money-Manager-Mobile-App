import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'johndoe' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'john@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'UGX', required: false, default: 'UGX' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 'UGX', required: false, default: 'UGX' })
  @IsString()
  @IsOptional()
  currency_symbol?: string;
}
