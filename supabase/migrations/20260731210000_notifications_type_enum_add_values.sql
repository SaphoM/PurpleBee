-- notifications.type is a Postgres enum. The 4 new NotificationType values
-- added to the app (task-reopened, task-updated, attachment-added,
-- project-updated) were missed when that feature shipped — every insert
-- of these types was silently failing until this migration. New enum
-- values can't be added inside the same transaction they're used in, so
-- this is deliberately its own migration.
do $$
declare
  enum_type text := (select udt_name from information_schema.columns where table_name='notifications' and column_name='type');
begin
  execute format('alter type %I add value if not exists %L', enum_type, 'task-reopened');
  execute format('alter type %I add value if not exists %L', enum_type, 'task-updated');
  execute format('alter type %I add value if not exists %L', enum_type, 'attachment-added');
  execute format('alter type %I add value if not exists %L', enum_type, 'project-updated');
end $$;
