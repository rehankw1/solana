import { ApiProperty } from '@nestjs/swagger';
import { 
  IsBoolean, 
  IsNumber, 
  IsOptional, 
  Min, 
  Max 
} from 'class-validator';

export class UpdateConfigDto {
  @ApiProperty({ 
    description: 'Enable selling', 
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  sell?: boolean;

  @ApiProperty({ 
    description: 'Trigger mechanism', 
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  trigger?: boolean;

  @ApiProperty({ 
    description: 'Diversification flag', 
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  diverse?: boolean;

  @ApiProperty({ 
    description: 'Minimum number of wallets', 
    example: 1,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  minWallets?: number;

  @ApiProperty({ 
    description: 'Maximum number of wallets', 
    example: 5,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxWallets?: number;

  @ApiProperty({ 
    description: 'Market cap threshold', 
    example: 1000000,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  untillMCap?: number;

  @ApiProperty({ 
    description: 'Minimum lot size', 
    example: 100,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minLot?: number;

  @ApiProperty({ 
    description: 'Maximum loss limit', 
    example: 1000,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxLot?: number;

  @ApiProperty({ 
    description: 'Randomize lot size', 
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  randomLot?: boolean;

  @ApiProperty({ 
    description: 'Minimum interval', 
    example: 60,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minInterval?: number;

  @ApiProperty({ 
    description: 'Maximum interval', 
    example: 300,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxInterval?: number;

  @ApiProperty({ 
    description: 'Randomize interval', 
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  randomInterval?: boolean;
}