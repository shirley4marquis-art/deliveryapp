create table if not exists public.telegram_admin_chats (
  chat_id text primary key,
  admin_user_id uuid not null references public.admin_users(user_id) on delete cascade,
  admin_email text not null,
  authorized_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.telegram_admin_chats enable row level security;

comment on table public.telegram_admin_chats is
  'Telegram chats authorized by a verified Royal Runs admin login. Service-role access only.';
