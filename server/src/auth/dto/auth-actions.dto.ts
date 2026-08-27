import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Verify2faDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'temp-2fa-token-from-login' })
  @IsString()
  @IsNotEmpty()
  tempToken: string;
}

export class Resend2faDto {
  @ApiProperty({ example: 'temp-2fa-token-from-login' })
  @IsString()
  @IsNotEmpty()
  tempToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'johndoe' })
  @IsString()
  @IsNotEmpty()
  username: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 100)
  password: string;
}