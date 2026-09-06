import { Test, TestingModule } from '@nestjs/testing';
import { QuizService } from './quiz.service.js';
import { SupabaseService } from '../../supabase/supabase.service.js';
import { UnauthorizedException } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('QuizService', () => {
  let service: QuizService;
  let supabase: { admin: any };

  beforeEach(async () => {
    supabase = {
      admin: {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        { provide: SupabaseService, useValue: supabase },
      ],
    }).compile();

    service = module.get(QuizService);
  });

  const allFalse = {
    serveBehindBaseline: false,
    knowKitchenRules: false,
    sustainDinkRally10Plus: false,
    playedOrganizedLeague: false,
    comfortableWithSpinServe: false,
  };

  const allTrue = {
    serveBehindBaseline: true,
    knowKitchenRules: true,
    sustainDinkRally10Plus: true,
    playedOrganizedLeague: true,
    comfortableWithSpinServe: true,
  };

  it('should return base rating 2.5 when all answers false', async () => {
    const result = await service.submitQuiz('u1', allFalse);

    expect(result.rating).toBe(2.5);
    expect(result.yesCount).toBe(0);
  });

  it('should return max rating 5.0 when all answers true', async () => {
    const result = await service.submitQuiz('u1', allTrue);

    expect(result.rating).toBe(5.0);
    expect(result.yesCount).toBe(5);
  });

  it('should add 0.5 per yes answer', async () => {
    const dto = {
      ...allFalse,
      serveBehindBaseline: true,
      knowKitchenRules: true,
    };

    const result = await service.submitQuiz('u1', dto);

    expect(result.rating).toBe(3.5);
    expect(result.yesCount).toBe(2);
  });

  it('should cap at 5.0 even if math exceeds', async () => {
    const result = await service.submitQuiz('u1', allTrue);

    expect(result.rating).toBeLessThanOrEqual(5.0);
  });

  it('should call supabase update with correct args', async () => {
    await service.submitQuiz('user-123', allFalse);

    expect(supabase.admin.from).toHaveBeenCalledWith('players');
    expect(supabase.admin.update).toHaveBeenCalledWith({ rating: 2.5 });
    expect(supabase.admin.eq).toHaveBeenCalledWith('id', 'user-123');
  });

  it('should throw UnauthorizedException on update error', async () => {
    supabase.admin.eq.mockResolvedValue({
      error: { message: 'DB error' },
    });

    await expect(
      service.submitQuiz('u1', allFalse),
    ).rejects.toThrow(UnauthorizedException);
  });
});
