-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Creates the tables that replace the old Railway flat-file storage.
--
-- RLS is enabled with no policies on every table, so the anon/public key
-- can't read or write anything. All real access goes through the server
-- using the service_role key, which bypasses RLS entirely by design.

create table if not exists categories (
  name text primary key
);
alter table categories enable row level security;

create table if not exists brands (
  id text primary key,
  name text not null unique,
  type text not null default 'active' check (type in ('active', 'passive')),
  logo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table brands enable row level security;

create table if not exists products (
  id text primary key,
  name text not null,
  category text not null default 'Uncategorised',
  brand text not null default '',
  sku text not null default '',
  price text not null default '',
  in_stock boolean not null default true,
  featured boolean not null default false,
  specs jsonb not null default '[]',
  description text not null default '',
  images jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table products enable row level security;

-- Settings is a single-row key-value blob (matches the old settings.json
-- shape exactly, including the nested "socials" object), so admin UI code
-- doesn't need to change field-by-field.
create table if not exists settings (
  id int primary key default 1,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);
alter table settings enable row level security;
insert into settings (id, data) values (1, '{}') on conflict (id) do nothing;
