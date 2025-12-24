// Database types for the Birthday Party Planner

export interface Database {
  public: {
    Tables: {
      hosts: {
        Row: {
          id: string
          name: string
          section_name: string
          guest_capacity: number
          code: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          section_name: string
          guest_capacity: number
          code: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          section_name?: string
          guest_capacity?: number
          code?: string
          created_at?: string
        }
      }
      check_ins: {
        Row: {
          id: string
          host_id: string
          checked_in_at: string
        }
        Insert: {
          id?: string
          host_id: string
          checked_in_at?: string
        }
        Update: {
          id?: string
          host_id?: string
          checked_in_at?: string
        }
      }
      app_config: {
        Row: {
          key: string
          value: string
          updated_at: string
        }
        Insert: {
          key: string
          value: string
          updated_at?: string
        }
        Update: {
          key?: string
          value?: string
          updated_at?: string
        }
      }
    }
  }
}

// Exported types for convenience
export type Host = Database["public"]["Tables"]["hosts"]["Row"]
export type HostInsert = Database["public"]["Tables"]["hosts"]["Insert"]
export type HostUpdate = Database["public"]["Tables"]["hosts"]["Update"]

export type CheckIn = Database["public"]["Tables"]["check_ins"]["Row"]
export type CheckInInsert = Database["public"]["Tables"]["check_ins"]["Insert"]

export type AppConfig = Database["public"]["Tables"]["app_config"]["Row"]

// Extended types for UI
export interface HostWithCheckIns extends Host {
  check_in_count: number
  latest_check_in?: string
}

export interface DashboardStats {
  totalHosts: number
  totalCapacity: number
  totalCheckIns: number
}

// Session payload for JWT
export type UserRole = "admin" | "scanner"

export interface SessionPayload {
  authenticated: boolean
  role: UserRole
  iat: number
  exp: number
}
