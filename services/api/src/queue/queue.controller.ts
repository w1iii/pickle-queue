import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { JoinQueueDto } from './dto/join-queue.dto.js';
import { MatchingService } from './matching.service.js';
import { QueueService } from './queue.service.js';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('queue')
@UseGuards(JwtAuthGuard)
export class QueueController {
  constructor(
    private readonly queueService: QueueService,
    private readonly matchingService: MatchingService,
  ) {}

  @Post('join')
  join(@Req() request: AuthenticatedRequest, @Body() dto: JoinQueueDto) {
    return this.queueService.join(request.user.id, dto);
  }

  @Post('leave')
  leave(
    @Req() request: AuthenticatedRequest,
    @Body('facility_id') facilityId: string,
  ) {
    return this.queueService.leave(request.user.id, facilityId);
  }

  @Get('status/:facilityId')
  getStatus(@Req() request: AuthenticatedRequest, @Req() req: any) {
    return this.queueService.getStatus(req.params.facilityId);
  }

  @Post('match/:facilityId')
  triggerMatch(@Req() req: any) {
    return this.matchingService.runMatch(req.params.facilityId);
  }
}
