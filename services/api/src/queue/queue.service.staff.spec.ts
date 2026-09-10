import { Test } from '@nestjs/testing';
import { QueueService } from './queue.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('QueueService - Staff Operations', () => {
  let service: QueueService;
  let supabase: { admin: any };

  beforeEach(() => {
    supabase = {
      admin: {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn(),
        maybeSingle: vi.fn(),
      },
    };

    return Test.createTestingModule({
      providers: [
        QueueService,
        { provide: SupabaseService, useValue: supabase },
      ],
    })
      .compile()
      .then((module) => {
        service = module.get(QueueService);
      });
  });

  describe('manualAdd', () => {
    it('should add single player to queue', async () => {
      const facilityId = 'f1';
      const dto = { player_id: 'p1' };

      // Facility active check
      supabase.admin
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { is_active: true },
          error: null,
        });

      // Not already in queue check
      supabase.admin
        .from()
        .select()
        .eq()
        .in()
        .maybeSingle.mockResolvedValueOnce({
          data: null,
          error: null,
        });

      // Get next position
      supabase.admin
        .from()
        .select()
        .eq()
        .eq()
        .order()
        .limit()
        .maybeSingle.mockResolvedValueOnce({
          data: { position: 2 },
          error: null,
        });

      // Insert
      supabase.admin.from().insert.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          data: [{ id: 'q1', player_id: 'p1', position: 3 }],
          error: null,
        }),
      });

      const result = await service.manualAdd(facilityId, dto);

      expect(result).toHaveLength(1);
      expect(result[0].player_id).toBe('p1');
    });

    it('should add pair with squad_id', async () => {
      const facilityId = 'f1';
      const dto = { player_id: 'p1', partner_id: 'p2' };

      // Facility active check
      supabase.admin
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { is_active: true },
          error: null,
        });

      // Not already in queue checks (2x for both players)
      supabase.admin
        .from()
        .select()
        .eq()
        .in()
        .maybeSingle.mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      // Partner active check
      supabase.admin
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { is_active: true },
          error: null,
        });

      // Get next position
      supabase.admin
        .from()
        .select()
        .eq()
        .eq()
        .order()
        .limit()
        .maybeSingle.mockResolvedValueOnce({
          data: { position: 0 },
          error: null,
        });

      // Insert
      supabase.admin.from().insert.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          data: [
            { id: 'q1', player_id: 'p1', position: 1 },
            { id: 'q2', player_id: 'p2', position: 2 },
          ],
          error: null,
        }),
      });

      const result = await service.manualAdd(facilityId, dto);

      expect(result).toHaveLength(2);
    });

    it('should throw ConflictException if player already in queue', async () => {
      const facilityId = 'f1';
      const dto = { player_id: 'p1' };

      supabase.admin
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { is_active: true },
          error: null,
        });

      supabase.admin
        .from()
        .select()
        .eq()
        .in()
        .maybeSingle.mockResolvedValueOnce({
          data: { id: 'existing' },
          error: null,
        });

      await expect(service.manualAdd(facilityId, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('overridePosition', () => {
    it('should reorder waiting entries', async () => {
      const entryId = 'q2';
      const newPosition = 1;

      // Set up the mock chain properly
      let callCount = 0;
      supabase.admin.from = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: find entry
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'q2', facility_id: 'f1', status: 'waiting' },
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 2) {
          // Second call: get waiting entries
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    data: [
                      { id: 'q1', position: 1 },
                      { id: 'q2', position: 2 },
                      { id: 'q3', position: 3 },
                    ],
                  }),
                }),
              }),
            }),
          };
        } else {
          // Update calls
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
      });

      await service.overridePosition(entryId, newPosition);

      // Should update all positions
      expect(supabase.admin.from).toHaveBeenCalledWith('queue_entries');
    });

    it('should throw NotFoundException for non-existent entry', async () => {
      supabase.admin
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Not found' },
        });

      await expect(service.overridePosition('bad-id', 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for non-waiting entry', async () => {
      supabase.admin
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { id: 'q1', facility_id: 'f1', status: 'playing' },
          error: null,
        });

      await expect(service.overridePosition('q1', 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for out-of-range position', async () => {
      const entryId = 'q1';

      supabase.admin
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { id: 'q1', facility_id: 'f1', status: 'waiting' },
          error: null,
        });

      supabase.admin
        .from()
        .select()
        .eq()
        .eq()
        .order.mockReturnValueOnce({
          data: [
            { id: 'q1', position: 1 },
            { id: 'q2', position: 2 },
          ],
        });

      await expect(service.overridePosition(entryId, 5)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
