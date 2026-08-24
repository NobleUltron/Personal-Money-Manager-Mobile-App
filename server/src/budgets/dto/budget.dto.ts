import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateBudgetDto {
  @ApiProperty({ example: 'Food & Dining' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 300000 })
  @IsNumber()
  @Min(0.01)
  amount: number;
}
