import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller.js';
import { QuizService } from './quiz.service.js';
import { SupabaseService } from '../supabase.services.js';

@Module({
  controllers: [QuizController],
  providers: [QuizService, SupabaseService],
})
export class QuizModule {}
