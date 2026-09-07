import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { CourtsModule } from './courts/courts.module.js';
import { FacilitiesModule } from './facilities/facilities.module.js';
import { PlayersModule } from './players/players.module.js';
import { QueueModule } from './queue/queue.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';
import { SupabaseService } from './supabase/supabase.service.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'api',
    }),
    SupabaseModule,
    AuthModule,
    PlayersModule,
    FacilitiesModule,
    CourtsModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [AppService, SupabaseService],
})
export class AppModule {}
