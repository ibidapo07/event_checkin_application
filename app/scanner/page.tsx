"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Camera, CheckCircle2, XCircle, LogOut } from "lucide-react"
import Link from "next/link"
import { Html5Qrcode } from "html5-qrcode"
import { checkInGuest } from "@/app/actions/checkins"
import { logout } from "@/app/actions/auth"

type ScanResult = {
  success: boolean
  message: string
  hostName?: string
  sectionName?: string
  guestCapacity?: number
  totalCheckIns?: number
}

export default function ScannerPage() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null)
  const scannerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    return () => {
      if (html5QrCode) {
        html5QrCode
          .stop()
          .then(() => {
            html5QrCode.clear()
          })
          .catch((err) => console.error("Error stopping scanner:", err))
      }
    }
  }, [html5QrCode])

  const startScanning = async () => {
    try {
      const scanner = new Html5Qrcode("qr-reader")
      setHtml5QrCode(scanner)

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        onScanFailure,
      )

      setIsScanning(true)
      setScanResult(null)
    } catch (err) {
      console.error("Error starting scanner:", err)
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  const stopScanning = async () => {
    if (html5QrCode) {
      try {
        await html5QrCode.stop()
        html5QrCode.clear()
        setIsScanning(false)
      } catch (err) {
        console.error("Error stopping scanner:", err)
      }
    }
  }

  const onScanSuccess = async (decodedText: string) => {
    // Stop scanning temporarily to process
    if (html5QrCode) {
      await html5QrCode.pause(true)
    }

    await checkInHost(decodedText)

    // Resume scanning after 2 seconds
    setTimeout(() => {
      if (html5QrCode && isScanning) {
        html5QrCode.resume()
      }
    }, 2000)
  }

  const onScanFailure = (error: string) => {
    // Ignore scan failures - they happen frequently
  }

  const checkInHost = async (hostCode: string) => {
    try {
      const result = await checkInGuest(hostCode)

      if (!result.success) {
        setScanResult({
          success: false,
          message: result.message,
        })
        toast({
          title: "Check-in Failed",
          description: result.message,
          variant: "destructive",
        })
        return
      }

      setScanResult({
        success: true,
        message: result.message,
        hostName: result.data?.hostName,
        sectionName: result.data?.sectionName,
        guestCapacity: result.data?.guestCapacity,
        totalCheckIns: result.data?.totalCheckIns,
      })

      toast({
        title: "Check-in Successful",
        description: `Guest from ${result.data?.hostName}'s section has been checked in!`,
      })
    } catch (error) {
      console.error("Error checking in:", error)
      setScanResult({
        success: false,
        message: "Error processing QR code",
      })
      toast({
        title: "Error",
        description: "Failed to process QR code",
        variant: "destructive",
      })
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="mx-auto max-w-2xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">QR Code Scanner</h1>
              <p className="text-muted-foreground">Scan host QR codes to check in guests</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Camera Scanner</CardTitle>
            <CardDescription>Point your camera at the host's QR code to check in their guests</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div
              id="qr-reader"
              ref={scannerRef}
              className={`w-full ${isScanning ? "block" : "hidden"}`}
              style={{ maxWidth: "500px" }}
            />

            {!isScanning && (
              <div className="flex flex-col items-center gap-4 py-12">
                <Camera className="w-16 h-16 text-muted-foreground" />
                <p className="text-muted-foreground text-center">Click below to start scanning</p>
              </div>
            )}

            <Button onClick={isScanning ? stopScanning : startScanning} className="w-full max-w-xs">
              {isScanning ? "Stop Scanning" : "Start Scanning"}
            </Button>
          </CardContent>
        </Card>

        {scanResult && (
          <Card
            className={`border-2 ${scanResult.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {scanResult.success ? (
                  <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">{scanResult.message}</h3>
                  {scanResult.hostName && (
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Host:</span> {scanResult.hostName}
                      </p>
                      <p>
                        <span className="font-medium">Section:</span> {scanResult.sectionName}
                      </p>
                      <p>
                        <span className="font-medium">Capacity:</span> {scanResult.guestCapacity}
                      </p>
                      <p>
                        <span className="font-medium">Total Check-ins:</span> {scanResult.totalCheckIns}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Scanner Tips</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Ensure good lighting for best results</li>
              <li>Hold the QR code steady in the camera view</li>
              <li>The scanner will automatically detect and process codes</li>
              <li>Each scan records one guest check-in for that host</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
