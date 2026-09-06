import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { QuizService } from './quiz.service.js';
import { QuizDto } from './dto/quiz.dto.js';
import { AuthGuard } from '../auth.guard.js';

@Controller('auth/signup')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('quiz')
  @UseGuards(AuthGuard)
  submitQuiz(@Req() req: any, @Body() dto: QuizDto) {
    return this.quizService.submitQuiz(req.user.id, dto);
  }
}
