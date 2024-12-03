import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  UsePipes, 
  ValidationPipe 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ConfigService } from './config.service';
import { AppConfig } from './app.config';
import { UpdateConfigDto } from './config.dto';
import { Cron } from '@nestjs/schedule';

@ApiTags('Configuration')
@Controller('config')
export class ConfigController {
  constructor(private configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get current configuration' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return current application configuration'
  })
  getConfig(): AppConfig {
    return this.configService.getConfig();
  }

  @Post()
  @ApiOperation({ summary: 'Update configuration' })
  @ApiBody({ 
    type: UpdateConfigDto,
    description: 'Configuration update object'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuration successfully updated'
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  updateConfig(@Body() newConfig: UpdateConfigDto): AppConfig {
    return this.configService.updateConfig(newConfig);
  }

}