import { BookOpenCheck, CheckCircle2, Edit3, Plus } from 'lucide-react'
import { useState } from 'react'
import { useAppData } from '../components/AppDataProvider'
import { Sheet } from '../components/Sheet'
import { AssignmentForm, AssignmentStatusForm } from '../components/forms'
import type { Odev } from '../lib/types'
import { fullDate } from '../lib/format'
import { studentName, teacherName } from '../services/metrics'

export function AssignmentsPage(){
  const{data}=useAppData();const[selected,setSelected]=useState<Odev|null>(null);const[edit,setEdit]=useState<Odev|null>(null);const[status,setStatus]=useState<Odev|null>(null);const[add,setAdd]=useState(false);if(!data)return null
  const rows=[...data.odevler].sort((a,b)=>String(a.son_teslim_tarihi||'9999').localeCompare(String(b.son_teslim_tarihi||'9999')))
  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">ÖDEV TAKİBİ</span><h1>Ödevler</h1><p>Bekleyen teslimler ve öğrenci işleri.</p></div><button className="primary-btn" onClick={()=>setAdd(true)}><Plus size={17}/>Ödev Ekle</button></section>
    <section className="finance-list">{rows.length?rows.map(x=><button className="finance-card" key={x.odev_id} onClick={()=>setSelected(x)}><div className="finance-icon"><BookOpenCheck/></div><div><strong>{x.odev_basligi||x.konu||'Ödev'}</strong><small>{studentName(data,x.ogrenci_id)} · {teacherName(data,x.ogretmen_id)} · Son: {fullDate(x.son_teslim_tarihi)}</small></div><span className="soft-pill">{x.durum}</span></button>):<div className="calm-empty"><BookOpenCheck/><b>Ödev kaydı yok.</b><span>Ödev eklediğinde burada görünür.</span></div>}</section>
    <Sheet open={!!selected&&!edit&&!status} title={selected?.odev_basligi||selected?.konu||'Ödev'} subtitle={selected?studentName(data,selected.ogrenci_id):''} onClose={()=>setSelected(null)}>{selected&&<div className="detail-stack"><div className="mini-grid two"><div><span>Öğretmen</span><b>{teacherName(data,selected.ogretmen_id)}</b></div><div><span>Durum</span><b>{selected.durum}</b></div><div><span>Veriliş</span><b>{fullDate(selected.verilis_tarihi)}</b></div><div><span>Son Teslim</span><b>{fullDate(selected.son_teslim_tarihi)}</b></div></div>{selected.odev_aciklamasi&&<div className="note-box">{selected.odev_aciklamasi}</div>}{selected.ogretmen_notu&&<div className="note-box">Öğretmen notu: {selected.ogretmen_notu}</div>}<div className="quick-detail-actions"><button className="primary-btn" onClick={()=>{setStatus(selected);setSelected(null)}}><CheckCircle2 size={17}/>Durumu Güncelle</button><button className="secondary-btn" onClick={()=>{setEdit(selected);setSelected(null)}}><Edit3 size={17}/>Düzenle</button></div></div>}</Sheet>
    <Sheet open={add} title="Yeni Ödev" subtitle="Öğrenciye yeni görev ekle." onClose={()=>setAdd(false)}><AssignmentForm onDone={()=>setAdd(false)} onCancel={()=>setAdd(false)}/></Sheet>
    <Sheet open={!!edit} title="Ödevi Düzenle" subtitle={edit?studentName(data,edit.ogrenci_id):''} onClose={()=>setEdit(null)}>{edit&&<AssignmentForm assignment={edit} onDone={()=>setEdit(null)} onCancel={()=>setEdit(null)}/>}</Sheet>
    <Sheet open={!!status} title="Ödev Durumu" subtitle={status?studentName(data,status.ogrenci_id):''} onClose={()=>setStatus(null)}>{status&&<AssignmentStatusForm assignment={status} onDone={()=>setStatus(null)} onCancel={()=>setStatus(null)}/>}</Sheet>
  </div>
}
