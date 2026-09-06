import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('AuthService', () => {
  let service: AuthService;
  let supabase: {
    admin: any;
    anonClient: ReturnType<typeof vi.fn>;
    clientWithToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    supabase = {
      admin: {
        auth: {
          admin: {
            createUser: vi.fn(),
            deleteUser: vi.fn(),
          },
        },
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
        maybeSingle: vi.fn(),
      },
      anonClient: vi.fn(),
      clientWithToken: vi.fn(),
    };

    return Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: supabase },
      ],
    })
      .compile()
      .then((module) => {
        service = module.get(AuthService);
      });
  });

  describe('signup', () => {
    it('should create user and return session', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const fakeUser = { id: 'user-1', email: dto.email };
      const fakeSession = { access_token: 'tok', refresh_token: 'ref' };

      supabase.admin.auth.admin.createUser.mockResolvedValue({
        data: { user: fakeUser },
        error: null,
      });
      supabase.admin.from().select().eq().maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });
      supabase.admin.from().insert = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const anonClient = {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { session: fakeSession },
            error: null,
          }),
        },
      };
      supabase.anonClient.mockReturnValue(anonClient);

      const result = await service.signup(dto);

      expect(supabase.admin.auth.admin.createUser).toHaveBeenCalledWith({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
      });
      expect(result.user).toEqual(fakeUser);
      expect(result.session).toEqual(fakeSession);
    });

    it('should throw ConflictException for duplicate email', async () => {
      const dto = { email: 'dup@example.com', password: 'password123' };

      supabase.admin.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: { message: 'User already exists', code: 'user_already_exists' },
      });

      await expect(service.signup(dto)).rejects.toThrow(ConflictException);
    });

    it('should use email prefix as default display_name', async () => {
      const dto = { email: 'alice@example.com', password: 'password123' };

      supabase.admin.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'u1', email: dto.email } },
        error: null,
      });
      supabase.admin.from().select().eq().maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      let insertedData: any;
      supabase.admin.from().insert = vi.fn().mockImplementation((data) => {
        insertedData = data;
        return Promise.resolve({ data: null, error: null });
      });

      const anonClient = {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'tok' } },
            error: null,
          }),
        },
      };
      supabase.anonClient.mockReturnValue(anonClient);

      await service.signup(dto);

      expect(insertedData.display_name).toBe('alice');
    });

    it('should use provided display_name over email prefix', async () => {
      const dto = {
        email: 'bob@example.com',
        password: 'password123',
        display_name: 'BobTheBuilder',
      };

      supabase.admin.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'u2', email: dto.email } },
        error: null,
      });
      supabase.admin.from().select().eq().maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      let insertedData: any;
      supabase.admin.from().insert = vi.fn().mockImplementation((data) => {
        insertedData = data;
        return Promise.resolve({ data: null, error: null });
      });

      const anonClient = {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'tok' } },
            error: null,
          }),
        },
      };
      supabase.anonClient.mockReturnValue(anonClient);

      await service.signup(dto);

      expect(insertedData.display_name).toBe('BobTheBuilder');
    });

    it('should skip profile insert if player already exists', async () => {
      const dto = { email: 'existing@example.com', password: 'password123' };

      supabase.admin.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'u3', email: dto.email } },
        error: null,
      });
      supabase.admin.from().select().eq().maybeSingle.mockResolvedValue({
        data: { id: 'u3' },
        error: null,
      });

      const insertSpy = vi.fn();
      supabase.admin.from().insert = insertSpy;

      const anonClient = {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'tok' } },
            error: null,
          }),
        },
      };
      supabase.anonClient.mockReturnValue(anonClient);

      await service.signup(dto);

      expect(insertSpy).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should return user and session on valid credentials', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const fakeUser = { id: 'u1', email: dto.email };
      const fakeSession = { access_token: 'tok' };

      const anonClient = {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: fakeUser, session: fakeSession },
            error: null,
          }),
        },
      };
      supabase.anonClient.mockReturnValue(anonClient);

      const result = await service.login(dto);

      expect(anonClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: dto.email,
        password: dto.password,
      });
      expect(result.user).toEqual(fakeUser);
      expect(result.session).toEqual(fakeSession);
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      const dto = { email: 'bad@example.com', password: 'wrong' };

      const anonClient = {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Invalid login credentials' },
          }),
        },
      };
      supabase.anonClient.mockReturnValue(anonClient);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getSession', () => {
    it('should return user, profile, and is_onboarding flag', async () => {
      const token = 'valid-token';
      const fakeUser = { id: 'u1' };
      const fakeProfile = { id: 'u1', rating: 2.5 };

      const clientWithToken = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: fakeUser },
            error: null,
          }),
        },
      };
      supabase.clientWithToken.mockReturnValue(clientWithToken);
      supabase.admin.from().select().eq().single.mockResolvedValue({
        data: fakeProfile,
        error: null,
      });

      const result = await service.getSession(token);

      expect(result.user).toEqual(fakeUser);
      expect(result.profile).toEqual(fakeProfile);
      expect(result.is_onboarding).toBe(true);
    });

    it('should return is_onboarding false when rating !== 2.5', async () => {
      const token = 'valid-token';
      const fakeUser = { id: 'u1' };
      const fakeProfile = { id: 'u1', rating: 3.5 };

      const clientWithToken = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: fakeUser },
            error: null,
          }),
        },
      };
      supabase.clientWithToken.mockReturnValue(clientWithToken);
      supabase.admin.from().select().eq().single.mockResolvedValue({
        data: fakeProfile,
        error: null,
      });

      const result = await service.getSession(token);

      expect(result.is_onboarding).toBe(false);
    });

    it('should throw UnauthorizedException on invalid token', async () => {
      const clientWithToken = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid token' },
          }),
        },
      };
      supabase.clientWithToken.mockReturnValue(clientWithToken);

      await expect(service.getSession('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should return success on valid token', async () => {
      const clientWithToken = {
        auth: {
          signOut: vi.fn().mockResolvedValue({ error: null }),
        },
      };
      supabase.clientWithToken.mockReturnValue(clientWithToken);

      const result = await service.logout('valid-token');

      expect(result).toEqual({ success: true });
    });

    it('should throw UnauthorizedException on signOut error', async () => {
      const clientWithToken = {
        auth: {
          signOut: vi.fn().mockResolvedValue({
            error: { message: 'Signout failed' },
          }),
        },
      };
      supabase.clientWithToken.mockReturnValue(clientWithToken);

      await expect(service.logout('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
