import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsIn,
} from 'class-validator';
import type { PlayerSkillLevel } from '../entities/player.entity.js';

export class CreatePlayerDto {
  @IsString()
  @IsNotEmpty()
  display_name!: string;

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
