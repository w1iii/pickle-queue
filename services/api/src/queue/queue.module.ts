import { Module } from '@nestjs/common';
import { MatchingService } from './matching.service.js';
import { QrModule } from './qr/qr.module.js';
import { QueueController } from './queue.controller.js';
import { QueueService } from './queue.service.js';

@Module({
  imports: [QrModule],
  controllers: [QueueController],
  providers: [QueueService, MatchingService],
  exports: [QueueService, MatchingService],
})
export class QueueModule {}
