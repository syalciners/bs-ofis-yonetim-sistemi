import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { studentName, type CoachData } from './data'
import { ParentCommunicationHistory } from './ParentCommunicationHistory'
import { ParentSummary, ParentSummaryButton } from './ParentSummary'
import { StudentDetail } from './Student360'
import { StudentDevelopmentPanel } from './StudentDevelopmentPanel'
import { StudentPulsePanel } from './StudentPulsePanel'
import { buildStudentPulse } from './studentPulse'

export function StudentDetailWithPulse({ data }: { data: CoachData }) {
  const { studentId = '' } = useParams<{ studentId: string }>()
  const [params, setParams] = useSearchParams()
  const [historyVersion, setHistoryVersion] = useState(0)
  const parentSummaryOpen = params.get('veli') === '1'
  const pulse = useMemo(() => buildStudentPulse(data, studentId), [data, studentId])
  const name = studentName(data, studentId)

  const setParentSummaryOpen = (open: boolean) => {
    const next = new URLSearchParams(params)
    if (open) next.set('veli', '1')
    else next.delete('veli')
    setParams(next, { replace: true })
  }

  return <div className="student-pulse-route">
    <StudentPulsePanel pulse={pulse}/>
    <StudentDevelopmentPanel data={data} studentId={studentId}/>
    <div className="student-detail-assistant-row"><ParentSummaryButton onClick={() => setParentSummaryOpen(true)}/></div>
    <StudentDetail data={data}/>
    <ParentCommunicationHistory studentId={studentId} refreshKey={historyVersion}/>
    {parentSummaryOpen && <ParentSummary studentId={studentId} studentName={name} onClose={() => setParentSummaryOpen(false)} onLogged={() => setHistoryVersion(value => value + 1)}/>} 
  </div>
}
