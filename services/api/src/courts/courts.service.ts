import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { CreateCourtDto } from './dto/create-court.dto.js';
import { UpdateCourtDto } from './dto/update-court.dto.js';

@Injectable()
export class CourtsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(userId: string, dto: CreateCourtDto) {
    await this.assertFacilityOwnership(userId, dto.facility_id);

    const { data, error } = await this.supabase.admin
      .from('courts')
      .insert(dto)
      .select()
      .single();

    if (error) {
      throw new ForbiddenException(error.message);
    }

    return data;
  }

  async findByFacility(facilityId: string) {
    const { data, error } = await this.supabase.admin
      .from('courts')
      .select('*')
      .eq('facility_id', facilityId)
      .order('name');

    if (error) {
      throw new NotFoundException('Unable to load courts');
    }

    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.admin
      .from('courts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Court not found');
    }

    return data;
  }

  async update(userId: string, id: string, dto: UpdateCourtDto) {
    const court = await this.findOne(id);
    await this.assertFacilityOwnership(userId, court.facility_id);

    const { data, error } = await this.supabase.admin
      .from('courts')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Court not found');
    }

    return data;
  }

  async remove(userId: string, id: string) {
    const court = await this.findOne(id);
    await this.assertFacilityOwnership(userId, court.facility_id);

    const { data, error } = await this.supabase.admin
      .from('courts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Court not found');
    }

    return data;
  }

  private async assertFacilityOwnership(userId: string, facilityId: string) {
    const { data, error } = await this.supabase.admin
      .from('facilities')
      .select('owner_id')
      .eq('id', facilityId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Facility not found');
    }

    if (data.owner_id !== userId) {
      throw new ForbiddenException(
        'You can only manage courts at your own facilities',
      );
    }
  }
}
