import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

const TAU = 0.5;
const Q = Math.log(10) / 400;
const MIN_RATING = 1;
const MAX_RATING = 5;
const MIN_DEVIATION = 0.1;
const MAX_DEVIATION = 2;

type RatingResult = { playerId: string; score: number };
type PlayerRating = { id: string; rating: number; rating_dev: number };

@Injectable()
export class RatingsService {
  constructor(private readonly supabase: SupabaseService) {}

  async calculate(gameId: string, results: RatingResult[]) {
    const playerIds = results.map((result) => result.playerId);
    if (
      new Set(playerIds).size !== playerIds.length ||
      results.some(
        (result) =>
          !Number.isFinite(result.score) ||
          result.score < 0 ||
          result.score > 1,
      )
    ) {
      throw new BadRequestException(
        'Results must contain unique players with scores from 0 to 1',
      );
    }

    const { data: players, error: playerError } = await this.supabase.admin
      .from('players')
      .select('id, rating, rating_dev')
      .in('id', playerIds);
    if (playerError || !players || players.length !== playerIds.length) {
      throw new NotFoundException(
        'Unable to load all players for rating calculation',
      );
    }

    const ratings = new Map<string, PlayerRating>(
      players.map((player) => [
        player.id,
        {
          id: player.id,
          rating: Number(player.rating),
          rating_dev: Number(player.rating_dev),
        },
      ]),
    );
    const changes = results.map((result) => {
      const player = ratings.get(result.playerId)!;
      const sums = results
        .filter((opponent) => opponent.playerId !== result.playerId)
        .reduce(
          (total, opponent) => {
            const opponentRating = ratings.get(opponent.playerId)!;
            const g = this.g(opponentRating.rating_dev);
            const expected = this.expected(
              player.rating,
              opponentRating.rating,
              g,
            );
            return {
              variance: total.variance + g * g * expected * (1 - expected),
              difference: total.difference + g * (result.score - expected),
            };
          },
          { variance: 0, difference: 0 },
        );
      const dSquared = 1 / (Q * Q * sums.variance);
      const denominator =
        1 / (player.rating_dev * player.rating_dev) + 1 / dSquared;
      return {
        player,
        ratingBefore: player.rating,
        deviationBefore: player.rating_dev,
        ratingAfter: this.clamp(
          player.rating + (Q / denominator) * sums.difference,
          MIN_RATING,
          MAX_RATING,
        ),
        deviationAfter: this.clamp(
          1 / Math.sqrt(denominator),
          MIN_DEVIATION,
          MAX_DEVIATION,
        ),
      };
    });

    for (const change of changes) {
      const { error } = await this.supabase.admin
        .from('players')
        .update({
          rating: change.ratingAfter,
          rating_dev: change.deviationAfter,
          updated_at: new Date().toISOString(),
        })
        .eq('id', change.player.id);
      if (error) throw new BadRequestException(error.message);

      const { error: historyError } = await this.supabase.admin
        .from('rating_history')
        .insert({
          player_id: change.player.id,
          game_id: gameId,
          rating_before: change.ratingBefore,
          rating_after: change.ratingAfter,
          deviation_before: change.deviationBefore,
          deviation_after: change.deviationAfter,
        });
      if (historyError) throw new BadRequestException(historyError.message);
    }

    return changes.map((change) => ({
      player_id: change.player.id,
      rating_before: change.ratingBefore,
      rating_after: change.ratingAfter,
      deviation_before: change.deviationBefore,
      deviation_after: change.deviationAfter,
    }));
  }

  async getHistory(userId: string, playerId: string) {
    if (userId !== playerId)
      throw new ForbiddenException('You can only view your own rating history');
    const { data, error } = await this.supabase.admin
      .from('rating_history')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });
    if (error) throw new NotFoundException('Unable to load rating history');
    return data;
  }

  async submitQuickRating(
    userId: string,
    playerId: string,
    gameId: string,
    rating: string,
  ) {
    if (userId !== playerId)
      throw new ForbiddenException('You can only rate your own game');
    if (!gameId || !['too_easy', 'fair', 'too_tough'].includes(rating)) {
      throw new BadRequestException('gameId and a valid rating are required');
    }

    return { player_id: playerId, game_id: gameId, rating, status: 'stub' };
  }

  private g(deviation: number): number {
    return (
      1 /
      Math.sqrt(1 + (3 * Q * Q * deviation * deviation) / (Math.PI * Math.PI))
    );
  }

  private expected(
    playerRating: number,
    opponentRating: number,
    g: number,
  ): number {
    return 1 / (1 + Math.pow(10, (-g * (playerRating - opponentRating)) / 400));
  }

  private clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, Number(value.toFixed(2))));
  }
}
