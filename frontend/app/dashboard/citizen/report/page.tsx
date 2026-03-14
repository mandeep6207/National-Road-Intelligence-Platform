'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { AlertTriangle, Camera, CheckCircle2, Loader2, MapPin } from 'lucide-react'
import { useAdminControlCenter, type SimulationSeverity } from '@/components/admin/AdminControlCenterContext'
import { captureRoadIssue, recordCitizenReportEvent, type MonitoringCaptureResult } from '@/lib/api'

function toSimulationSeverity(severity: MonitoringCaptureResult['severity']): SimulationSeverity {
  if (severity === 'critical' || severity === 'high') return 'critical'
  if (severity === 'moderate') return 'medium'
  return 'minor'
}

function toPriority(severity: MonitoringCaptureResult['severity']) {
  if (severity === 'critical' || severity === 'high') return 'HIGH' as const
  if (severity === 'moderate') return 'MEDIUM' as const
  return 'LOW' as const
}

function readCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: 0, longitude: 0 })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        })
      },
      () => {
        resolve({ latitude: 0, longitude: 0 })
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  })
}

export default function CitizenReportPage() {
  const {
    availableDistricts,
    availableStates,
    selectedDistrict,
    selectedState,
    selectedPincode,
    setSelectedState,
    setSelectedDistrict,
    submitComplaint,
  } = useAdminControlCenter()

  const [userName, setUserName] = useState('Citizen User')
  const [userEmail, setUserEmail] = useState('citizen@nrip.gov.in')
  const [capturing, setCapturing] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [captureResult, setCaptureResult] = useState<MonitoringCaptureResult | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('nrip_user')
      if (!raw) return
      const parsed = JSON.parse(raw) as { name?: string; email?: string }
      if (parsed.name) setUserName(parsed.name)
      if (parsed.email) setUserEmail(parsed.email)
    } catch {
      setUserName('Citizen User')
      setUserEmail('citizen@nrip.gov.in')
    }
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      stopCamera()
    }
  }, [previewUrl])

  function stopCamera() {
    const stream = streamRef.current
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  async function startCamera() {
    setError('')
    setCameraError('')

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      setCameraActive(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setCameraError('Unable to access camera. Please allow camera permissions or use image upload.')
      stopCamera()
    }
  }

  function openUploadPicker() {
    setError('')
    setCameraError('')
    fileInputRef.current?.click()
  }

  async function processImageFile(file: File, sourceType: 'citizen_mobile' = 'citizen_mobile') {
    setCapturing(true)
    setError('')
    setCaptureResult(null)

    try {
      const location = await readCurrentPosition()
      const result = await captureRoadIssue({
        imageFile: file,
        sourceType,
        latitude: location.latitude,
        longitude: location.longitude,
      })

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)
      setCaptureResult(result)

      // Align portal focus to the auto-routed district when available in configured list.
      const stateMatch = availableStates.find((state) => state.toLowerCase() === result.state.toLowerCase())
      if (stateMatch && stateMatch !== selectedState) {
        setSelectedState(stateMatch)
      }

      const districtMatch = availableDistricts.find(
        (district) => district.name.toLowerCase() === result.district.toLowerCase()
      )
      if (districtMatch && districtMatch.name !== selectedDistrict) {
        setSelectedDistrict(districtMatch.name)
      }

      submitComplaint({
        complaintId: result.complaint_id,
        state: result.state,
        district: result.district,
        pincode: selectedPincode,
        issueLocation: `${result.road_name}, ${result.district}`,
        roadName: result.road_name,
        severity: toSimulationSeverity(result.severity),
        priority: toPriority(result.severity),
        latitude: result.latitude,
        longitude: result.longitude,
        description: `AI detected ${result.severity} pothole from ${result.source_type.replace('_', ' ')} source.`,
        reportSource: 'citizen',
        issueImageName: file.name,
        reporterName: userName,
        reporterEmail: userEmail,
        assignedAuthority: result.assigned_authority,
        contractorName: '',
        repairDeadline: '',
        progressPercentage: 0,
        authorityVerified: false,
        citizenAuditorVerified: false,
        escalated: false,
        repairStartedAt: '',
        completedAt: '',
        beforeRepairImageName: '',
        afterRepairImageName: '',
        repairNotes: '',
        citizenRepairQuality: 0,
        citizenCompletionTime: 0,
        citizenOverallRating: 0,
        citizenFeedbackComment: '',
        citizenFeedbackSubmitted: false,
        feedbackSubmittedAt: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'ASSIGNED_TO_AUTHORITY',
      })

      try {
        await recordCitizenReportEvent(result.complaint_id)
      } catch (eventError) {
        console.error('Citizen report event tracking failed:', eventError)
      }
    } catch (captureError: any) {
      setError(captureError?.message || 'Capture failed. Please try again.')
    } finally {
      setCapturing(false)
    }
  }

  async function handleCapturePhoto() {
    if (!videoRef.current || !canvasRef.current) {
      setCameraError('Camera preview is unavailable. Please retry.')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    const width = video.videoWidth || 1280
    const height = video.videoHeight || 720
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      setCameraError('Unable to capture photo. Please retry.')
      return
    }

    context.drawImage(video, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (!blob) {
      setCameraError('Unable to capture photo. Please retry.')
      return
    }

    const timestamp = new Date().toISOString().replace(/[.:]/g, '-')
    const capturedFile = new File([blob], `camera_capture_${timestamp}.jpg`, { type: 'image/jpeg' })

    stopCamera()
    await processImageFile(capturedFile)
  }

  async function handleCaptureFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const validTypes = ['image/jpg', 'image/jpeg', 'image/png']
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError('Only JPG, JPEG, and PNG files are supported.')
      event.target.value = ''
      return
    }

    stopCamera()
    await processImageFile(file)
    event.target.value = ''
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1f4e79]">Citizen Smart Reporting</p>
        <h2 className="mt-2 text-xl font-bold text-[#0d3b5c]">Capture Road Issue</h2>
        <p className="mt-2 text-sm text-slate-600">
          Report road issues using live camera capture or image upload. GPS, AI detection, and complaint generation run automatically.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={startCamera}
                disabled={capturing || cameraActive}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0d3b5c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0a304a] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Camera className="h-4 w-4" />
                Use Camera
              </button>

              <button
                type="button"
                onClick={openUploadPicker}
                disabled={capturing}
                className="inline-flex items-center gap-2 rounded-xl border border-[#0d3b5c] bg-white px-4 py-2.5 text-sm font-semibold text-[#0d3b5c] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Upload Image
              </button>

              {capturing && (
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0d3b5c]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing AI Detection...
                </span>
              )}
            </div>

            <input
              id="citizen-capture-input"
              type="file"
              accept=".jpg,.jpeg,.png,image/jpg,image/jpeg,image/png"
              onChange={handleCaptureFile}
              ref={fileInputRef}
              className="hidden"
              disabled={capturing}
            />

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-[#0d3b5c]">Automated Flow</p>
              <p className="mt-1">Camera capture -&gt; GPS location -&gt; AI detection -&gt; complaint generated -&gt; authority routing.</p>
            </div>

            {cameraActive && (
              <div className="rounded-xl border border-[#0d3b5c]/30 bg-[#f1f7fc] p-4">
                <p className="text-sm font-semibold text-[#0d3b5c]">Live Camera Preview</p>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-black">
                  <video ref={videoRef} autoPlay playsInline muted className="h-56 w-full object-cover sm:h-64" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    disabled={capturing}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Capture Photo
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    disabled={capturing}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            {cameraError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{cameraError}</div>
            )}

            {captureResult?.high_risk_alert && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <div>
                    <p className="font-semibold">High Risk Alert</p>
                    <p>{captureResult.high_risk_alert.message}</p>
                    <p className="mt-1 text-xs text-red-700">
                      Recipients: {captureResult.high_risk_alert.recipients.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Captured Evidence</p>
            <div className="mt-3 flex h-52 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Captured road issue" className="h-full w-full object-cover" />
              ) : (
                <p className="text-sm text-slate-500">No image captured yet</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {captureResult && (
        <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              <h3 className="text-base font-bold text-emerald-800">Complaint submitted successfully.</h3>
            </div>
            <p className="mt-2 text-sm font-medium text-emerald-800">Complaint ID: {captureResult.complaint_id}</p>
            <div className="mt-3 grid gap-2 text-sm text-emerald-900 sm:grid-cols-2">
              <p><span className="font-semibold">Severity:</span> {captureResult.severity.toUpperCase()}</p>
              <p><span className="font-semibold">Priority:</span> {captureResult.priority}</p>
              <p><span className="font-semibold">Status:</span> {captureResult.status}</p>
              <p><span className="font-semibold">Road:</span> {captureResult.road_name}</p>
              <p><span className="font-semibold">District:</span> {captureResult.district}</p>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-900">
              <MapPin className="h-4 w-4" />
              <span>{captureResult.latitude}, {captureResult.longitude}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-base font-bold text-[#0d3b5c]">Lifecycle Automation</h3>
            <div className="mt-3 space-y-2 text-sm">
              {captureResult.lifecycle.map((step) => (
                <div key={step.stage} className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="font-semibold text-slate-700">{step.stage}</p>
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{step.status}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
