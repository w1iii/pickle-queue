import { Module } from '@nestjs/common';
import { MatchingService } from './matching.service.js';
import { QueueController } from './queue.controller.js';
import { QueueService } from './queue.service.js';

@Module({
  controllers: [QueueController],
  providers: [QueueService, MatchingService],
  exports: [QueueService, MatchingService],
})
export class QueueModule {}
