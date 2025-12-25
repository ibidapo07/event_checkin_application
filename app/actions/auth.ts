"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createSession, setSessionCookie, deleteSession } from "@/lib/session"
import { loginCodeSchema } from "@/lib/validations"
import { z } from "zod"

const ACCESS_CODE_KEY = "access_code"
const CODE_EXPIRES_AT_KEY = "access_code_expires_at"
const CODE_DURATION_HOURS = 15

export interface ActionResult {
  success: boolean
  message: string
  code?: string
  expiresAt?: string
}

/**
 * Generates a random 6-digit code for the party session.
 * The code is valid for 15 hours and stored in plain text.
 * Returns the code to be displayed to the admin.
 */
export async function generatePartyCode(): Promise<ActionResult> {
  try {
    // Generate a random 6-digit code
    const plainCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Calculate expiration time (15 hours from now)
    const expiresAt = new Date(Date.now() + CODE_DURATION_HOURS * 60 * 60 * 1000)

    // Store the code and expiration in app_config using Service Role
    const supabase = createAdminClient()
    
    // Upsert the access code
    const { error: codeError } = await supabase
      .from("app_config")
      .upsert({
        key: ACCESS_CODE_KEY,
        value: plainCode,
        updated_at: new Date().toISOString(),
      })

    if (codeError) {
      console.error("Failed to store access code:", codeError)
      return { success: false, message: "Failed to generate code" }
    }

    // Upsert the expiration time
    const { error: expiresError } = await supabase
      .from("app_config")
      .upsert({
        key: CODE_EXPIRES_AT_KEY,
        value: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (expiresError) {
      console.error("Failed to store expiration:", expiresError)
      return { success: false, message: "Failed to set code expiration" }
    }

    return { 
      success: true, 
      message: "Party code generated successfully",
      code: plainCode,
      expiresAt: expiresAt.toISOString()
    }
  } catch (error) {
    console.error("Error in generatePartyCode:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

/**
 * Gets the current active party code info (for admin display).
 */
export async function getCurrentPartyCode(): Promise<ActionResult> {
  try {
    const supabase = createAdminClient()
    
    // Fetch both the code and expiration
    const { data: codeData } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", ACCESS_CODE_KEY)
      .single()

    const { data: expiresData } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", CODE_EXPIRES_AT_KEY)
      .single()

    if (!codeData || !expiresData) {
      return { success: false, message: "No active party code" }
    }

    // Check if expired
    const expiresAt = new Date(expiresData.value)
    if (expiresAt < new Date()) {
      return { success: false, message: "Party code has expired" }
    }

    return {
      success: true,
      message: "Active party code found",
      code: codeData.value,
      expiresAt: expiresData.value
    }
  } catch (error) {
    console.error("Error in getCurrentPartyCode:", error)
    return { success: false, message: "Failed to fetch party code" }
  }
}

/**
 * Admin login with admin secret from environment variable.
 */
export async function loginAsAdmin(formData: FormData): Promise<ActionResult> {
  try {
    const secret = formData.get("secret") as string
    const adminSecret = process.env.ADMIN_SECRET

    if (!adminSecret) {
      return { success: false, message: "Admin login not configured" }
    }

    if (!secret || secret !== adminSecret) {
      return { success: false, message: "Invalid admin secret" }
    }

    // Create admin session
    const sessionToken = await createSession("admin")
    await setSessionCookie(sessionToken)

    return { success: true, message: "Admin login successful" }
  } catch (error) {
    console.error("Error in loginAsAdmin:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

/**
 * Scanner login with party code.
 * Verifies the code matches and hasn't expired.
 */
export async function loginWithCode(formData: FormData): Promise<ActionResult> {
  try {
    const code = formData.get("code")

    // Validate input
    const result = loginCodeSchema.safeParse({ code })
    if (!result.success) {
      return { success: false, message: result.error.errors[0].message }
    }

    const supabase = createAdminClient()

    // Fetch the stored code
    const { data: codeData, error: codeError } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", ACCESS_CODE_KEY)
      .single()

    if (codeError || !codeData) {
      return { success: false, message: "No party code has been generated yet" }
    }

    // Fetch the expiration time
    const { data: expiresData, error: expiresError } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", CODE_EXPIRES_AT_KEY)
      .single()

    if (expiresError || !expiresData) {
      return { success: false, message: "Party code configuration error" }
    }

    // Check if the code has expired
    const expiresAt = new Date(expiresData.value)
    if (expiresAt < new Date()) {
      return { success: false, message: "Party code has expired. Please ask the admin for a new code." }
    }

    // Verify the code matches
    if (result.data.code !== codeData.value) {
      return { success: false, message: "Invalid party code" }
    }

    // Create scanner session
    const sessionToken = await createSession("scanner")
    await setSessionCookie(sessionToken)

    return { success: true, message: "Login successful" }
  } catch (error) {
    console.error("Error in loginWithCode:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

/**
 * Logs out the user by deleting the session cookie.
 * Returns success status - client should handle redirect.
 */
export async function logout(): Promise<ActionResult> {
  try {
    await deleteSession()
    return { success: true, message: "Logged out successfully" }
  } catch (error) {
    console.error("Error in logout:", error)
    return { success: false, message: "Failed to logout" }
  }
}
