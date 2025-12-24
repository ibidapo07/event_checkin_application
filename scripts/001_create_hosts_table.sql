-- Create hosts table for birthday party management
create table if not exists public.hosts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  section_name text not null,
  guest_capacity integer not null check (guest_capacity > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.hosts enable row level security;

-- Create policies for public access (since this is a simple party planner)
-- You can modify these policies later if you need user-specific access
create policy "Anyone can view hosts"
  on public.hosts for select
  using (true);

create policy "Anyone can insert hosts"
  on public.hosts for insert
  with check (true);

create policy "Anyone can update hosts"
  on public.hosts for update
  using (true);

create policy "Anyone can delete hosts"
  on public.hosts for delete
  using (true);
