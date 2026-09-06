import { Module } from '@nestjs/common';
import { CourtsModule } from '../courts/courts.module.js';
import { FacilitiesController } from './facilities.controller.js';
import { FacilitiesService } from './facilities.service.js';

@Module({
  imports: [CourtsModule],
  controllers: [FacilitiesController],
  providers: [FacilitiesService],
  exports: [FacilitiesService],
})
export class FacilitiesModule {}
