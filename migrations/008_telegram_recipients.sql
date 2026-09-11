-- Several people can receive the Telegram notifications.
--
-- Previously the chat id was a single `app_setting` row, so pairing a second
-- phone silently replaced the first — the practice would think both were
-- connected while only the newer one ever got a message.
--
-- One bot, many chats: the token stays a setting, the recipients become rows.

create table if not exists telegram_recipient (
  chat_id    text        primary key,
  -- Whatever Telegram reports for the chat, so a row is recognisable.
  name       text,
  created_at timestamptz not null default now()
);

-- Carry over whoever is already paired.
insert into telegram_recipient (chat_id, name)
select value, 'اتصال قبلی'
  from app_setting
 where key = 'telegram_chat_id' and value <> ''
on conflict (chat_id) do nothing;

delete from app_setting where key = 'telegram_chat_id';
