'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { AlertTriangle, Camera, CheckCircle2, Loader2, MapPin, Video } from 'lucide-react'
import { useAdminControlCenter, type SimulationSeverity } from '@/components/admin/AdminControlCenterContext'
import {
  captureRoadIssue,
  detectDashcamWithAi,
  getWebcamStreamUrl,
  getWebcamDetectionStatus,
  recordCitizenReportEvent,
  type AiDashcamDetectionResult,
  type AiWebcamDetectionStatus,
  type MonitoringCaptureResult,
} from '@/lib/api'

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

function webcamSeverityToSimulationSeverity(severity?: AiWebcamDetectionStatus['severity']): SimulationSeverity {
  if (severity === 'HIGH') return 'critical'
  if (severity === 'MEDIUM') return 'medium'
  return 'minor'
}

function webcamSeverityToPriority(severity?: AiWebcamDetectionStatus['severity']) {
  if (severity === 'HIGH') return 'HIGH' as const
  if (severity === 'MEDIUM') return 'MEDIUM' as const
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
  const [dashcamProcessing, setDashcamProcessing] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [webcamStreamActive, setWebcamStreamActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [captureResult, setCaptureResult] = useState<MonitoringCaptureResult | null>(null)
  const [dashcamResult, setDashcamResult] = useState<AiDashcamDetectionResult | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [webcamDetection, setWebcamDetection] = useState<AiWebcamDetectionStatus | null>(null)
  const [webcamReportedTime, setWebcamReportedTime] = useState('')
  const [webcamStatusMessage, setWebcamStatusMessage] = useState('')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const dashcamInputRef = useRef<HTMLInputElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastComplaintIdRef = useRef<string | null>(null)
  const webcamRunningRef = useRef(false)

  function updateStatus(data: AiWebcamDetectionStatus) {
    setWebcamDetection(data)
    setWebcamReportedTime(new Date().toLocaleString())
  }

  function submitWebcamComplaint(data: AiWebcamDetectionStatus) {
    if (!data.complaint_id) return

    const createdAt = data.timestamp ?? new Date().toISOString()
    const complaintDistrict = data.district || selectedDistrict
    const complaintState = data.state || selectedState

    submitComplaint({
      complaintId: data.complaint_id,
      state: complaintState,
      district: complaintDistrict,
      pincode: data.pincode || selectedPincode,
      issueLocation: `Live webcam capture, ${complaintDistrict}`,
      roadName: 'Live webcam monitored road',
      severity: webcamSeverityToSimulationSeverity(data.severity),
      priority: webcamSeverityToPriority(data.severity),
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      description: 'AI auto-detected pothole from live webcam stream.',
      reportSource: 'citizen',
      issueImageName: data.image || '',
      reporterName: userName,
      reporterEmail: userEmail,
      assignedAuthority: `${complaintDistrict} District Authority`,
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
      createdAt,
      updatedAt: createdAt,
      status: 'ASSIGNED_TO_AUTHORITY',
    })
  }

  async function startWebcamStream() {
    if (webcamRunningRef.current) return
    setWebcamStatusMessage('')
    setWebcamDetection({ pothole_detected: false })
    webcamRunningRef.current = true
    setWebcamStreamActive(true)
  }

  async function stopWebcamStream() {
    webcamRunningRef.current = false
    stopCamera()
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    lastComplaintIdRef.current = null
    setWebcamStreamActive(false)
    setWebcamDetection(null)
    setWebcamStatusMessage('Camera stopped')

    try {
      await fetch(`${getWebcamStreamUrl().replace('/detect-webcam', '')}/detect-webcam-stop`, {
        method: 'POST',
      })
    } catch {
      // backend may already be stopped
    }
  }

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

  // Start / stop polling /detect-webcam-status when webcam stream toggles
  useEffect(() => {
    if (!webcamStreamActive) {
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      setWebcamDetection(null)
      setWebcamReportedTime('')
      lastComplaintIdRef.current = null
      return
    }

    async function poll() {
      if (!webcamRunningRef.current) return
      try {
        const status = await getWebcamDetectionStatus()
        if (!webcamRunningRef.current) return
        if (status.pothole_detected && status.complaint_id) {
          if (status.complaint_id !== lastComplaintIdRef.current) {
            lastComplaintIdRef.current = status.complaint_id
            updateStatus(status)
            storeAiComplaint(status)
            submitWebcamComplaint(status)
            setWebcamStatusMessage('')
          }
        } else {
          lastComplaintIdRef.current = null
          setWebcamDetection({ pothole_detected: false })
          setWebcamReportedTime('')
        }
      } catch {
        // backend not available — silently skip
      }
    }

    poll()
    pollIntervalRef.current = setInterval(poll, 2000)

    return () => {
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webcamStreamActive])

  function storeAiComplaint(data: AiWebcamDetectionStatus) {
    if (typeof window === 'undefined') return
    try {
      const existing = JSON.parse(localStorage.getItem('ai_detected_complaints') || '[]') as AiWebcamDetectionStatus[]
      const alreadyStored = existing.some((c) => c.complaint_id === data.complaint_id)
      if (!alreadyStored) {
        existing.push({ ...data, timestamp: data.timestamp ?? new Date().toISOString() })
        localStorage.setItem('ai_detected_complaints', JSON.stringify(existing))
      }
    } catch {
      // ignore storage errors
    }
  }

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
    setDashcamResult(null)
    fileInputRef.current?.click()
  }

  function openDashcamPicker() {
    setError('')
    setCameraError('')
    setDashcamResult(null)
    dashcamInputRef.current?.click()
  }

  async function processImageFile(file: File, sourceType: 'citizen_mobile' = 'citizen_mobile') {
    setCapturing(true)
    setError('')
    setCaptureResult(null)
    setDashcamResult(null)

    try {
      const location = await readCurrentPosition()
      const result = await captureRoadIssue({
        imageFile: file,
        sourceType,
        latitude: location.latitude,
        longitude: location.longitude,
        state: selectedState,
        district: selectedDistrict,
        pincode: selectedPincode,
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
        issueImageName: result.image_url || '',
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
      const message = captureError?.message || 'Capture failed. Please try again.'
      setError(message)
    } finally {
      setCapturing(false)
    }
  }

  async function handleDashcamFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.toLowerCase().startsWith('video/')) {
      setError('Only video files are supported for dashcam mode.')
      event.target.value = ''
      return
    }

    setDashcamProcessing(true)
    setError('')

    try {
      const result = await detectDashcamWithAi(file)
      setDashcamResult(result)
    } catch (dashcamError: any) {
      setError(dashcamError?.message || 'Dashcam detection failed. Please try again.')
    } finally {
      setDashcamProcessing(false)
      event.target.value = ''
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

              <button
                type="button"
                onClick={openDashcamPicker}
                disabled={capturing || dashcamProcessing}
                className="inline-flex items-center gap-2 rounded-xl border border-[#0d3b5c] bg-white px-4 py-2.5 text-sm font-semibold text-[#0d3b5c] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Video className="h-4 w-4" />
                Upload Dashcam
              </button>

              {webcamStreamActive ? (
                <button
                  type="button"
                  onClick={stopWebcamStream}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#0d3b5c] bg-white px-4 py-2.5 text-sm font-semibold text-[#0d3b5c] hover:bg-slate-50"
                >
                  Stop Webcam Stream
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startWebcamStream}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#0d3b5c] bg-white px-4 py-2.5 text-sm font-semibold text-[#0d3b5c] hover:bg-slate-50"
                >
                  Start Webcam Stream
                </button>
              )}

              {(capturing || dashcamProcessing) && (
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0d3b5c]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {capturing ? 'Processing AI Detection...' : 'Processing Dashcam...'}
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

            <input
              id="citizen-dashcam-input"
              type="file"
              accept="video/*,.mp4,.mov,.avi,.mkv"
              onChange={handleDashcamFile}
              ref={dashcamInputRef}
              className="hidden"
              disabled={capturing || dashcamProcessing}
            />

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-[#0d3b5c]">Automated Flow</p>
              <p className="mt-1">Capture image or dashcam video -&gt; AI detection engine -&gt; severity classification -&gt; citizen workflow update.</p>
            </div>

            {webcamStreamActive && (
              <div className="camera-section rounded-xl border border-[#0d3b5c]/30 bg-[#f1f7fc] p-4">
                <p className="text-sm font-semibold text-[#0d3b5c]">Live Webcam Detection Stream</p>
                <div className="mt-3 block">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img id="webcam" src={getWebcamStreamUrl()} alt="Webcam detection stream" className="h-56 w-full object-cover sm:h-64" />
                  </div>

                  <div id="detectionStatus" className="mt-3 w-full rounded-md bg-[#1a1a1a] px-3 py-3 text-sm text-white">
                    {webcamDetection?.pothole_detected ? (
                      <>
                        <p className="font-semibold text-red-300">⚠ ROAD DAMAGE DETECTED</p>
                        <p>Complaint ID : {webcamDetection.complaint_id}</p>
                        <p>Severity : {webcamDetection.severity}</p>
                        <p>Location : {webcamDetection.district}, {webcamDetection.state}</p>
                        <p>Latitude : {webcamDetection.latitude}</p>
                        <p>Longitude : {webcamDetection.longitude}</p>
                        <p>Reported Time : {webcamReportedTime}</p>
                        {webcamDetection.image && (
                          <div className="mt-3 overflow-hidden rounded-lg border border-red-200 bg-black/5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={webcamDetection.image} alt="Detected pothole snapshot" className="h-40 w-full object-cover" />
                          </div>
                        )}
                      </>
                    ) : (
                      <p>Road clear — no pothole detected</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!webcamStreamActive && webcamStatusMessage && (
              <div className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {webcamStatusMessage}
              </div>
            )}

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
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="flex h-52 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Original capture" className="h-full w-full object-cover" />
                ) : (
                  <p className="text-sm text-slate-500">No original image</p>
                )}
              </div>
              <div className="flex h-52 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                {captureResult?.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={captureResult.image_url} alt="Detected pothole image" className="h-full w-full object-cover" />
                ) : (
                  <p className="text-sm text-slate-500">No detected image</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {dashcamResult && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-bold text-[#0d3b5c]">Dashcam Detection Summary</h3>
          <p className="mt-1 text-sm text-slate-600">
            Sample interval: {dashcamResult.sample_every_seconds}s | Frames scanned: {dashcamResult.total_frames} | Frames sampled: {dashcamResult.sampled_frames}
          </p>

          <div className="mt-4 space-y-3">
            {dashcamResult.detections.length === 0 && (
              <p className="text-sm text-slate-600">No pothole was detected in sampled dashcam frames.</p>
            )}

            {dashcamResult.detections.map((item) => (
              <div key={`${item.frame_number}-${item.confidence}`} className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-700">
                  Frame {item.frame_number} | Severity: {item.severity} | Confidence: {item.confidence.toFixed(2)}
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.annotated_frame_url} alt={`Dashcam frame ${item.frame_number}`} className="mt-2 h-48 w-full rounded-lg object-cover" />
              </div>
            ))}
          </div>
        </section>
      )}

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
