-- Wires real email delivery for in-app notifications: an AFTER INSERT
-- trigger on public.notifications asynchronously calls the
-- send-email-notification edge function via pg_net (Supabase's async HTTP
-- extension). The function itself no-ops until a RESEND_API_KEY secret is
-- configured, and any failure here is caught so it can never block the
-- in-app notification row (the actual bell/dropdown) from being created.
create extension if not exists pg_net;

create or replace function public.notify_email_on_notification_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform net.http_post(
      url := 'https://sudkymxnzuiubnszpxbc.supabase.co/functions/v1/send-email-notification',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'notifications',
        'record', to_jsonb(NEW)
      )
    );
  exception when others then
    raise warning 'notify_email_on_notification_insert failed: %', sqlerrm;
  end;
  return NEW;
end;
$$;

drop trigger if exists notifications_email_trigger on public.notifications;
create trigger notifications_email_trigger
  after insert on public.notifications
  for each row
  execute function public.notify_email_on_notification_insert();
