import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { CreatePlayerDto } from './dto/create-player.dto.js';
import { UpdatePlayerDto } from './dto/update-player.dto.js';

@Injectable()
export class PlayersService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(userId: string, dto: CreatePlayerDto) {
    const { data, error } = await this.supabase.admin
      .from('players')
      .insert({ id: userId, ...dto })
      .select()
      .single();

    if (error) {
      throw new ForbiddenException(error.message);
    }

    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.admin
      .from('players')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Player not found');
    }

    return data;
  }

  async update(userId: string, id: string, dto: UpdatePlayerDto) {
    this.assertOwnProfile(userId, id);

    const { data, error } = await this.supabase.admin
      .from('players')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Player not found');
    }

    return data;
  }

  async getStats(id: string) {
    await this.findOne(id);

    const { data: games, error } = await this.supabase.admin
      .from('games')
      .select(
        'player1_id, player2_id, player3_id, player4_id, score_team_a, score_team_b',
      )
      .or(
        `player1_id.eq.${id},player2_id.eq.${id},player3_id.eq.${id},player4_id.eq.${id}`,
      )
      .eq('status', 'completed');

    if (error) {
      throw new NotFoundException('Unable to load player statistics');
    }

    const completedGames = games ?? [];
    const wins = completedGames.filter((game) => {
      const isTeamA = game.player1_id === id || game.player3_id === id;
      return isTeamA
        ? game.score_team_a > game.score_team_b
        : game.score_team_b > game.score_team_a;
    }).length;

    return {
      games_played: completedGames.length,
      wins,
      losses: completedGames.length - wins,
    };
  }

  async getRatingHistory(userId: string, id: string) {
    this.assertOwnProfile(userId, id);

    const { data, error } = await this.supabase.admin
      .from('rating_history')
      .select('*')
      .eq('player_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new NotFoundException('Unable to load rating history');
    }

    return data;
  }

  async getLeaderboard(facilityId?: string) {
    let playerIds: string[] | undefined;

    if (facilityId) {
      const { data: games, error: gamesError } = await this.supabase.admin
        .from('games')
        .select('player1_id, player2_id, player3_id, player4_id')
        .eq('facility_id', facilityId)
        .eq('status', 'completed');

      if (gamesError) {
        throw new NotFoundException('Unable to load facility leaderboard');
      }

      playerIds = [
        ...new Set(
          (games ?? []).flatMap((game) =>
            [
              game.player1_id,
              game.player2_id,
              game.player3_id,
              game.player4_id,
            ].filter((id): id is string => Boolean(id)),
          ),
        ),
      ];

      if (playerIds.length === 0) {
        return [];
      }
    }

    let query = this.supabase.admin
      .from('players')
      .select('*')
      .eq('is_active', true)
      .order('rating', { ascending: false });

    if (playerIds) {
      query = query.in('id', playerIds);
    }

    const { data, error } = await query;
    if (error) {
      throw new NotFoundException('Unable to load leaderboard');
    }

    return data;
  }

  private assertOwnProfile(userId: string, playerId: string): void {
    if (userId !== playerId) {
      throw new ForbiddenException(
        'You can only modify your own player profile',
      );
    }
  }
}
