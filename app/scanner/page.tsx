"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Camera, CheckCircle2, XCircle, LogOut, Loader2, ScanLine, Users, MapPin, Hash } from "lucide-react"
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
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const scannerRef = useRef<HTMLDivElement>(null)
  const isProcessingRef = useRef(false) // Use ref to track processing state reliably
  const lastScannedCode = useRef<string | null>(null) // Track last scanned code to prevent duplicates
  const { toast } = useToast()
  const router = useRouter()

  // Cleanup on unmount
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
      setCameraReady(false)
      const scanner = new Html5Qrcode("qr-reader")
      setHtml5QrCode(scanner)

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        onScanSuccess,
        onScanFailure,
      )

      setIsScanning(true)
      setCameraReady(true)
      setScanResult(null)
    } catch (err) {
      console.error("Error starting scanner:", err)
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions and try again.",
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
        setCameraReady(false)
      } catch (err) {
        console.error("Error stopping scanner:", err)
      }
    }
  }

  const onScanSuccess = useCallback(async (decodedText: string) => {
    // Prevent multiple scans while processing using ref (not state, which has stale closure issues)
    if (isProcessingRef.current) return
    
    // Prevent scanning the same code twice in quick succession
    if (lastScannedCode.current === decodedText) return
    
    // Mark as processing immediately
    isProcessingRef.current = true
    lastScannedCode.current = decodedText
    setIsProcessing(true)
    
    // Pause scanning immediately
    if (html5QrCode) {
      try {
        await html5QrCode.pause(true)
      } catch (e) {
        // Ignore pause errors
      }
    }

    await checkInHost(decodedText)

    // Resume scanning after 3 seconds
    setTimeout(() => {
      if (html5QrCode) {
        try {
          html5QrCode.resume()
        } catch (e) {
          // Scanner might have been stopped
        }
      }
      isProcessingRef.current = false
      setIsProcessing(false)
      // Clear last scanned code after delay to allow re-scanning same code later
      setTimeout(() => {
        lastScannedCode.current = null
      }, 2000)
    }, 3000)
  }, [html5QrCode])

  const onScanFailure = (error: string) => {
    // Ignore scan failures - they happen frequently when no QR is in view
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
        title: "✓ Check-in Successful",
        description: `Guest checked in to ${result.data?.sectionName}`,
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
    const result = await logout()
    if (result.success) {
      router.push("/login")
      router.refresh()
    }
  }

  const dismissResult = () => {
    setScanResult(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header - fixed at top */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">QR Scanner</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Scan to check in guests</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col p-4 max-w-2xl mx-auto w-full">
        {/* Scanner Card */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Camera Scanner
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Point your camera at the host's QR code
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            {/* Scanner viewport */}
            <div className="relative flex-1 min-h-[300px] sm:min-h-[400px] bg-black rounded-xl overflow-hidden">
              {/* QR Reader container */}
              <div
                id="qr-reader"
                ref={scannerRef}
                className="absolute inset-0 w-full h-full"
                style={{ 
                  display: isScanning ? 'block' : 'none',
                }}
              />
              
              {/* Scanning overlay with guide */}
              {isScanning && cameraReady && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-64 h-64 sm:w-72 sm:h-72">
                    {/* Corner brackets */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                    
                    {/* Scanning line animation */}
                    <div className="absolute inset-x-4 top-1/2 -translate-y-1/2">
                      <div className="h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse" />
                    </div>
                  </div>
                </div>
              )}

              {/* Processing overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-sm font-medium">Processing...</p>
                  </div>
                </div>
              )}

              {/* Not scanning state */}
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900">
                  <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center">
                    <ScanLine className="w-10 h-10 text-slate-500" />
                  </div>
                  <p className="text-slate-400 text-sm text-center px-4">
                    Tap the button below to start scanning
                  </p>
                </div>
              )}
            </div>

            {/* Control button */}
            <Button 
              onClick={isScanning ? stopScanning : startScanning} 
              size="lg"
              className={`w-full text-base py-6 ${isScanning ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isScanning ? (
                <>
                  <XCircle className="w-5 h-5 mr-2" />
                  Stop Scanning
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5 mr-2" />
                  Start Scanning
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Scan Result Card */}
        {scanResult && (
          <Card
            className={`mt-4 border-2 animate-in slide-in-from-bottom-4 duration-300 ${
              scanResult.success 
                ? "border-green-500 bg-green-50" 
                : "border-red-500 bg-red-50"
            }`}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                {scanResult.success ? (
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-7 h-7 text-green-600" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-7 h-7 text-red-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-base sm:text-lg ${
                    scanResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {scanResult.success ? 'Check-in Successful!' : 'Check-in Failed'}
                  </h3>
                  <p className={`text-sm ${
                    scanResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {scanResult.message}
                  </p>
                  
                  {scanResult.success && scanResult.hostName && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 bg-white/60 rounded-lg p-2">
                        <Users className="w-4 h-4 text-green-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Host</p>
                          <p className="text-sm font-medium truncate">{scanResult.hostName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-white/60 rounded-lg p-2">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Section</p>
                          <p className="text-sm font-medium truncate">{scanResult.sectionName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-white/60 rounded-lg p-2">
                        <Hash className="w-4 h-4 text-green-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Check-ins</p>
                          <p className="text-sm font-medium">{scanResult.totalCheckIns} / {scanResult.guestCapacity}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={dismissResult}
                className="w-full mt-3 text-muted-foreground"
              >
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tips - only show when not scanning */}
        {!isScanning && !scanResult && (
          <Card className="mt-4 bg-blue-50/50 border-blue-200">
            <CardContent className="pt-4 pb-4">
              <h3 className="font-semibold text-sm mb-2 text-blue-900">Quick Tips</h3>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Ensure good lighting for best results</li>
                <li>• Hold the QR code steady in the frame</li>
                <li>• Each scan records one guest check-in</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
