import { Module } from '@nestjs/common';
import { ConfigController } from './config/config.controller';
import { ConfigService } from './config/config.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  controllers: [ConfigController],
  providers: [ConfigService],
  imports: [ScheduleModule.forRoot()],
})
export class AppModule {}