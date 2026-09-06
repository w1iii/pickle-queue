import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { SignupDto } from './dto/signup.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseService) {}

  async signup(dto: SignupDto) {
    const client = this.supabase.admin;

    const { data: authData, error: authError } = await client.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message?.includes('already') || authError.code === 'user_already_exists') {
        throw new ConflictException('Account already exists. Please log in.');
      }
      throw new UnauthorizedException(authError.message);
    }

    // Check if player profile already exists (from a partial previous signup)
    const { data: existingPlayer } = await client
      .from('players')
      .select('id')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (!existingPlayer) {
      const { error: profileError } = await client.from('players').insert({
        id: authData.user.id,
        display_name: dto.display_name ?? dto.email.split('@')[0],
        email: dto.email,
      });

      if (profileError) {
        if (profileError.code === '23505') {
          // Player already exists despite check — race condition, not fatal
        } else {
          await client.auth.admin.deleteUser(authData.user.id);
          throw new UnauthorizedException(profileError.message);
        }
      }
    }

    // Sign in to get a real session token
    const anonClient = this.supabase.anonClient();
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (signInError) {
      return { user: authData.user, session: null };
    }

    return { user: authData.user, session: signInData.session };
  }

  async login(dto: LoginDto) {
    const client = this.supabase.anonClient();

    const { data, error } = await client.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return { user: data.user, session: data.session };
  }

  async getSession(token: string) {
    const client = this.supabase.clientWithToken(token);

    const { data, error } = await client.auth.getUser();

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const { data: profile } = await this.supabase.admin
      .from('players')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return {
      user: data.user,
      profile,
      is_onboarding: profile?.rating === 2.5,
    };
  }

  async logout(token: string) {
    const client = this.supabase.clientWithToken(token);

    const { error } = await client.auth.signOut();

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return { success: true };
  }
}
