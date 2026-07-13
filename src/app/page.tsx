import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TriaApp from "@/components/TriaApp";
import { LOCAL_MOCK, MOCK_USER } from "@/lib/local-mock";

export default async function Home() {
  if (LOCAL_MOCK) return <TriaApp userId={MOCK_USER.id} email={MOCK_USER.email} />;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <TriaApp userId={user.id} email={user.email ?? ""} />;
}
