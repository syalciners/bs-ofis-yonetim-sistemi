import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import type { CoachData } from './data'
import { StudentDetail } from './Student360'
import { StudentPulsePanel } from './StudentPulsePanel'
import { buildStudentPulse } from './studentPulse'

export function StudentDetailWithPulse({ data }: { data: CoachData }) {
  const { studentId = '' } = useParams<{ studentId: string }>()
  const pulse = useMemo(() => buildStudentPulse(data, studentId), [data, studentId])

  return <div className="student-pulse-route">
    <StudentPulsePanel pulse={pulse}/>
    <StudentDetail data={data}/>
  </div>
}
