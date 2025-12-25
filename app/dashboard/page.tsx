"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, CheckCircle2, Users, TrendingUp, LogOut, Clock } from "lucide-react"
import Link from "next/link"
import { logout } from "@/app/actions/auth"

type HostWithCheckIns = {
  id: string
  name: string
  section_name: string
  guest_capacity: number
  check_in_count: number
  latest_check_in?: string
}

type DashboardStats = {
  totalHosts: number
  totalCapacity: number
  totalCheckIns: number
}

export default function DashboardPage() {
  const [hosts, setHosts] = useState<HostWithCheckIns[]>([])
  const [stats, setStats] = useState<DashboardStats>({ totalHosts: 0, totalCapacity: 0, totalCheckIns: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchDashboardData()

    // Set up real-time subscription
    const supabase = createClient()
    const channel = supabase
      .channel("check-ins-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "check_ins" }, () => {
        fetchDashboardData()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const fetchDashboardData = async () => {
    try {
      const supabase = createClient()

      // Fetch all hosts
      const { data: hostsData, error: hostsError } = await supabase
        .from("hosts")
        .select("*")
        .order("name", { ascending: true })

      if (hostsError) throw hostsError

      // Fetch check-ins for each host
      const hostsWithCheckIns = await Promise.all(
        (hostsData || []).map(async (host) => {
          const { data: checkIns, error: checkInsError } = await supabase
            .from("check_ins")
            .select("checked_in_at")
            .eq("host_id", host.id)
            .order("checked_in_at", { ascending: false })

          if (checkInsError) throw checkInsError

          return {
            ...host,
            check_in_count: checkIns?.length || 0,
            latest_check_in: checkIns?.[0]?.checked_in_at,
          }
        }),
      )

      setHosts(hostsWithCheckIns)

      // Calculate stats
      const totalHosts = hostsWithCheckIns.length
      const totalCapacity = hostsWithCheckIns.reduce((sum, host) => sum + host.guest_capacity, 0)
      const totalCheckIns = hostsWithCheckIns.reduce((sum, host) => sum + host.check_in_count, 0)

      setStats({ totalHosts, totalCapacity, totalCheckIns })
      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setIsLoading(false)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const handleLogout = async () => {
    const result = await logout()
    if (result.success) {
      router.push("/login")
      router.refresh()
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button asChild variant="outline" size="sm" className="px-2 sm:px-3">
              <Link href="/">
                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold">Check-in Dashboard</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Monitor guest arrivals in real-time</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 sm:p-6 max-w-7xl mx-auto flex flex-col gap-4 sm:gap-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Hosts</CardTitle>
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold">{stats.totalHosts}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Managing sections</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Check-ins</CardTitle>
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.totalCheckIns}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                {stats.totalCapacity > 0
                  ? `${Math.round((stats.totalCheckIns / stats.totalCapacity) * 100)}% of capacity`
                  : "No capacity"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Capacity</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.totalCapacity}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Maximum guests</p>
            </CardContent>
          </Card>
        </div>

        {/* Host Check-ins List */}
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg">Host Check-ins</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Check-in status by host and section</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {hosts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No hosts added yet</p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {hosts.map((host) => (
                  <div
                    key={host.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg border gap-3 ${
                      host.check_in_count > 0 ? "bg-green-50 border-green-200" : "bg-card"
                    } transition-colors`}
                  >
                    {/* Left side - Host info */}
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-primary/10 flex-shrink-0">
                        <div className="text-lg sm:text-2xl font-bold text-primary">{host.check_in_count}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground">guests</div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm sm:text-lg truncate">{host.name}</p>
                        <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                          <span className="truncate">{host.section_name}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="whitespace-nowrap">
                            {host.check_in_count} / {host.guest_capacity}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right side - Latest check-in */}
                    <div className="flex items-center gap-2 text-left sm:text-right pl-[62px] sm:pl-0">
                      {host.latest_check_in ? (
                        <div className="flex items-center gap-2 sm:block">
                          <Clock className="w-3 h-3 text-green-600 sm:hidden" />
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-green-700">Last check-in</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              {formatDate(host.latest_check_in)} at {formatTime(host.latest_check_in)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs sm:text-sm text-muted-foreground">No check-ins yet</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
