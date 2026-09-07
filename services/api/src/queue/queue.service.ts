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

  async join(playerId: string, dto: JoinQueueDto): Promise<QueueEntry> {
    await this.assertFacilityActive(dto.facility_id);
    await this.assertNotAlreadyInQueue(playerId, dto.facility_id);

    const position = await this.getNextPosition(dto.facility_id);

    const { data, error } = await this.supabase.admin
      .from('queue_entries')
      .insert({
        facility_id: dto.facility_id,
        player_id: playerId,
        status: 'waiting',
        position,
        preference_tags: dto.preference_tags ?? [],
        device_push_token: dto.device_push_token,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async leave(playerId: string, facilityId: string): Promise<void> {
    const entry = await this.findActiveEntry(playerId, facilityId);

    const { error } = await this.supabase.admin
      .from('queue_entries')
      .update({ status: 'cancelled' })
      .eq('id', entry.id);

    if (error) {
      throw new BadRequestException(error.message);
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
