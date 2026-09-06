export type PlayerSkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'pro';

export class Player {
  id!: string;
  display_name!: string;
  email!: string | null;
  phone!: string | null;
  avatar_url!: string | null;
  rating!: number;
  rating_dev!: number;
  skill_level!: PlayerSkillLevel | null;
  total_games!: number;
  win_streak!: number;
  is_active!: boolean;
  created_at!: string;
  updated_at!: string;
}
