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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CreateCourtDto } from './dto/create-court.dto.js';
import { UpdateCourtDto } from './dto/update-court.dto.js';
import { CourtsService } from './courts.service.js';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('courts')
@UseGuards(JwtAuthGuard)
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateCourtDto) {
    return this.courtsService.create(request.user.id, dto);
  }

  @Get()
  findByFacility(@Query('facilityId') facilityId: string) {
    return this.courtsService.findByFacility(facilityId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courtsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCourtDto,
  ) {
    return this.courtsService.update(request.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.courtsService.remove(request.user.id, id);
  }
}
