import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: dueSoonTasks, error } = await supabase
    .from("tasks")
    .select("id, title, due_date, assigned_to, priority")
    .neq("status", "completed")
    .not("due_date", "is", null)
    .lte("due_date", in24Hours.toISOString())
    .gte("due_date", now.toISOString());

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const notifications = [];

  for (const task of dueSoonTasks ?? []) {
    if (!task.assigned_to) continue;

    const hoursLeft = Math.round(
      (new Date(task.due_date).getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    const { error: insertError } = await supabase
      .from("notifications")
      .insert({
        user_id: task.assigned_to,
        type: "task-due",
        title: "Task due soon",
        message: `"${task.title}" is due in ${hoursLeft} hour${hoursLeft !== 1 ? "s" : ""}`,
        task_id: task.id,
      });

    if (!insertError) {
      notifications.push({ task_id: task.id, user_id: task.assigned_to });
    }
  }

  return new Response(
    JSON.stringify({
      processed: dueSoonTasks?.length ?? 0,
      notifications_sent: notifications.length,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
