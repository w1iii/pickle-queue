import { Module } from '@nestjs/common';
import { FacilityStaffGuard } from '../common/guards/facility-staff.guard.js';
import { MatchingService } from './matching.service.js';
import { QrModule } from './qr/qr.module.js';
import { QueueController } from './queue.controller.js';
import { QueueService } from './queue.service.js';

@Module({
  imports: [QrModule],
  controllers: [QueueController],
  providers: [QueueService, MatchingService, FacilityStaffGuard],
  exports: [QueueService, MatchingService],
})
export class QueueModule {}
