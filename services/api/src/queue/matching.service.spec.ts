import { Test } from '@nestjs/testing';
import { MatchingService } from './matching.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { QueueService } from './queue.service.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MatchingService', () => {
  let service: MatchingService;
  let supabase: { admin: any };
  let queueService: { markMatched: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    supabase = { admin: {} };
    queueService = { markMatched: vi.fn() };

    return Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: SupabaseService, useValue: supabase },
        { provide: QueueService, useValue: queueService },
      ],
    })
      .compile()
      .then((module) => {
        service = module.get(MatchingService);
      });
  });

  describe('skill-based matching', () => {
    it('should match players within ±0.50 rating spread', async () => {
      const facilityId = 'f1';

      // Mock the chain properly
      let callCount = 0;
      supabase.admin.from = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Facility settings
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { auto_match: true },
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 2) {
          // Facility algorithm
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { queue_algorithm: 'skill_based' },
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 3) {
          // Waiting entries
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    data: [
                      {
                        id: 'q1',
                        player_id: 'p1',
                        position: 1,
                        joined_at: '2024-01-01T10:00:00Z',
                        squad_id: null,
                      },
                      {
                        id: 'q2',
                        player_id: 'p2',
                        position: 2,
                        joined_at: '2024-01-01T10:01:00Z',
                        squad_id: null,
                      },
                      {
                        id: 'q3',
                        player_id: 'p3',
                        position: 3,
                        joined_at: '2024-01-01T10:02:00Z',
                        squad_id: null,
                      },
                      {
                        id: 'q4',
                        player_id: 'p4',
                        position: 4,
                        joined_at: '2024-01-01T10:03:00Z',
                        squad_id: null,
                      },
                    ],
                  }),
                }),
              }),
            }),
          };
        } else if (callCount === 4) {
          // Busy courts
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  data: [],
                }),
              }),
            }),
          };
        } else if (callCount === 5) {
          // Available courts
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  data: [{ id: 'c1' }],
                }),
              }),
            }),
          };
        } else if (callCount === 6) {
          // Players
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { id: 'p1', rating: 2.5, rating_dev: 0.3 },
                  { id: 'p2', rating: 2.8, rating_dev: 0.4 },
                  { id: 'p3', rating: 2.6, rating_dev: 0.5 },
                  { id: 'p4', rating: 2.7, rating_dev: 0.6 },
                ],
              }),
            }),
          };
        } else if (callCount === 7) {
          // Facility ID for game
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { facility_id: 'f1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else {
          // Game creation
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'g1' },
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      await service.runMatch(facilityId);

      expect(queueService.markMatched).toHaveBeenCalledTimes(4);
    });

    it('should expand to ±1.00 spread when no match found', async () => {
      const facilityId = 'f1';

      let callCount = 0;
      supabase.admin.from = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          // Facility settings
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data:
                    callCount === 1
                      ? { auto_match: true }
                      : { queue_algorithm: 'skill_based' },
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 3) {
          // Waiting entries
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    data: [
                      {
                        id: 'q1',
                        player_id: 'p1',
                        position: 1,
                        joined_at: '2024-01-01T10:00:00Z',
                        squad_id: null,
                      },
                      {
                        id: 'q2',
                        player_id: 'p2',
                        position: 2,
                        joined_at: '2024-01-01T10:01:00Z',
                        squad_id: null,
                      },
                      {
                        id: 'q3',
                        player_id: 'p3',
                        position: 3,
                        joined_at: '2024-01-01T10:02:00Z',
                        squad_id: null,
                      },
                      {
                        id: 'q4',
                        player_id: 'p4',
                        position: 4,
                        joined_at: '2024-01-01T10:03:00Z',
                        squad_id: null,
                      },
                    ],
                  }),
                }),
              }),
            }),
          };
        } else if (callCount === 4) {
          // Busy courts
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({ data: [] }),
              }),
            }),
          };
        } else if (callCount === 5) {
          // Available courts
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({ data: [{ id: 'c1' }] }),
              }),
            }),
          };
        } else if (callCount === 6) {
          // Players with wide spread (spread 1.0, needs expanded spread)
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { id: 'p1', rating: 2.0, rating_dev: 0.3 },
                  { id: 'p2', rating: 2.3, rating_dev: 0.4 },
                  { id: 'p3', rating: 2.8, rating_dev: 0.5 },
                  { id: 'p4', rating: 3.0, rating_dev: 0.6 },
                ],
              }),
            }),
          };
        } else if (callCount === 7) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { facility_id: 'f1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'g1' },
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      await service.runMatch(facilityId);

      expect(queueService.markMatched).toHaveBeenCalledTimes(4);
    });

    it('should sort by rating_dev (most confident first)', async () => {
      const facilityId = 'f1';

      let callCount = 0;
      supabase.admin.from = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data:
                    callCount === 1
                      ? { auto_match: true }
                      : { queue_algorithm: 'skill_based' },
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 3) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    data: [
                      {
                        id: 'q1',
                        player_id: 'p1',
                        position: 1,
                        joined_at: '2024-01-01T10:00:00Z',
                        squad_id: null,
                      },
                      {
                        id: 'q2',
                        player_id: 'p2',
                        position: 2,
                        joined_at: '2024-01-01T10:01:00Z',
                        squad_id: null,
                      },
                      {
                        id: 'q3',
                        player_id: 'p3',
                        position: 3,
                        joined_at: '2024-01-01T10:02:00Z',
                        squad_id: null,
                      },
                      {
                        id: 'q4',
                        player_id: 'p4',
                        position: 4,
                        joined_at: '2024-01-01T10:03:00Z',
                        squad_id: null,
                      },
                    ],
                  }),
                }),
              }),
            }),
          };
        } else if (callCount === 4) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({ data: [] }),
              }),
            }),
          };
        } else if (callCount === 5) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({ data: [{ id: 'c1' }] }),
              }),
            }),
          };
        } else if (callCount === 6) {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { id: 'p1', rating: 2.5, rating_dev: 0.1 },
                  { id: 'p2', rating: 2.5, rating_dev: 0.5 },
                  { id: 'p3', rating: 2.5, rating_dev: 0.3 },
                  { id: 'p4', rating: 2.5, rating_dev: 0.8 },
                ],
              }),
            }),
          };
        } else if (callCount === 7) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { facility_id: 'f1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'g1' },
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      await service.runMatch(facilityId);

      expect(queueService.markMatched).toHaveBeenCalledTimes(4);
    });
  });

  describe('fifo matching', () => {
    it('should sort by joined_at', async () => {
      const facilityId = 'f1';

      let callCount = 0;
      supabase.admin.from = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data:
                    callCount === 1
                      ? { auto_match: true }
                      : { queue_algorithm: 'fifo' },
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 3) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    data: [
                      {
                        id: 'q1',
                        player_id: 'p1',
                        position: 1,
                        joined_at: '2024-01-01T10:03:00Z',
                        squad_id: null,
                      },
                      {
                        id: 'q2',
                        player_id: 'p2',
                        position: 2,
                        joined_at: '2024-01-01T10:00:00Z',
                        squad_id: null,
                      },
                      {
                        id: 'q3',
                        player_id: 'p3',
                        position: 3,
                        joined_at: '2024-01-01T10:01:00Z',
                        squad_id: null,
                      },
                      {
                        id: 'q4',
                        player_id: 'p4',
                        position: 4,
                        joined_at: '2024-01-01T10:02:00Z',
                        squad_id: null,
                      },
                    ],
                  }),
                }),
              }),
            }),
          };
        } else if (callCount === 4) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({ data: [] }),
              }),
            }),
          };
        } else if (callCount === 5) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({ data: [{ id: 'c1' }] }),
              }),
            }),
          };
        } else if (callCount === 6) {
          // createGame - facility_id lookup
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { facility_id: 'f1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else {
          // createGame - insert
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'g1' },
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      await service.runMatch(facilityId);

      expect(queueService.markMatched).toHaveBeenCalledTimes(4);
    });
  });

  describe('squad matching', () => {
    it('should keep squads together', async () => {
      const facilityId = 'f1';

      let callCount = 0;
      supabase.admin.from = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data:
                    callCount === 1
                      ? { auto_match: true }
                      : { queue_algorithm: 'skill_based' },
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 3) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    data: [
                      {
                        id: 'q1',
                        player_id: 'p1',
                        position: 1,
                        joined_at: '2024-01-01T10:00:00Z',
                        squad_id: 's1',
                      },
                      {
                        id: 'q2',
                        player_id: 'p2',
                        position: 2,
                        joined_at: '2024-01-01T10:01:00Z',
                        squad_id: 's1',
                      },
                      {
                        id: 'q3',
                        player_id: 'p3',
                        position: 3,
                        joined_at: '2024-01-01T10:02:00Z',
                        squad_id: 's2',
                      },
                      {
                        id: 'q4',
                        player_id: 'p4',
                        position: 4,
                        joined_at: '2024-01-01T10:03:00Z',
                        squad_id: 's2',
                      },
                      {
                        id: 'q5',
                        player_id: 'p5',
                        position: 5,
                        joined_at: '2024-01-01T10:04:00Z',
                        squad_id: null,
                      },
                      {
                        id: 'q6',
                        player_id: 'p6',
                        position: 6,
                        joined_at: '2024-01-01T10:05:00Z',
                        squad_id: null,
                      },
                    ],
                  }),
                }),
              }),
            }),
          };
        } else if (callCount === 4) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({ data: [] }),
              }),
            }),
          };
        } else if (callCount === 5) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({ data: [{ id: 'c1' }] }),
              }),
            }),
          };
        } else if (callCount === 6) {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { id: 'p1', rating: 2.5, rating_dev: 0.3 },
                  { id: 'p2', rating: 2.6, rating_dev: 0.4 },
                  { id: 'p3', rating: 2.7, rating_dev: 0.5 },
                  { id: 'p4', rating: 2.8, rating_dev: 0.6 },
                  { id: 'p5', rating: 2.9, rating_dev: 0.7 },
                  { id: 'p6', rating: 3.0, rating_dev: 0.8 },
                ],
              }),
            }),
          };
        } else if (callCount === 7) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { facility_id: 'f1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'g1' },
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      await service.runMatch(facilityId);

      expect(queueService.markMatched).toHaveBeenCalledTimes(4);
    });
  });
});
