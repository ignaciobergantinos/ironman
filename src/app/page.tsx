import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TriaApp from "@/components/TriaApp";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <TriaApp userId={user.id} email={user.email ?? ""} />;
}
