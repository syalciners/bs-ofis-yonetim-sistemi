from pathlib import Path
p=Path('src/pages/FixedProgramPage.tsx')
s=p.read_text()
old="  const draggedProgram=dragView?selectedPrograms.find(x=>x.program_id===dragView.programId):null\n  const dragRoom=dragView?.target?roomColumns.find(x=>x.id===dragView.target.roomId):null\n"
new="  const draggedProgram=dragView?selectedPrograms.find(x=>x.program_id===dragView.programId):null\n  const dragRoomTarget=dragView?.target||null\n  const dragRoom=dragRoomTarget?roomColumns.find(x=>x.id===dragRoomTarget.roomId):null\n"
if s.count(old)!=1: raise SystemExit(f'Beklenen blok bulunamadı: {s.count(old)}')
p.write_text(s.replace(old,new,1))
