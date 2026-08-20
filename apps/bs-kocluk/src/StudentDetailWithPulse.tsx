import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { studentName, type CoachData } from './data'
import { ParentSummary, ParentSummaryButton } from './ParentSummary'
import { StudentDetail } from './Student360'
import { StudentPulsePanel } from './StudentPulsePanel'
import { buildStudentPulse } from './studentPulse'

export function StudentDetailWithPulse({ data }: { data: CoachData }) {
  const { studentId = '' } = useParams<{ studentId: string }>()
  const [parentSummaryOpen, setParentSummaryOpen] = useState(false)
  const pulse = useMemo(() => buildStudentPulse(data, studentId), [data, studentId])
  const name = studentName(data, studentId)

  return <div className="student-pulse-route">
    <div className="student-detail-assistant-row">
      <StudentPulsePanel pulse={pulse}/>
      <ParentSummaryButton onClick={() => setParentSummaryOpen(true)}/>
    </div>
    <StudentDetail data={data}/>
    {parentSummaryOpen && <ParentSummary studentId={studentId} studentName={name} onClose={() => setParentSummaryOpen(false)}/>} 
  </div>
}
