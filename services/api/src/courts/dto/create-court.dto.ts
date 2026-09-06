import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCourtDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  facility_id!: string;

  @IsOptional()
  @IsString()
  surface_type?: string;
}
