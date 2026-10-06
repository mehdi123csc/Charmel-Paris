-- ============================================================
-- CHARMEL PARIS - ADMIN DATABASE
-- Run this entire file once in Supabase SQL Editor.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Profiles / admin role
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read"
on public.profiles for select
to authenticated
using (id = auth.uid());

-- Helper: only an authenticated user whose profile role is admin.
create or replace function public.is_charmel_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_charmel_admin() from public;
grant execute on function public.is_charmel_admin() to authenticated;

-- ------------------------------------------------------------
-- Services
-- ------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  price numeric(10,2),
  currency text not null default 'QAR',
  image_url text default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services enable row level security;

drop policy if exists "services_public_read" on public.services;
create policy "services_public_read"
on public.services for select
to anon, authenticated
using (active = true or public.is_charmel_admin());

drop policy if exists "services_admin_insert" on public.services;
create policy "services_admin_insert"
on public.services for insert
to authenticated
with check (public.is_charmel_admin());

drop policy if exists "services_admin_update" on public.services;
create policy "services_admin_update"
on public.services for update
to authenticated
using (public.is_charmel_admin())
with check (public.is_charmel_admin());

drop policy if exists "services_admin_delete" on public.services;
create policy "services_admin_delete"
on public.services for delete
to authenticated
using (public.is_charmel_admin());

-- ------------------------------------------------------------
-- Gallery
-- ------------------------------------------------------------
create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  title text default '',
  image_url text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.gallery enable row level security;

drop policy if exists "gallery_public_read" on public.gallery;
create policy "gallery_public_read"
on public.gallery for select
to anon, authenticated
using (active = true or public.is_charmel_admin());

drop policy if exists "gallery_admin_insert" on public.gallery;
create policy "gallery_admin_insert"
on public.gallery for insert
to authenticated
with check (public.is_charmel_admin());

drop policy if exists "gallery_admin_update" on public.gallery;
create policy "gallery_admin_update"
on public.gallery for update
to authenticated
using (public.is_charmel_admin())
with check (public.is_charmel_admin());

drop policy if exists "gallery_admin_delete" on public.gallery;
create policy "gallery_admin_delete"
on public.gallery for delete
to authenticated
using (public.is_charmel_admin());

-- ------------------------------------------------------------
-- Bookings
-- ------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  service_id uuid references public.services(id) on delete set null,
  service_name text not null,
  booking_date date not null,
  booking_time time not null,
  message text default '',
  status text not null default 'new'
    check (status in ('new','confirmed','completed','cancelled')),
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

-- Visitors can create a booking, but cannot read other bookings.
drop policy if exists "bookings_public_insert" on public.bookings;
create policy "bookings_public_insert"
on public.bookings for insert
to anon, authenticated
with check (
  length(trim(name)) between 2 and 120
  and length(trim(phone)) between 5 and 40
  and length(trim(service_name)) between 1 and 120
);

drop policy if exists "bookings_admin_read" on public.bookings;
create policy "bookings_admin_read"
on public.bookings for select
to authenticated
using (public.is_charmel_admin());

drop policy if exists "bookings_admin_update" on public.bookings;
create policy "bookings_admin_update"
on public.bookings for update
to authenticated
using (public.is_charmel_admin())
with check (public.is_charmel_admin());

drop policy if exists "bookings_admin_delete" on public.bookings;
create policy "bookings_admin_delete"
on public.bookings for delete
to authenticated
using (public.is_charmel_admin());

-- ------------------------------------------------------------
-- Helpful indexes
-- ------------------------------------------------------------
create index if not exists bookings_date_idx
on public.bookings(booking_date, booking_time);

create index if not exists bookings_status_idx
on public.bookings(status);

create index if not exists services_sort_idx
on public.services(sort_order);

create index if not exists gallery_sort_idx
on public.gallery(sort_order);

-- ------------------------------------------------------------
-- Seed services
-- ------------------------------------------------------------
insert into public.services
(name, description, price, currency, active, sort_order)
select * from (values
  ('الشعر','قص، تسريح، صبغات، علاجات وتصفيف للمناسبات.',250,'QAR',true,1),
  ('المكياج','إطلالات راقية للمناسبات والأعراس والجلسات الخاصة.',300,'QAR',true,2),
  ('الأظافر','مانيكير، باديكير وتصاميم أنيقة بأعلى عناية.',150,'QAR',true,3),
  ('الرموش والحواجب','تحديد وتجميل الرموش والحواجب لإطلالة أكثر جمالاً.',120,'QAR',true,4),
  ('العناية بالبشرة','جلسات عناية وتنظيف وترطيب لبشرة مشرقة.',220,'QAR',true,5),
  ('إطلالة متكاملة','باقة مخصصة تجمع أكثر من خدمة في تجربة واحدة.',500,'QAR',true,6)
) as v(name,description,price,currency,active,sort_order)
where not exists (select 1 from public.services);

-- ------------------------------------------------------------
-- IMPORTANT: create your admin user first in
-- Supabase -> Authentication -> Users.
-- Then replace YOUR-USER-UUID and run:
--
-- insert into public.profiles (id, full_name, role)
-- values ('YOUR-USER-UUID','Charmel Admin','admin')
-- on conflict (id) do update set role='admin';
--
-- Never put a service_role key in the website.
-- ============================================================


-- ------------------------------------------------------------
-- Supabase Storage bucket for salon images
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('salon-images', 'salon-images', true)
on conflict (id) do update set public = true;

drop policy if exists "salon_images_public_read" on storage.objects;
create policy "salon_images_public_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'salon-images');

drop policy if exists "salon_images_admin_insert" on storage.objects;
create policy "salon_images_admin_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'salon-images'
  and public.is_charmel_admin()
);

drop policy if exists "salon_images_admin_update" on storage.objects;
create policy "salon_images_admin_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'salon-images'
  and public.is_charmel_admin()
)
with check (
  bucket_id = 'salon-images'
  and public.is_charmel_admin()
);

drop policy if exists "salon_images_admin_delete" on storage.objects;
create policy "salon_images_admin_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'salon-images'
  and public.is_charmel_admin()
);
