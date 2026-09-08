import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ManualAddPlayerDto {
  @IsString()
  @IsNotEmpty()
  player_id!: string;

  @IsOptional()
  @IsString()
  partner_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preference_tags?: string[];
}
