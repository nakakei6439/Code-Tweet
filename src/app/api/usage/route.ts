import { createClient } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/rateLimit";
import { getGuestUsage, getUserUsage } from "@/lib/usage";

export async function GET(request: Request): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const usage = await getUserUsage(user.id);
    return Response.json(usage);
  }

  const ip = getClientIp(request);
  if (!ip) {
    return Response.json({ error: "IP アドレスを特定できませんでした。" }, { status: 400 });
  }
  const usage = await getGuestUsage(hashIp(ip));
  return Response.json(usage);
}
