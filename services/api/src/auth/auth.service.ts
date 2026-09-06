import { Injectable, UnauthorizedException } from '@nestjs/common';
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
      throw new UnauthorizedException(authError.message);
    }

    const { error: profileError } = await client.from('players').insert({
      id: authData.user.id,
      display_name: dto.display_name ?? dto.email.split('@')[0],
      email: dto.email,
    });

    if (profileError) {
      await client.auth.admin.deleteUser(authData.user.id);
      throw new UnauthorizedException(profileError.message);
    }

    const { data: session, error: sessionError } = await client.auth.admin.generateLink({
      type: 'magiclink',
      email: dto.email,
    });

    if (sessionError) {
      return { user: authData.user, session: null };
    }

    return { user: authData.user, session };
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

    return { user: data.user, profile };
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
