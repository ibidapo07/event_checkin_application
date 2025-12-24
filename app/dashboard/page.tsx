"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, CheckCircle2, Users, TrendingUp, LogOut } from "lucide-react"
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
    await logout()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="mx-auto max-w-7xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Check-in Dashboard</h1>
              <p className="text-muted-foreground">Monitor guest arrivals by host in real-time</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hosts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHosts}</div>
              <p className="text-xs text-muted-foreground">Managing sections</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.totalCheckIns}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalCapacity > 0
                  ? `${Math.round((stats.totalCheckIns / stats.totalCapacity) * 100)}% of capacity`
                  : "No capacity set"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalCapacity}</div>
              <p className="text-xs text-muted-foreground">Maximum guests</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Host Check-ins</CardTitle>
            <CardDescription>Check-in status by host and section</CardDescription>
          </CardHeader>
          <CardContent>
            {hosts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hosts added yet</p>
            ) : (
              <div className="space-y-2">
                {hosts.map((host) => (
                  <div
                    key={host.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      host.check_in_count > 0 ? "bg-green-50 border-green-200" : "bg-card"
                    } transition-colors`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-primary/10">
                        <div className="text-2xl font-bold text-primary">{host.check_in_count}</div>
                        <div className="text-xs text-muted-foreground">guests</div>
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{host.name}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Section: {host.section_name}</span>
                          <span>•</span>
                          <span>
                            Capacity: {host.check_in_count} / {host.guest_capacity}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {host.latest_check_in ? (
                        <div>
                          <p className="text-sm font-medium text-green-700">Latest check-in</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(host.latest_check_in)} at {formatTime(host.latest_check_in)}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">No check-ins yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
