import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../../supabase/supabase.service.js';

type AuthenticatedRequest = Request & {
  user?: { id: string };
};

@Injectable()
export class FacilityStaffGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id;
    const facilityId = request.params.facilityId ?? request.params.id;

    if (!userId) {
      throw new UnauthorizedException('Authentication is required');
    }

    if (typeof facilityId !== 'string' || !facilityId) {
      throw new ForbiddenException('A facility ID is required');
    }

    const isStaff = await this.supabaseService.isFacilityStaff(
      userId,
      facilityId,
    );

    if (!isStaff) {
      throw new ForbiddenException('Facility staff access is required');
    }

    return true;
  }
}
