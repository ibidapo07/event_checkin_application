import { createServerComponentClient } from "@/lib/supabase/server"
import ClientHome from "./client-page"
import type { Host } from "@/lib/types"

export default async function Home() {
  const supabase = await createServerComponentClient()
  
  const { data: hosts, error } = await supabase
    .from("hosts")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching hosts:", error)
  }

  return <ClientHome initialHosts={(hosts as Host[]) || []} />
}
