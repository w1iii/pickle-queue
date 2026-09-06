import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import type { PlayerSkillLevel } from '../entities/player.entity.js';

export class UpdatePlayerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  display_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUrl()
  avatar_url?: string;

  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'advanced', 'pro'])
  skill_level?: PlayerSkillLevel;
}
