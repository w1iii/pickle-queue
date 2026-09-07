import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class QueueStatusResponseDto {
  @IsString()
  @IsNotEmpty()
  facility_id!: string;

  @IsNumber()
  total_waiting!: number;

  @IsNumber()
  total_matched!: number;

  @IsNumber()
  total_playing!: number;

  @IsArray()
  entries!: Record<string, unknown>[];

  @IsOptional()
  @IsIn(['fifo', 'skill_based', 'random'])
  algorithm?: string;
}
