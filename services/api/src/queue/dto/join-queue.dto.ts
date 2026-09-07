import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class JoinQueueDto {
  @IsString()
  @IsNotEmpty()
  facility_id!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preference_tags?: string[];

  @IsOptional()
  @IsString()
  device_push_token?: string;
}
