import { Module } from '@nestjs/common';
import { PlayersController } from './players.controller.js';
import { PlayersService } from './players.service.js';
import { SupabaseService } from '../auth/supabase.services.js';

@Module({
  controllers: [PlayersController],
  providers: [PlayersService, SupabaseService],
  exports: [PlayersService],
})
export class PlayersModule {}
