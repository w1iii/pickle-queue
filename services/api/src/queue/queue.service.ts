import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { JoinQueueDto } from './dto/join-queue.dto.js';

interface QueueEntry {
  id: string;
  facility_id: string;
  player_id: string;
  status: string;
  position: number;
  joined_at: string;
  matched_at?: string;
  started_at?: string;
  completed_at?: string;
  game_id?: string;
  squad_id?: string;
  preference_tags: string[];
  device_push_token?: string;
}

@Injectable()
export class QueueService {
  constructor(private readonly supabase: SupabaseService) {}

  async join(playerId: string, dto: JoinQueueDto): Promise<QueueEntry[]> {
    await this.assertFacilityActive(dto.facility_id);
    await this.assertNotAlreadyInQueue(playerId, dto.facility_id);

    const isPair = Boolean(dto.partner_id);

    if (isPair) {
      await this.assertNotAlreadyInQueue(dto.partner_id!, dto.facility_id);
      await this.assertPlayerActive(dto.partner_id!);
    }

    const squadId = isPair ? crypto.randomUUID() : null;
    const basePosition = await this.getNextPosition(dto.facility_id);

    const entries = [
      {
        facility_id: dto.facility_id,
        player_id: playerId,
        status: 'waiting',
        position: basePosition,
        squad_id: squadId,
        preference_tags: dto.preference_tags ?? [],
        device_push_token: dto.device_push_token,
      },
      ...(isPair
        ? [
            {
              facility_id: dto.facility_id,
              player_id: dto.partner_id!,
              status: 'waiting',
              position: basePosition + 1,
              squad_id: squadId,
              preference_tags: [] as string[],
              device_push_token: undefined as string | undefined,
            },
          ]
        : []),
    ];

    const { data, error } = await this.supabase.admin
      .from('queue_entries')
      .insert(entries)
      .select();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data ?? [];
  }

  async leave(playerId: string, facilityId: string): Promise<void> {
    const entry = await this.findActiveEntry(playerId, facilityId);

    if (entry.squad_id) {
      const { error } = await this.supabase.admin
        .from('queue_entries')
        .update({ status: 'cancelled' })
        .eq('squad_id', entry.squad_id)
        .eq('facility_id', facilityId)
        .in('status', ['waiting']);

      if (error) {
        throw new BadRequestException(error.message);
      }
    } else {
      const { error } = await this.supabase.admin
        .from('queue_entries')
        .update({ status: 'cancelled' })
        .eq('id', entry.id);

      if (error) {
        throw new BadRequestException(error.message);
      }
    }

    await this.reorderPositions(facilityId);
  }

  async getStatus(facilityId: string) {
    const { data: entries, error } = await this.supabase.admin
      .from('queue_entries')
      .select('*')
      .eq('facility_id', facilityId)
      .in('status', ['waiting', 'matched', 'playing'])
      .order('position', { ascending: true });

    if (error) {
      throw new NotFoundException('Unable to load queue status');
    }

    const waiting = (entries ?? []).filter((e) => e.status === 'waiting');
    const matched = (entries ?? []).filter((e) => e.status === 'matched');
    const playing = (entries ?? []).filter((e) => e.status === 'playing');

    return {
      facility_id: facilityId,
      total_waiting: waiting.length,
      total_matched: matched.length,
      total_playing: playing.length,
      entries: entries ?? [],
    };
  }

  async getPlayerEntry(playerId: string, facilityId: string) {
    return this.findActiveEntry(playerId, facilityId);
  }

  async getOwnStatus(playerId: string) {
    const { data, error } = await this.supabase.admin
      .from('queue_entries')
      .select('*')
      .eq('player_id', playerId)
      .in('status', ['waiting', 'matched', 'playing'])
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data;
  }

  async getWaitTime(facilityId: string): Promise<{
    estimated_min: number;
    ahead_in_queue: number;
    recent_avg_wait_min: number;
  }> {
    const { data: waiting } = await this.supabase.admin
      .from('queue_entries')
      .select('id, position')
      .eq('facility_id', facilityId)
      .eq('status', 'waiting')
      .order('position', { ascending: true });

    const { data: recentGames } = await this.supabase.admin
      .from('games')
      .select('created_at, started_at')
      .eq('facility_id', facilityId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    const recentWaitTimes = (recentGames ?? [])
      .map((g) => {
        if (!g.started_at) return null;
        const diff = new Date(g.started_at).getTime() - new Date(g.created_at).getTime();
        return diff / 60000;
      })
      .filter((w): w is number => w !== null && w > 0);

    const avgWait = recentWaitTimes.length > 0
      ? recentWaitTimes.reduce((a, b) => a + b, 0) / recentWaitTimes.length
      : 15;

    const ahead = (waiting ?? []).length;

    return {
      estimated_min: Math.round(avgWait),
      ahead_in_queue: ahead,
      recent_avg_wait_min: Math.round(avgWait),
    };
  }

  async markMatched(entryId: string, gameId: string): Promise<void> {
    const { error } = await this.supabase.admin
      .from('queue_entries')
      .update({
        status: 'matched',
        matched_at: new Date().toISOString(),
        game_id: gameId,
      })
      .eq('id', entryId);

    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  async markPlaying(entryId: string): Promise<void> {
    const { error } = await this.supabase.admin
      .from('queue_entries')
      .update({
        status: 'playing',
        started_at: new Date().toISOString(),
      })
      .eq('id', entryId);

    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  async markCompleted(entryId: string): Promise<void> {
    const { error } = await this.supabase.admin
      .from('queue_entries')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', entryId);

    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  async markNoShow(entryId: string): Promise<void> {
    const { error } = await this.supabase.admin
      .from('queue_entries')
      .update({ status: 'no_show' })
      .eq('id', entryId);

    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  private async findActiveEntry(
    playerId: string,
    facilityId: string,
  ): Promise<QueueEntry> {
    const { data, error } = await this.supabase.admin
      .from('queue_entries')
      .select('*')
      .eq('player_id', playerId)
      .eq('facility_id', facilityId)
      .in('status', ['waiting', 'matched', 'playing'])
      .single();

    if (error || !data) {
      throw new NotFoundException('No active queue entry found');
    }

    return data;
  }

  private async assertFacilityActive(facilityId: string): Promise<void> {
    const { data, error } = await this.supabase.admin
      .from('facilities')
      .select('is_active')
      .eq('id', facilityId)
      .single();

    if (error || !data || !data.is_active) {
      throw new BadRequestException('Facility is not active');
    }
  }

  private async assertNotAlreadyInQueue(
    playerId: string,
    facilityId: string,
  ): Promise<void> {
    const { data } = await this.supabase.admin
      .from('queue_entries')
      .select('id')
      .eq('player_id', playerId)
      .eq('facility_id', facilityId)
      .in('status', ['waiting', 'matched', 'playing'])
      .maybeSingle();

    if (data) {
      throw new ConflictException('Already in queue for this facility');
    }
  }

  private async assertPlayerActive(playerId: string): Promise<void> {
    const { data, error } = await this.supabase.admin
      .from('players')
      .select('is_active')
      .eq('id', playerId)
      .single();

    if (error || !data || !data.is_active) {
      throw new BadRequestException('Partner is not an active player');
    }
  }

  private async getNextPosition(facilityId: string): Promise<number> {
    const { data, error } = await this.supabase.admin
      .from('queue_entries')
      .select('position')
      .eq('facility_id', facilityId)
      .eq('status', 'waiting')
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return 1;
    }

    return (data?.position ?? 0) + 1;
  }

  private async reorderPositions(facilityId: string): Promise<void> {
    const { data: entries } = await this.supabase.admin
      .from('queue_entries')
      .select('id')
      .eq('facility_id', facilityId)
      .eq('status', 'waiting')
      .order('position', { ascending: true });

    if (!entries || entries.length === 0) return;

    for (let i = 0; i < entries.length; i++) {
      await this.supabase.admin
        .from('queue_entries')
        .update({ position: i + 1 })
        .eq('id', entries[i].id);
    }
  }
}
