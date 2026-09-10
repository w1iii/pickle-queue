import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { QrService } from './qr.service.js';

type AuthenticatedRequest = Request & { user: { id: string } };
type CheckInBody = { token: string };

@Controller('queue')
@UseGuards(JwtAuthGuard)
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Post(':facilityId/check-in')
  checkIn(
    @Param('facilityId') facilityId: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: CheckInBody,
  ) {
    return this.qrService.checkIn(facilityId, request.user.id, body.token);
  }
}
