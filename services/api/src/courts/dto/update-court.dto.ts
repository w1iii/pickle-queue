import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCourtDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  surface_type?: string;
}
