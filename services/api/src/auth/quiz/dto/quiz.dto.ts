import { IsBoolean } from 'class-validator';

export class QuizDto {
  @IsBoolean()
  serveBehindBaseline!: boolean;

  @IsBoolean()
  knowKitchenRules!: boolean;

  @IsBoolean()
  sustainDinkRally10Plus!: boolean;

  @IsBoolean()
  playedOrganizedLeague!: boolean;

  @IsBoolean()
  comfortableWithSpinServe!: boolean;
}
