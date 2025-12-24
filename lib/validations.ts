import { z } from "zod"

// Auth validation schemas
export const loginCodeSchema = z.object({
  code: z
    .string()
    .length(6, "Code must be exactly 6 digits")
    .regex(/^\d+$/, "Code must contain only numbers"),
})

// Host validation schemas
export const addHostSchema = z.object({
  name: z
    .string()
    .min(1, "Host name is required")
    .max(100, "Host name must be less than 100 characters"),
  sectionName: z
    .string()
    .min(1, "Section name is required")
    .max(100, "Section name must be less than 100 characters"),
  guestCapacity: z
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(10000, "Capacity must be less than 10,000"),
})

export const deleteHostSchema = z.object({
  id: z.string().uuid("Invalid host ID"),
})

// Check-in validation schemas
export const checkInSchema = z.object({
  hostCode: z.string().uuid("Invalid host code"),
})

// Type exports for form data
export type LoginCodeInput = z.infer<typeof loginCodeSchema>
export type AddHostInput = z.infer<typeof addHostSchema>
export type DeleteHostInput = z.infer<typeof deleteHostSchema>
export type CheckInInput = z.infer<typeof checkInSchema>
