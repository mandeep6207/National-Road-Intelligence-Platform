'use client'

import DetectedRoadIssuesSection from '@/components/government/DetectedRoadIssuesSection'
import { AUTHORITY_STATE } from '@/lib/chhattisgarhAuthorityData'

export default function GovernmentDetectedIssuesPage() {
  return (
    <div className="space-y-6">
      <DetectedRoadIssuesSection
        selectedState={AUTHORITY_STATE}
        sectionLabel="Detected Issues"
        title="Detected Road Issues"
      />
    </div>
  )
}
