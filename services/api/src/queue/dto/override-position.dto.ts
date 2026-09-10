import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class OverridePositionDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  new_position!: number;
}
