import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { FacilityStaffGuard } from '../common/guards/facility-staff.guard.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { JoinQueueDto } from './dto/join-queue.dto.js';
import { ManualAddPlayerDto } from './dto/manual-add-player.dto.js';
import { OverridePositionDto } from './dto/override-position.dto.js';
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
    @Query('facility_id') facilityId: string,
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

  @Post(':facilityId/manual-add')
  @UseGuards(FacilityStaffGuard)
  manualAdd(
    @Param('facilityId') facilityId: string,
    @Body() dto: ManualAddPlayerDto,
  ) {
    return this.queueService.manualAdd(facilityId, dto);
  }

  @Patch(':entryId/override')
  @UseGuards(FacilityStaffGuard)
  overridePosition(
    @Param('entryId') entryId: string,
    @Body() dto: OverridePositionDto,
  ) {
    return this.queueService.overridePosition(entryId, dto.new_position);
  }

  @Post(':facilityId/force-match')
  @UseGuards(FacilityStaffGuard)
  forceMatch(@Param('facilityId') facilityId: string) {
    return this.matchingService.runMatch(facilityId);
  }

  @Post('match/:facilityId')
  triggerMatch(@Param('facilityId') facilityId: string) {
    return this.matchingService.runMatch(facilityId);
  }
}
