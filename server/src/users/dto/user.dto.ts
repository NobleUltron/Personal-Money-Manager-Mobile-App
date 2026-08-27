import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'johndoe' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'john@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'UGX', required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 'UGX', required: false })
  @IsString()
  @IsOptional()
  currency_symbol?: string;

  @ApiProperty({ example: 'data:image/jpeg;base64,...', required: false })
  @IsString()
  @IsOptional()
  profile_picture?: string;
}

export class Toggle2faDto {
  @ApiProperty({ example: true })
  enable: boolean;
}

export class Enable2faDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'JBSWY3DPEHPK3PXP' })
  @IsString()
  @IsNotEmpty()
  secret: string;

  @ApiProperty({ example: ['1234-5678', '8765-4321'] })
  @IsArray()
  backupCodes: string[];
}

export class Disable2faDto {
  @ApiProperty({ example: 'currentpassword123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class UpdatePasswordDto {
  @ApiProperty({ example: 'currentpassword' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'newpassword123', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class ConvertCurrencyDto {
  @ApiProperty({ example: 'USD' })
  @IsString()
  @IsNotEmpty()
  to_currency: string;

  @ApiProperty({ example: '$' })
  @IsString()
  @IsNotEmpty()
  to_symbol: string;

  @ApiProperty({ example: 0.000267 })
  @IsNumber()
  @IsNotEmpty()
  rate: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  convert_balances: boolean;
}