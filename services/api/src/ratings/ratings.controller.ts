import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RatingsService } from './ratings.service.js';

type AuthenticatedRequest = Request & { user: { id: string } };
type RatingResult = { playerId: string; score: number };

@Controller()
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post('ratings/calculate')
  calculate(@Body() body: { gameId: string; results: RatingResult[] }) {
    if (
      !body?.gameId ||
      !Array.isArray(body.results) ||
      body.results.length < 2
    ) {
      throw new BadRequestException(
        'gameId and at least two results are required',
      );
    }

    return this.ratingsService.calculate(body.gameId, body.results);
  }

  @Get('ratings/:playerId/history')
  @UseGuards(JwtAuthGuard)
  getHistory(
    @Req() request: AuthenticatedRequest,
    @Param('playerId') playerId: string,
  ) {
    return this.ratingsService.getHistory(request.user.id, playerId);
  }

  @Post('players/:id/quick-rating')
  @UseGuards(JwtAuthGuard)
  quickRating(
    @Req() request: AuthenticatedRequest,
    @Param('id') playerId: string,
    @Body() body: { gameId: string; rating: string },
  ) {
    return this.ratingsService.submitQuickRating(
      request.user.id,
      playerId,
      body?.gameId,
      body?.rating,
    );
  }
}
