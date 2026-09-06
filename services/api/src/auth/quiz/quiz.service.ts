import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service.js';
import { QuizDto } from './dto/quiz.dto.js';

@Injectable()
export class QuizService {
  private static readonly BASE_RATING = 2.5;
  private static readonly POINTS_PER_YES = 0.5;

  constructor(private readonly supabase: SupabaseService) {}

  async submitQuiz(userId: string, dto: QuizDto) {
    const yesCount = [
      dto.serveBehindBaseline,
      dto.knowKitchenRules,
      dto.sustainDinkRally10Plus,
      dto.playedOrganizedLeague,
      dto.comfortableWithSpinServe,
    ].filter(Boolean).length;

    const rating = Math.min(
      5.0,
      QuizService.BASE_RATING + yesCount * QuizService.POINTS_PER_YES,
    );

    const { error } = await this.supabase.admin
      .from('players')
      .update({ rating })
      .eq('id', userId);

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return { rating, yesCount };
  }
}
