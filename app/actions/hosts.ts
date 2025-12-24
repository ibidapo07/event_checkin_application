"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifySession } from "@/lib/session"
import { addHostSchema, deleteHostSchema } from "@/lib/validations"

export interface ActionResult {
  success: boolean
  message: string
}

/**
 * Verifies the session is valid before allowing any host operations.
 * Throws an error if not authenticated.
 */
async function requireAuth(): Promise<void> {
  const isValid = await verifySession()
  if (!isValid) {
    throw new Error("Unauthorized: Please log in to perform this action")
  }
}

/**
 * Adds a new host to the database.
 * CRITICAL: Verifies session before performing the operation.
 */
export async function addHost(formData: FormData): Promise<ActionResult> {
  try {
    // Verify authentication first
    await requireAuth()

    // Parse and validate input
    const rawData = {
      name: formData.get("name") as string,
      sectionName: formData.get("sectionName") as string,
      guestCapacity: Number(formData.get("guestCapacity")),
    }

    const result = addHostSchema.safeParse(rawData)
    if (!result.success) {
      return { success: false, message: result.error.errors[0].message }
    }

    const { name, sectionName, guestCapacity } = result.data

    // Generate a unique code for the host
    const hostCode = crypto.randomUUID()

    // Insert using Service Role to bypass RLS
    const supabase = createAdminClient()
    const { error } = await supabase.from("hosts").insert({
      name,
      section_name: sectionName,
      guest_capacity: guestCapacity,
      code: hostCode,
    })

    if (error) {
      console.error("Failed to add host:", error)
      return { success: false, message: "Failed to add host" }
    }

    // Revalidate the home page to show the new host
    revalidatePath("/")

    return { success: true, message: "Host added successfully" }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return { success: false, message: error.message }
    }
    console.error("Error in addHost:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

/**
 * Deletes a host from the database.
 * CRITICAL: Verifies session before performing the operation.
 */
export async function deleteHost(id: string): Promise<ActionResult> {
  try {
    // Verify authentication first
    await requireAuth()

    // Validate input
    const result = deleteHostSchema.safeParse({ id })
    if (!result.success) {
      return { success: false, message: result.error.errors[0].message }
    }

    // Delete using Service Role to bypass RLS
    const supabase = createAdminClient()
    
    // First delete related check-ins
    const { error: checkInsError } = await supabase
      .from("check_ins")
      .delete()
      .eq("host_id", id)

    if (checkInsError) {
      console.error("Failed to delete check-ins:", checkInsError)
      return { success: false, message: "Failed to delete host check-ins" }
    }

    // Then delete the host
    const { error } = await supabase
      .from("hosts")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Failed to delete host:", error)
      return { success: false, message: "Failed to delete host" }
    }

    // Revalidate the home page
    revalidatePath("/")

    return { success: true, message: "Host deleted successfully" }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return { success: false, message: error.message }
    }
    console.error("Error in deleteHost:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}
