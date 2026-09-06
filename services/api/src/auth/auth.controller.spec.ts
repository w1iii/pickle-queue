import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    signup: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authService = {
      signup: vi.fn(),
      login: vi.fn(),
      getSession: vi.fn(),
      logout: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: SupabaseService, useValue: { getUser: vi.fn() } },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  it('should delegate signup to service', async () => {
    const dto = { email: 'a@b.com', password: 'test-password' };
    const expected = { user: {}, session: {} };
    authService.signup.mockResolvedValue(expected);

    const result = await controller.signup(dto);

    expect(authService.signup).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('should delegate login to service', async () => {
    const dto = { email: 'a@b.com', password: 'test-password' };
    const expected = { user: {}, session: {} };
    authService.login.mockResolvedValue(expected);

    const result = await controller.login(dto);

    expect(authService.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('should delegate getMe to service with token', async () => {
    const req = { token: 'my-token' };
    const expected = { user: {}, profile: {}, is_onboarding: true };
    authService.getSession.mockResolvedValue(expected);

    const result = await controller.getMe(req);

    expect(authService.getSession).toHaveBeenCalledWith('my-token');
    expect(result).toEqual(expected);
  });

  it('should delegate logout to service with token', async () => {
    const req = { token: 'my-token' };
    authService.logout.mockResolvedValue({ success: true });

    const result = await controller.logout(req);

    expect(authService.logout).toHaveBeenCalledWith('my-token');
    expect(result).toEqual({ success: true });
  });
});
