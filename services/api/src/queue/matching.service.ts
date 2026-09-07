import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { QueueService } from './queue.service.js';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly queueService: QueueService,
  ) {}

  async runMatch(facilityId: string): Promise<void> {
    const settings = await this.getFacilitySettings(facilityId);
    if (!settings?.auto_match) return;

    const facility = await this.getFacility(facilityId);
    if (!facility) return;

    const waitingEntries = await this.getWaitingEntries(facilityId);
    if (waitingEntries.length < 2) return;

    const availableCourts = await this.getAvailableCourts(facilityId);
    if (availableCourts.length === 0) return;

    this.logger.log(
      `Matching: ${waitingEntries.length} waiting, ${availableCourts.length} courts available`,
    );

    switch (facility.queue_algorithm) {
      case 'skill_based':
        await this.matchBySkill(waitingEntries, availableCourts);
        break;
      case 'fifo':
        await this.matchFifo(waitingEntries, availableCourts);
        break;
      case 'random':
        await this.matchRandom(waitingEntries, availableCourts);
        break;
    }
  }

  private async matchBySkill(
    entries: Array<{ id: string; player_id: string; position: number }>,
    courts: Array<{ id: string }>,
  ): Promise<void> {
    const playerIds = entries.map((e) => e.player_id);
    const players = await this.getPlayers(playerIds);

    const sorted = [...entries].sort((a, b) => {
      const pa = players.find((p) => p.id === a.player_id);
      const pb = players.find((p) => p.id === b.player_id);
      return (pb?.rating ?? 0) - (pa?.rating ?? 0);
    });

    await this.pairEntries(sorted, courts);
  }

  private async matchFifo(
    entries: Array<{ id: string; player_id: string; position: number }>,
    courts: Array<{ id: string }>,
  ): Promise<void> {
    const sorted = [...entries].sort((a, b) => a.position - b.position);
    await this.pairEntries(sorted, courts);
  }

  private async matchRandom(
    entries: Array<{ id: string; player_id: string; position: number }>,
    courts: Array<{ id: string }>,
  ): Promise<void> {
    const shuffled = [...entries].sort(() => Math.random() - 0.5);
    await this.pairEntries(shuffled, courts);
  }

  private async pairEntries(
    entries: Array<{ id: string; player_id: string }>,
    courts: Array<{ id: string }>,
  ): Promise<void> {
    const pairs = this.chunkIntoPairs(entries);

    for (let i = 0; i < pairs.length && i < courts.length; i++) {
      const [entry1, entry2] = pairs[i];
      if (!entry1 || !entry2) continue;

      const court = courts[i];

      const game = await this.createGame(
        entry1.player_id,
        entry2.player_id,
        court.id,
      );

      if (game) {
        await this.queueService.markMatched(entry1.id, game.id);
        await this.queueService.markMatched(entry2.id, game.id);
        this.logger.log(`Matched: ${entry1.player_id} vs ${entry2.player_id} on court ${court.id}`);
      }
    }
  }

  private chunkIntoPairs<T>(items: T[]): Array<[T, T?]> {
    const pairs: Array<[T, T?]> = [];
    for (let i = 0; i < items.length; i += 2) {
      pairs.push([items[i], items[i + 1]]);
    }
    return pairs;
  }

  private async createGame(
    player1Id: string,
    player2Id: string,
    courtId: string,
  ) {
    const { data: facility } = await this.supabase.admin
      .from('queue_entries')
      .select('facility_id')
      .eq('player_id', player1Id)
      .eq('status', 'waiting')
      .maybeSingle();

    const { data, error } = await this.supabase.admin
      .from('games')
      .insert({
        facility_id: facility?.facility_id,
        court_id: courtId,
        player1_id: player1Id,
        player2_id: player2Id,
        status: 'scheduled',
        is_doubles: false,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create game: ${error.message}`);
      return null;
    }

    return data;
  }

  private async getFacilitySettings(facilityId: string) {
    const { data } = await this.supabase.admin
      .from('facility_settings')
      .select('*')
      .eq('facility_id', facilityId)
      .maybeSingle();

    return data;
  }

  private async getFacility(facilityId: string) {
    const { data } = await this.supabase.admin
      .from('facilities')
      .select('queue_algorithm')
      .eq('id', facilityId)
      .maybeSingle();

    return data;
  }

  private async getWaitingEntries(facilityId: string) {
    const { data } = await this.supabase.admin
      .from('queue_entries')
      .select('id, player_id, position')
      .eq('facility_id', facilityId)
      .eq('status', 'waiting')
      .order('position', { ascending: true });

    return data ?? [];
  }

  private async getAvailableCourts(facilityId: string) {
    const { data: busyCourts } = await this.supabase.admin
      .from('games')
      .select('court_id')
      .eq('facility_id', facilityId)
      .in('status', ['scheduled', 'in_progress']);

    const busyIds = new Set((busyCourts ?? []).map((c) => c.court_id));

    const { data: courts } = await this.supabase.admin
      .from('courts')
      .select('id')
      .eq('facility_id', facilityId)
      .eq('is_active', true);

    return (courts ?? []).filter((c) => !busyIds.has(c.id));
  }

  private async getPlayers(ids: string[]) {
    const { data } = await this.supabase.admin
      .from('players')
      .select('id, rating')
      .in('id', ids);

    return data ?? [];
  }
}
