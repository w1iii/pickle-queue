import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { QuizModule } from './quiz/quiz.module.js';
import { SupabaseService } from './supabase.services.js';

@Module({
  imports: [QuizModule],
  controllers: [AuthController],
  providers: [AuthService, SupabaseService],
  exports: [SupabaseService],
})
export class AuthModule {}
