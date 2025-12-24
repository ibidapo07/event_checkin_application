"use client"

import type React from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { PartyPopper, Scan, Shield, Loader2, ArrowLeft } from "lucide-react"
import { loginWithCode, loginAsAdmin } from "@/app/actions/auth"

type LoginMode = "select" | "scanner" | "admin"

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>("select")
  const [code, setCode] = useState("")
  const [adminSecret, setAdminSecret] = useState("")
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const handleScannerLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    startTransition(async () => {
      const formData = new FormData()
      formData.append("code", code)
      
      const result = await loginWithCode(formData)
      
      if (result.success) {
        toast({
          title: "Welcome!",
          description: "You can now start scanning guests.",
        })
        router.push("/scanner")
        router.refresh()
      } else {
        toast({
          title: "Login Failed",
          description: result.message,
          variant: "destructive",
        })
      }
    })
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    startTransition(async () => {
      const formData = new FormData()
      formData.append("secret", adminSecret)
      
      const result = await loginAsAdmin(formData)
      
      if (result.success) {
        toast({
          title: "Welcome Admin!",
          description: "You now have full access.",
        })
        router.push("/")
        router.refresh()
      } else {
        toast({
          title: "Login Failed",
          description: result.message,
          variant: "destructive",
        })
      }
    })
  }

  // Role selection screen
  if (mode === "select") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <PartyPopper className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Birthday Party Planner</CardTitle>
            <CardDescription>Select your role to continue</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              variant="outline"
              size="lg"
              className="h-24 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-300"
              onClick={() => setMode("scanner")}
            >
              <Scan className="w-8 h-8 text-blue-600" />
              <div>
                <div className="font-semibold">Host / Hostess</div>
                <div className="text-xs text-muted-foreground">Scan guest QR codes</div>
              </div>
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="h-24 flex flex-col gap-2 hover:bg-slate-50 hover:border-slate-400"
              onClick={() => setMode("admin")}
            >
              <Shield className="w-8 h-8 text-slate-600" />
              <div>
                <div className="font-semibold">Admin</div>
                <div className="text-xs text-muted-foreground">Manage party & view dashboard</div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Scanner login screen
  if (mode === "scanner") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
              <Scan className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Scanner Login</CardTitle>
            <CardDescription>
              Enter the 6-digit party code provided by the admin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScannerLogin} className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Party Code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-widest font-mono"
                  required
                  autoFocus
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isPending || code.length !== 6}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Start Scanning"
                )}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setMode("select")
                  setCode("")
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Admin login screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-slate-600 to-gray-800 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>
            Enter the admin secret to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="secret">Admin Secret</Label>
              <Input
                id="secret"
                type="password"
                placeholder="Enter admin secret"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                required
                autoFocus
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isPending || !adminSecret}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Access Dashboard"
              )}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMode("select")
                setAdminSecret("")
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
