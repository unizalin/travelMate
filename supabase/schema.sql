-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trips table
create table trips (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  created_by uuid references profiles(id) not null,
  invite_code text unique default substr(md5(random()::text), 0, 7),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trip Members table
create table trip_members (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references trips(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role text not null check (role in ('organizer', 'member')),
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(trip_id, user_id)
);

-- Itineraries table
create table itineraries (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references trips(id) on delete cascade not null,
  day_number integer not null,
  date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Activities table
create table activities (
  id uuid default uuid_generate_v4() primary key,
  itinerary_id uuid references itineraries(id) on delete cascade not null,
  name text not null,
  location text,
  order_index integer not null,
  duration integer, -- in minutes
  notes text,
  image_url text,
  created_by uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Expenses table
create table expenses (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references trips(id) on delete cascade not null,
  name text not null,
  amount numeric not null,
  currency text not null default 'TWD',
  category text not null,
  expense_type text not null check (expense_type in ('shared', 'personal')),
  paid_by uuid references profiles(id) not null,
  receipt_url text,
  split_members jsonb not null default '[]'::jsonb, -- Array of {user_id, amount}
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Expense Payments table (Track who needs to pay whom)
create table expense_payments (
  id uuid default uuid_generate_v4() primary key,
  expense_id uuid references expenses(id) on delete cascade not null,
  payer_id uuid references profiles(id) not null, -- Who needs to pay
  amount numeric not null,
  is_paid boolean default false,
  paid_at timestamp with time zone
);

-- RLS Policies

-- Enable RLS
alter table profiles enable row level security;
alter table trips enable row level security;
alter table trip_members enable row level security;
alter table itineraries enable row level security;
alter table activities enable row level security;
alter table expenses enable row level security;
alter table expense_payments enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- Trips policies
create policy "Users can view trips they are members of"
  on trips for select
  using (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = trips.id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "Users can create trips"
  on trips for insert
  with check ( auth.uid() = created_by );

create policy "Organizers can update trips"
  on trips for update
  using (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = trips.id
      and trip_members.user_id = auth.uid()
      and trip_members.role = 'organizer'
    )
  );

-- Trip Members policies
create policy "Members can view other members of same trip"
  on trip_members for select
  using (
    exists (
      select 1 from trip_members as tm
      where tm.trip_id = trip_members.trip_id
      and tm.user_id = auth.uid()
    )
  );

create policy "Organizers can add members"
  on trip_members for insert
  with check (
    exists (
      select 1 from trip_members as tm
      where tm.trip_id = trip_members.trip_id
      and tm.user_id = auth.uid()
      and tm.role = 'organizer'
    )
  );

-- Itineraries policies
create policy "Members can view itineraries"
  on itineraries for select
  using (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = itineraries.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "Members can create itineraries (usually auto-created)"
  on itineraries for insert
  with check (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = itineraries.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

-- Activities policies
create policy "Members can view activities"
  on activities for select
  using (
    exists (
      select 1 from itineraries
      join trip_members on trip_members.trip_id = itineraries.trip_id
      where itineraries.id = activities.itinerary_id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "Members can insert activities"
  on activities for insert
  with check (
    exists (
      select 1 from itineraries
      join trip_members on trip_members.trip_id = itineraries.trip_id
      where itineraries.id = activities.itinerary_id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "Members can update activities"
  on activities for update
  using (
    exists (
      select 1 from itineraries
      join trip_members on trip_members.trip_id = itineraries.trip_id
      where itineraries.id = activities.itinerary_id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "Members can delete activities"
  on activities for delete
  using (
    exists (
      select 1 from itineraries
      join trip_members on trip_members.trip_id = itineraries.trip_id
      where itineraries.id = activities.itinerary_id
      and trip_members.user_id = auth.uid()
    )
  );

-- Expenses policies
create policy "Members can view expenses"
  on expenses for select
  using (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = expenses.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "Members can create expenses"
  on expenses for insert
  with check (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = expenses.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

-- Expense Payments policies
create policy "Members can view payments"
  on expense_payments for select
  using (
    exists (
      select 1 from expenses
      join trip_members on trip_members.trip_id = expenses.trip_id
      where expenses.id = expense_payments.expense_id
      and trip_members.user_id = auth.uid()
    )
  );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Realtime
alter publication supabase_realtime add table activities;
alter publication supabase_realtime add table expenses;
