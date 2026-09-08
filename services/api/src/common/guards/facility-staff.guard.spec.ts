import { Test, TestingModule } from '@nestjs/testing';
import { FacilityStaffGuard } from './facility-staff.guard.js';
import { SupabaseService } from '../../supabase/supabase.service.js';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';

function mockContext(params: Record<string, string>, userId?: string) {
  const req: any = { params };
  if (userId) req.user = { id: userId };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as ExecutionContext;
}

describe('FacilityStaffGuard', () => {
  let guard: FacilityStaffGuard;
  let supabase: { isFacilityStaff: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    supabase = { isFacilityStaff: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacilityStaffGuard,
        { provide: SupabaseService, useValue: supabase },
      ],
    }).compile();

    guard = module.get(FacilityStaffGuard);
  });

  it('should allow staff members', async () => {
    supabase.isFacilityStaff.mockResolvedValue(true);
    const ctx = mockContext({ facilityId: 'f1' }, 'u1');

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(supabase.isFacilityStaff).toHaveBeenCalledWith('u1', 'f1');
  });

  it('should throw ForbiddenException for non-staff', async () => {
    supabase.isFacilityStaff.mockResolvedValue(false);
    const ctx = mockContext({ facilityId: 'f1' }, 'u1');

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should throw UnauthorizedException when no user', async () => {
    const ctx = mockContext({ facilityId: 'f1' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw ForbiddenException when no facilityId', async () => {
    const ctx = mockContext({}, 'u1');

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should use params.id as fallback for facilityId', async () => {
    supabase.isFacilityStaff.mockResolvedValue(true);
    const ctx = mockContext({ id: 'f2' }, 'u1');

    await guard.canActivate(ctx);

    expect(supabase.isFacilityStaff).toHaveBeenCalledWith('u1', 'f2');
  });
});
