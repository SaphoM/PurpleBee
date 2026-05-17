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

  const { user_id } = await req.json();

  if (!user_id) {
    return new Response(JSON.stringify({ error: "user_id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const now = new Date();
  const insights = [];

  // Check for overdue tasks
  const { data: overdueTasks } = await supabase
    .from("tasks")
    .select("id, title, due_date, priority")
    .or(`assigned_to.eq.${user_id},created_by.eq.${user_id}`)
    .neq("status", "completed")
    .not("due_date", "is", null)
    .lt("due_date", now.toISOString());

  if (overdueTasks && overdueTasks.length > 0) {
    const urgentCount = overdueTasks.filter(
      (t) => t.priority === "urgent" || t.priority === "high"
    ).length;

    insights.push({
      user_id,
      type: "warning",
      title: "Overdue tasks need attention",
      message: `You have ${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? "s" : ""}${urgentCount > 0 ? `, including ${urgentCount} high-priority` : ""}. Consider reprioritizing or updating deadlines.`,
      actionable: true,
      suggested_action: "Review and update overdue tasks",
      confidence: 95,
    });
  }

  // Check workload balance
  const { data: inProgressTasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("assigned_to", user_id)
    .eq("status", "in-progress");

  if (inProgressTasks && inProgressTasks.length > 5) {
    insights.push({
      user_id,
      type: "suggestion",
      title: "High workload detected",
      message: `You have ${inProgressTasks.length} tasks in progress. Consider completing some before starting new ones to maintain focus.`,
      actionable: true,
      suggested_action: "Focus on completing current tasks",
      confidence: 80,
    });
  }

  // Check completion rate this week
  const { data: recentCompleted } = await supabase
    .from("tasks")
    .select("id")
    .eq("assigned_to", user_id)
    .eq("status", "completed")
    .gte(
      "updated_at",
      new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    );

  const { data: recentTotal } = await supabase
    .from("tasks")
    .select("id")
    .eq("assigned_to", user_id)
    .gte(
      "created_at",
      new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    );

  if (recentCompleted && recentTotal && recentTotal.length > 0) {
    const rate = Math.round(
      (recentCompleted.length / recentTotal.length) * 100
    );
    if (rate >= 80) {
      insights.push({
        user_id,
        type: "recommendation",
        title: "Great productivity this week!",
        message: `You've completed ${rate}% of tasks assigned this week. Keep up the momentum.`,
        actionable: false,
        confidence: 90,
      });
    }
  }

  // Insert insights
  if (insights.length > 0) {
    const { error } = await supabase.from("ai_insights").insert(insights);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response(
    JSON.stringify({ insights_generated: insights.length }),
    { headers: { "Content-Type": "application/json" } }
  );
});
