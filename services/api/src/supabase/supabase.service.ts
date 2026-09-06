import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private adminClient!: SupabaseClient;
  private anonClientInstance!: SupabaseClient;

  onModuleInit() {
    const url = process.env.SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const anonKey = process.env.SUPABASE_ANON_KEY!;

    this.adminClient = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    });
    this.anonClientInstance = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    });
  }

  get admin(): SupabaseClient {
    return this.adminClient;
  }

  anonClient(): SupabaseClient {
    return this.anonClientInstance;
  }

  clientWithToken(token: string): SupabaseClient {
    return createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
  }

  async getUser(accessToken: string): Promise<User> {
    const { data, error } = await this.anonClientInstance.auth.getUser(accessToken);
    if (error || !data.user) {
      throw new Error('Invalid access token');
    }
    return data.user;
  }

  async isFacilityStaff(userId: string, facilityId: string): Promise<boolean> {
    const { data, error } = await this.adminClient
      .from('facility_staff')
      .select('id')
      .eq('user_id', userId)
      .eq('facility_id', facilityId)
      .maybeSingle();

    if (error) {
      throw new Error('Unable to verify facility staff membership');
    }
    return data !== null;
  }
}
