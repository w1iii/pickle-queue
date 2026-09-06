import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CreateFacilityDto } from './dto/create-facility.dto.js';
import { UpdateFacilityDto } from './dto/update-facility.dto.js';
import { FacilitiesService } from './facilities.service.js';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('facilities')
@UseGuards(JwtAuthGuard)
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateFacilityDto,
  ) {
    return this.facilitiesService.create(request.user.id, dto);
  }

  @Get()
  findAll() {
    return this.facilitiesService.findAll();
  }

  @Get('mine')
  findMine(@Req() request: AuthenticatedRequest) {
    return this.facilitiesService.findByOwner(request.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.facilitiesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateFacilityDto,
  ) {
    return this.facilitiesService.update(request.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.facilitiesService.remove(request.user.id, id);
  }
}
