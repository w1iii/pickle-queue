import { Module } from '@nestjs/common';
import { CourtsController } from './courts.controller.js';
import { CourtsService } from './courts.service.js';
import { SupabaseService } from '../auth/supabase.services.js';

@Module({
  controllers: [CourtsController],
  providers: [CourtsService, SupabaseService],
  exports: [CourtsService],
})
export class CourtsModule {}
