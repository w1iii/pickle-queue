export class Facility {
  id!: string;
  name!: string;
  address!: string | null;
  phone!: string | null;
  email!: string | null;
  website_url!: string | null;
  logo_url!: string | null;
  owner_id!: string;
  is_active!: boolean;
  created_at!: string;
  updated_at!: string;
}
