import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard.js';
import { SupabaseService } from './supabase.services.js';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';

function mockContext(token?: string) {
  const req: any = { headers: {} };
  if (token) req.headers.authorization = `Bearer ${token}`;
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as ExecutionContext;
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let supabase: { getUser: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    supabase = { getUser: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: SupabaseService, useValue: supabase },
      ],
    }).compile();

    guard = module.get(AuthGuard);
  });

  it('should allow valid token', async () => {
    const fakeUser = { id: 'u1' };
    supabase.getUser.mockResolvedValue(fakeUser);

    const ctx = mockContext('valid-token');
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException when no token', async () => {
    await expect(guard.canActivate(mockContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException on invalid token', async () => {
    supabase.getUser.mockRejectedValue(new Error('Invalid access token'));

    await expect(guard.canActivate(mockContext('bad'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should attach user to request', async () => {
    const fakeUser = { id: 'u1' };
    supabase.getUser.mockResolvedValue(fakeUser);

    const req: any = { headers: { authorization: 'Bearer my-tok' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as ExecutionContext;

    await guard.canActivate(ctx);

    expect(req.user).toEqual(fakeUser);
    expect(req.token).toBe('my-tok');
  });
});
