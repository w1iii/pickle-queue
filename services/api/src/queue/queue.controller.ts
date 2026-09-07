import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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

  @Delete('leave')
  leave(
    @Req() request: AuthenticatedRequest,
    @Body('facility_id') facilityId: string,
  ) {
    return this.queueService.leave(request.user.id, facilityId);
  }

  @Get('status')
  getOwnStatus(@Req() request: AuthenticatedRequest) {
    return this.queueService.getOwnStatus(request.user.id);
  }

  @Get(':facilityId')
  getQueueList(@Param('facilityId') facilityId: string) {
    return this.queueService.getStatus(facilityId);
  }

  @Get(':facilityId/wait-time')
  getWaitTime(@Param('facilityId') facilityId: string) {
    return this.queueService.getWaitTime(facilityId);
  }

  @Post('match/:facilityId')
  triggerMatch(@Param('facilityId') facilityId: string) {
    return this.matchingService.runMatch(facilityId);
  }
}
