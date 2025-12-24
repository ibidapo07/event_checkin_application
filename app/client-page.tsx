"use client"

import type React from "react"
import { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { QrCode, Users, Download, Trash2, LogOut, Loader2 } from "lucide-react"
import Link from "next/link"
import QRCode from "qrcode"
import type { Host } from "@/lib/types"
import { addHost, deleteHost } from "@/app/actions/hosts"
import { logout } from "@/app/actions/auth"
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

interface ClientHomeProps {
  initialHosts: Host[]
}

export default function ClientHome({ initialHosts }: ClientHomeProps) {
  const [name, setName] = useState("")
  const [sectionName, setSectionName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [hosts, setHosts] = useState<Host[]>(initialHosts)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  // Update hosts when initialHosts changes (after revalidation)
  useEffect(() => {
    setHosts(initialHosts)
  }, [initialHosts])

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
    await logout()
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="mx-auto max-w-4xl flex flex-col gap-6">
        <div className="flex gap-3 justify-between">
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href="/scanner">
                <QrCode className="w-4 h-4 mr-2" />
                Scan Tickets
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <Users className="w-4 h-4 mr-2" />
                Check-in Dashboard
              </Link>
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Birthday Party Hosts</CardTitle>
            <CardDescription>View all hosts and download their QR codes</CardDescription>
          </CardHeader>
          <CardContent>
            {hosts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hosts added yet. Add your first host below!</p>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Add New Host</CardTitle>
            <CardDescription>Enter host details to assign them to a section</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1 flex flex-col gap-2">
                  <Label htmlFor="name">Host Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter host name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <Label htmlFor="section">Section Name</Label>
                  <Input
                    id="section"
                    type="text"
                    placeholder="e.g., Main Hall, Garden"
                    required
                    value={sectionName}
                    onChange={(e) => setSectionName(e.target.value)}
                  />
                </div>

                <div className="w-32 flex flex-col gap-2">
                  <Label htmlFor="quantity">Capacity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    placeholder="0"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>

                <Button type="submit" disabled={isPending} className="px-8">
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Host"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
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
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-6">
        <div>
          <p className="font-semibold text-foreground">{host.name}</p>
          <p className="text-sm text-muted-foreground">Host</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <p className="font-medium text-foreground">{host.section_name}</p>
          <p className="text-sm text-muted-foreground">Section</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-right">
          <p className="font-semibold text-lg text-foreground">{host.guest_capacity}</p>
          <p className="text-sm text-muted-foreground">Capacity</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {qrCodeUrl && (
          <div className="p-2 bg-white rounded-lg border">
            <img src={qrCodeUrl || "/placeholder.svg"} alt={`QR code for ${host.name}`} className="w-20 h-20" />
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={() => onDownload(host)} size="sm" variant="default">
            <Download className="w-4 h-4 mr-2" />
            Download QR
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" disabled={isDeleting}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
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
    </div>
  )
}
