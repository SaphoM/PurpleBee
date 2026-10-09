-- Wires real Telegram delivery for in-app notifications: a second,
-- independent AFTER INSERT trigger on public.notifications (sibling to
-- notify_email_on_notification_insert) asynchronously calls the
-- send-telegram-notification edge function via pg_net. The function itself
-- no-ops until TELEGRAM_BOT_TOKEN is configured, and any failure here is
-- caught so it can never block the in-app notification row or the email
-- trigger — both fire independently off the same INSERT.
create or replace function public.notify_telegram_on_notification_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform net.http_post(
      url := 'https://sudkymxnzuiubnszpxbc.supabase.co/functions/v1/send-telegram-notification',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'notifications',
        'record', to_jsonb(NEW)
      )
    );
  exception when others then
    raise warning 'notify_telegram_on_notification_insert failed: %', sqlerrm;
  end;
  return NEW;
end;
$$;

drop trigger if exists notifications_telegram_trigger on public.notifications;
create trigger notifications_telegram_trigger
  after insert on public.notifications
  for each row
  execute function public.notify_telegram_on_notification_insert();
