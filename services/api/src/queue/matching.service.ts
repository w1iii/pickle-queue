import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { QueueService } from './queue.service.js';

interface QueueEntry {
  id: string;
  player_id: string;
  position: number;
  squad_id: string | null;
}

interface Squad {
  squadId: string;
  entries: [QueueEntry, QueueEntry];
}

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
    if (waitingEntries.length < 4) return;

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
    entries: QueueEntry[],
    courts: Array<{ id: string }>,
  ): Promise<void> {
    const { squads, singles } = this.groupBySquad(entries);

    const playerIds = entries.map((e) => e.player_id);
    const players = await this.getPlayers(playerIds);
    const getRating = (pid: string) =>
      players.find((p) => p.id === pid)?.rating ?? 0;

    const sortedSquads = [...squads].sort((a, b) => {
      const avgA = (getRating(a.entries[0].player_id) + getRating(a.entries[1].player_id)) / 2;
      const avgB = (getRating(b.entries[0].player_id) + getRating(b.entries[1].player_id)) / 2;
      return avgB - avgA;
    });

    const sortedSingles = [...singles].sort(
      (a, b) => getRating(b.player_id) - getRating(a.player_id),
    );

    await this.matchDoubles(sortedSquads, sortedSingles, courts);
  }

  private async matchFifo(
    entries: QueueEntry[],
    courts: Array<{ id: string }>,
  ): Promise<void> {
    const { squads, singles } = this.groupBySquad(entries);

    const sortedSquads = [...squads].sort(
      (a, b) => a.entries[0].position - b.entries[0].position,
    );
    const sortedSingles = [...singles].sort((a, b) => a.position - b.position);

    await this.matchDoubles(sortedSquads, sortedSingles, courts);
  }

  private async matchRandom(
    entries: QueueEntry[],
    courts: Array<{ id: string }>,
  ): Promise<void> {
    const { squads, singles } = this.groupBySquad(entries);

    const shuffledSquads = [...squads].sort(() => Math.random() - 0.5);
    const shuffledSingles = [...singles].sort(() => Math.random() - 0.5);

    await this.matchDoubles(shuffledSquads, shuffledSingles, courts);
  }

  private groupBySquad(entries: QueueEntry[]): {
    squads: Squad[];
    singles: QueueEntry[];
  } {
    const squadMap = new Map<string, QueueEntry[]>();
    const singles: QueueEntry[] = [];

    for (const entry of entries) {
      if (entry.squad_id) {
        const group = squadMap.get(entry.squad_id) ?? [];
        group.push(entry);
        squadMap.set(entry.squad_id, group);
      } else {
        singles.push(entry);
      }
    }

    const squads: Squad[] = [];
    for (const [squadId, group] of squadMap) {
      if (group.length >= 2) {
        squads.push({ squadId, entries: [group[0], group[1]] });
      } else {
        singles.push(group[0]);
      }
    }

    return { squads, singles };
  }

  private async matchDoubles(
    squads: Squad[],
    singles: QueueEntry[],
    courts: Array<{ id: string }>,
  ): Promise<void> {
    let courtIdx = 0;

    while (courtIdx < courts.length) {
      const teamA = this.pickTeamA(squads, singles);
      if (!teamA) break;

      const teamB = this.pickTeamB(squads, singles, teamA);
      if (!teamB) break;

      const court = courts[courtIdx];
      const allIds = [...teamA, ...teamB].map((e) => e.player_id);

      const game = await this.createGame(allIds, court.id);

      if (game) {
        for (const entry of [...teamA, ...teamB]) {
          await this.queueService.markMatched(entry.id, game.id);
        }
        this.logger.log(
          `Doubles match: ${allIds.join(' vs ')} on court ${court.id}`,
        );
      }

      courtIdx++;
    }
  }

  private pickTeamA(squads: Squad[], singles: QueueEntry[]): QueueEntry[] | null {
    if (squads.length > 0) {
      return squads.shift()!.entries;
    }
    if (singles.length >= 2) {
      return [singles.shift()!, singles.shift()!];
    }
    return null;
  }

  private pickTeamB(
    squads: Squad[],
    singles: QueueEntry[],
    teamA: QueueEntry[],
  ): QueueEntry[] | null {
    if (squads.length > 0) {
      return squads.shift()!.entries;
    }
    if (singles.length >= 2) {
      return [singles.shift()!, singles.shift()!];
    }
    return null;
  }

  private async createGame(
    playerIds: string[],
    courtId: string,
  ) {
    const { data: facility } = await this.supabase.admin
      .from('queue_entries')
      .select('facility_id')
      .eq('player_id', playerIds[0])
      .eq('status', 'waiting')
      .maybeSingle();

    const { data, error } = await this.supabase.admin
      .from('games')
      .insert({
        facility_id: facility?.facility_id,
        court_id: courtId,
        player1_id: playerIds[0],
        player2_id: playerIds[1],
        player3_id: playerIds[2],
        player4_id: playerIds[3],
        status: 'scheduled',
        is_doubles: true,
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

  private async getWaitingEntries(facilityId: string): Promise<QueueEntry[]> {
    const { data } = await this.supabase.admin
      .from('queue_entries')
      .select('id, player_id, position, squad_id')
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
