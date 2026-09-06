import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;
  private readonly serviceRoleClient: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey || !serviceRoleKey) {
      throw new Error(
        'SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY must be configured',
      );
    }

    this.client = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    this.serviceRoleClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }

  async getUser(accessToken: string): Promise<User> {
    const { data, error } = await this.client.auth.getUser(accessToken);

    if (error || !data.user) {
      throw new Error('Invalid access token');
    }

    return data.user;
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  async isFacilityStaff(userId: string, facilityId: string): Promise<boolean> {
    const { data, error } = await this.serviceRoleClient
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
