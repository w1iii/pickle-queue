-- Add missing columns that code expects but initial migration omitted.

-- Facilities: add owner_id and updated_at
alter table facilities add column owner_id uuid references auth.users(id);
alter table facilities add column updated_at timestamptz not null default now();

-- Courts: add updated_at
alter table courts add column updated_at timestamptz not null default now();

-- Index for owner lookups
create index idx_facilities_owner on facilities(owner_id);
