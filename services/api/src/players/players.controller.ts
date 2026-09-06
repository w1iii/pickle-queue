import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CreatePlayerDto } from './dto/create-player.dto.js';
import { UpdatePlayerDto } from './dto/update-player.dto.js';
import { PlayersService } from './players.service.js';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get('leaderboard')
  getLeaderboard(@Query('facilityId') facilityId?: string) {
    return this.playersService.getLeaderboard(facilityId);
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreatePlayerDto) {
    return this.playersService.create(request.user.id, dto);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.playersService.getStats(id);
  }

  @Get(':id/rating-history')
  getRatingHistory(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.playersService.getRatingHistory(request.user.id, id);
  }

  @Get(':id')
  getProfile(@Param('id') id: string) {
    return this.playersService.findOne(id);
  }

  @Patch(':id')
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdatePlayerDto,
  ) {
    return this.playersService.update(request.user.id, id, dto);
  }
}
