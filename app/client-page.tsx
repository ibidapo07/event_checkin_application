"use client"

import type React from "react"
import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { QrCode, Users, Download, Trash2, LogOut, Loader2, Plus, MapPin, UserCircle, Key, Copy, RefreshCw, Clock } from "lucide-react"
import Link from "next/link"
import QRCode from "qrcode"
import type { Host } from "@/lib/types"
import { addHost, deleteHost } from "@/app/actions/hosts"
import { logout, generatePartyCode, getCurrentPartyCode } from "@/app/actions/auth"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface PartyCode {
  code: string
  expiresAt: string
}

interface ClientHomeProps {
  initialHosts: Host[]
  initialPartyCode: PartyCode | null
}

export default function ClientHome({ initialHosts, initialPartyCode }: ClientHomeProps) {
  const [name, setName] = useState("")
  const [sectionName, setSectionName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [hosts, setHosts] = useState<Host[]>(initialHosts)
  const [partyCode, setPartyCode] = useState<PartyCode | null>(initialPartyCode)
  const [isPending, startTransition] = useTransition()
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // Update hosts when initialHosts changes (after revalidation)
  useEffect(() => {
    setHosts(initialHosts)
  }, [initialHosts])

  // Update party code when it changes
  useEffect(() => {
    setPartyCode(initialPartyCode)
  }, [initialPartyCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    startTransition(async () => {
      const formData = new FormData()
      formData.append("name", name)
      formData.append("sectionName", sectionName)
      formData.append("guestCapacity", quantity)

      const result = await addHost(formData)

      if (result.success) {
        toast({
          title: "Success!",
          description: "Host added successfully. QR code is ready to download!",
        })
        // Reset form
        setName("")
        setSectionName("")
        setQuantity("")
        setShowAddForm(false)
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    })
  }

  const handleDelete = async (id: string, hostName: string) => {
    startTransition(async () => {
      const result = await deleteHost(id)

      if (result.success) {
        toast({
          title: "Host Deleted",
          description: `${hostName} has been removed.`,
        })
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    })
  }

  const handleLogout = async () => {
    const result = await logout()
    if (result.success) {
      router.push("/login")
      router.refresh()
    }
  }

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true)
    try {
      const result = await generatePartyCode()
      
      if ('error' in result) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        setPartyCode(result)
        toast({
          title: "Party Code Generated!",
          description: "Share this code with your hosts/hostesses.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate party code",
        variant: "destructive",
      })
    }
    setIsGeneratingCode(false)
  }

  const copyCodeToClipboard = async () => {
    if (partyCode) {
      try {
        await navigator.clipboard.writeText(partyCode.code)
        toast({
          title: "Copied!",
          description: "Party code copied to clipboard.",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy code",
          variant: "destructive",
        })
      }
    }
  }

  const formatExpiration = (expiresAt: string) => {
    const date = new Date(expiresAt)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffMs <= 0) return "Expired"
    if (diffHours > 0) return `${diffHours}h ${diffMins}m remaining`
    return `${diffMins}m remaining`
  }

  const isCodeExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  const downloadQRCode = async (host: Host) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(host.code, {
        width: 400,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })

      const link = document.createElement("a")
      link.href = qrDataUrl
      link.download = `${host.name.replace(/\s+/g, "-")}-qr-code.png`
      link.click()

      toast({
        title: "QR Code Downloaded",
        description: `QR code for ${host.name} has been downloaded.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download QR code",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-lg sm:text-xl font-bold">Party Hosts</h1>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="hidden sm:flex">
              <Link href="/scanner">
                <QrCode className="w-4 h-4 mr-2" />
                Scanner
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="hidden sm:flex">
              <Link href="/dashboard">
                <Users className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="sm:hidden flex gap-2 p-4 pb-0">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href="/scanner">
            <QrCode className="w-4 h-4 mr-2" />
            Scanner
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href="/dashboard">
            <Users className="w-4 h-4 mr-2" />
            Dashboard
          </Link>
        </Button>
      </div>

      {/* Content */}
      <main className="p-4 max-w-4xl mx-auto flex flex-col gap-4">
        
        {/* Party Code Card */}
        <Card className="border-2 border-dashed border-indigo-300 bg-indigo-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-600" />
              <div>
                <CardTitle className="text-lg">Scanner Access Code</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Generate a code for hosts/hostesses to access the scanner
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {partyCode && !isCodeExpired(partyCode.expiresAt) ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex-1 sm:flex-none bg-white border-2 border-indigo-200 rounded-lg px-4 py-3">
                    <p className="text-3xl sm:text-4xl font-mono font-bold tracking-widest text-center">
                      {partyCode.code}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={copyCodeToClipboard}
                    className="flex-shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {formatExpiration(partyCode.expiresAt)}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleGenerateCode}
                    disabled={isGeneratingCode}
                    className="w-full sm:w-auto"
                  >
                    {isGeneratingCode ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    New Code
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4">
                <p className="text-sm text-muted-foreground text-center">
                  {partyCode ? "The previous code has expired." : "No active code."} Generate a new code for today's event.
                </p>
                <Button onClick={handleGenerateCode} disabled={isGeneratingCode}>
                  {isGeneratingCode ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4 mr-2" />
                  )}
                  Generate Party Code
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hosts List Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg sm:text-xl">Birthday Party Hosts</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Manage hosts and their QR codes</CardDescription>
              </div>
              <Button 
                onClick={() => setShowAddForm(!showAddForm)} 
                size="sm"
                variant={showAddForm ? "secondary" : "default"}
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{showAddForm ? "Cancel" : "Add Host"}</span>
              </Button>
            </div>
          </CardHeader>
          
          {/* Add Host Form - Collapsible on mobile */}
          {showAddForm && (
            <CardContent className="border-t pt-4">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="name" className="text-xs sm:text-sm">Host Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter host name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="text-base"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="section" className="text-xs sm:text-sm">Section Name</Label>
                    <Input
                      id="section"
                      type="text"
                      placeholder="e.g., Main Hall"
                      required
                      value={sectionName}
                      onChange={(e) => setSectionName(e.target.value)}
                      className="text-base"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="quantity" className="text-xs sm:text-sm">Capacity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      placeholder="0"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="text-base"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isPending} className="w-full sm:w-auto sm:self-end">
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Host
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          )}
          
          <CardContent className={showAddForm ? "pt-4 border-t" : ""}>
            {hosts.length === 0 ? (
              <div className="text-center py-12">
                <UserCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No hosts added yet</p>
                <p className="text-muted-foreground text-xs">Tap "Add Host" to get started</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {hosts.map((host) => (
                  <HostCard 
                    key={host.id} 
                    host={host} 
                    onDownload={downloadQRCode} 
                    onDelete={handleDelete}
                    isDeleting={isPending}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

interface HostCardProps {
  host: Host
  onDownload: (host: Host) => void
  onDelete: (id: string, name: string) => void
  isDeleting: boolean
}

function HostCard({ host, onDownload, onDelete, isDeleting }: HostCardProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")

  useEffect(() => {
    QRCode.toDataURL(host.code, {
      width: 120,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    }).then(setQrCodeUrl)
  }, [host.code])

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-3">
      {/* Host Info */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        {/* QR Code - visible on both mobile and desktop */}
        {qrCodeUrl && (
          <div className="p-1.5 sm:p-2 bg-white rounded-lg border flex-shrink-0">
            <img 
              src={qrCodeUrl || "/placeholder.svg"} 
              alt={`QR code for ${host.name}`} 
              className="w-14 h-14 sm:w-16 sm:h-16" 
            />
          </div>
        )}
        
        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm sm:text-base truncate">{host.name}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {host.section_name}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {host.guest_capacity} guests
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pl-[70px] sm:pl-0">
        <Button onClick={() => onDownload(host)} size="sm" variant="default" className="flex-1 sm:flex-none">
          <Download className="w-4 h-4 sm:mr-2" />
          <span className="sm:inline">Download</span>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive" disabled={isDeleting}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Host</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {host.name}? This will also delete all their check-in records.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(host.id, host.name)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
