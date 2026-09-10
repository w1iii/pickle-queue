import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { CourtsModule } from './courts/courts.module.js';
import { FacilitiesModule } from './facilities/facilities.module.js';
import { PlayersModule } from './players/players.module.js';
import { QueueModule } from './queue/queue.module.js';
import { RatingsModule } from './ratings/ratings.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';
import { SupabaseService } from './supabase/supabase.service.js';

@Module({
  imports: [
    SupabaseModule,
    AuthModule,
    PlayersModule,
    FacilitiesModule,
    CourtsModule,
    QueueModule,
    RatingsModule,
  ],
  controllers: [AppController],
  providers: [AppService, SupabaseService],
})
export class AppModule {}

export const ObserveInstrument = undefined;
