import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { CreateFacilityDto } from './dto/create-facility.dto.js';
import { UpdateFacilityDto } from './dto/update-facility.dto.js';

@Injectable()
export class FacilitiesService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(userId: string, dto: CreateFacilityDto) {
    const { data, error } = await this.supabase.admin
      .from('facilities')
      .insert({ owner_id: userId, ...dto })
      .select()
      .single();

    if (error) {
      throw new ForbiddenException(error.message);
    }

    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase.admin
      .from('facilities')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new NotFoundException('Unable to load facilities');
    }

    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.admin
      .from('facilities')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Facility not found');
    }

    return data;
  }

  async findByOwner(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('facilities')
      .select('*')
      .eq('owner_id', userId)
      .order('name');

    if (error) {
      throw new NotFoundException('Unable to load facilities');
    }

    return data;
  }

  async update(userId: string, id: string, dto: UpdateFacilityDto) {
    await this.assertOwnership(userId, id);

    const { data, error } = await this.supabase.admin
      .from('facilities')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Facility not found');
    }

    return data;
  }

  async remove(userId: string, id: string) {
    await this.assertOwnership(userId, id);

    const { data, error } = await this.supabase.admin
      .from('facilities')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Facility not found');
    }

    return data;
  }

  private async assertOwnership(userId: string, facilityId: string) {
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
        'You can only modify your own facilities',
      );
    }
  }
}
