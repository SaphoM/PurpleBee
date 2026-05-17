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

  const { user_id, type, title, message, task_id, conversation_id } =
    await req.json();

  if (!user_id || !type || !title || !message) {
    return new Response(
      JSON.stringify({
        error: "user_id, type, title, and message are required",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const validTypes = [
    "task-assigned",
    "task-due",
    "task-completed",
    "mention",
    "update",
    "ai-insight",
    "project-invite",
  ];

  if (!validTypes.includes(type)) {
    return new Response(
      JSON.stringify({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id,
      type,
      title,
      message,
      task_id: task_id ?? null,
      conversation_id: conversation_id ?? null,
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ notification: data }), {
    headers: { "Content-Type": "application/json" },
  });
});
