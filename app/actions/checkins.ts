"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifySession } from "@/lib/session"
import { checkInSchema } from "@/lib/validations"

export interface CheckInResult {
  success: boolean
  message: string
  data?: {
    hostName: string
    sectionName: string
    guestCapacity: number
    totalCheckIns: number
  }
}

/**
 * Verifies the session is valid before allowing check-in operations.
 * Throws an error if not authenticated.
 */
async function requireAuth(): Promise<void> {
  const isValid = await verifySession()
  if (!isValid) {
    throw new Error("Unauthorized: Please log in to perform this action")
  }
}

/**
 * Records a check-in for a guest using the host's QR code.
 * CRITICAL: Verifies session before performing the operation.
 */
export async function checkInGuest(hostCode: string): Promise<CheckInResult> {
  try {
    // Verify authentication first
    await requireAuth()

    // Validate input
    const result = checkInSchema.safeParse({ hostCode })
    if (!result.success) {
      return { success: false, message: result.error.errors[0].message }
    }

    const supabase = createAdminClient()

    // Find the host by code
    const { data: host, error: hostError } = await supabase
      .from("hosts")
      .select("*")
      .eq("code", hostCode)
      .single()

    if (hostError || !host) {
      return { success: false, message: "Invalid QR code - host not found" }
    }

    // Record the check-in using Service Role to bypass RLS
    const { error: insertError } = await supabase.from("check_ins").insert({
      host_id: host.id,
      checked_in_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error("Failed to record check-in:", insertError)
      return { success: false, message: "Failed to record check-in" }
    }

    // Get total check-ins for this host
    const { count } = await supabase
      .from("check_ins")
      .select("*", { count: "exact", head: true })
      .eq("host_id", host.id)

    // Revalidate the dashboard
    revalidatePath("/dashboard")

    return {
      success: true,
      message: "Guest checked in successfully",
      data: {
        hostName: host.name,
        sectionName: host.section_name,
        guestCapacity: host.guest_capacity,
        totalCheckIns: count || 1,
      },
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return { success: false, message: error.message }
    }
    console.error("Error in checkInGuest:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}
