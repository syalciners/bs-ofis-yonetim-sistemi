import { BookOpenCheck, CheckCircle2, Edit3, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAppData } from '../components/AppDataProvider'
import { Sheet } from '../components/Sheet'
import { AssignmentForm, AssignmentStatusForm } from '../components/forms'
import type { Odev } from '../lib/types'
import { fullDate, todayISO } from '../lib/format'
import { studentName, teacherName } from '../services/metrics'

type Filter='bekleyen'|'geciken'|'tamamlanan'|'tumu'
const completed=(x:Odev)=>['Tamamlandı','Teslim Edildi'].includes(x.durum)
const overdue=(x:Odev)=>!completed(x)&&Boolean(x.son_teslim_tarihi&&x.son_teslim_tarihi<todayISO())

export function AssignmentsPage(){
  const{data}=useAppData();const[selected,setSelected]=useState<Odev|null>(null);const[edit,setEdit]=useState<Odev|null>(null);const[status,setStatus]=useState<Odev|null>(null);const[add,setAdd]=useState(false);const[filter,setFilter]=useState<Filter>('bekleyen');
  const rows=useMemo(()=>{if(!data)return[];return [...data.odevler].filter(x=>filter==='tumu'||filter==='tamamlanan'?filter==='tumu'||completed(x):filter==='geciken'?overdue(x):!completed(x)).sort((a,b)=>String(a.son_teslim_tarihi||'9999').localeCompare(String(b.son_teslim_tarihi||'9999')))},[data,filter]);if(!data)return null
  const pending=data.odevler.filter(x=>!completed(x)).length,late=data.odevler.filter(overdue).length,done=data.odevler.filter(completed).length
  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">ÖDEV TAKİBİ</span><h1>Ödevler</h1><p>Bekleyen teslimler ve öğrenci işleri.</p></div><button className="primary-btn" onClick={()=>setAdd(true)}><Plus size={17}/>Ödev Ekle</button></section>
    <div className="segmented four-seg"><button className={filter==='bekleyen'?'active':''} onClick={()=>setFilter('bekleyen')}>Bekleyen · {pending}</button><button className={filter==='geciken'?'active':''} onClick={()=>setFilter('geciken')}>Geciken · {late}</button><button className={filter==='tamamlanan'?'active':''} onClick={()=>setFilter('tamamlanan')}>Tamamlanan · {done}</button><button className={filter==='tumu'?'active':''} onClick={()=>setFilter('tumu')}>Tümü</button></div>
    <section className="finance-list">{rows.length?rows.map(x=>{const isLate=overdue(x);return <button className={`finance-card ${isLate?'expense':''}`} key={x.odev_id} onClick={()=>setSelected(x)}><div className="finance-icon"><BookOpenCheck/></div><div><strong>{x.odev_basligi||x.konu||'Ödev'}</strong><small>{studentName(data,x.ogrenci_id)} · {teacherName(data,x.ogretmen_id)} · Son: {fullDate(x.son_teslim_tarihi)}</small></div><span className="soft-pill">{isLate?'Gecikti':x.durum}</span></button>}):<div className="calm-empty"><BookOpenCheck/><b>{filter==='bekleyen'?'Bekleyen ödev yok.':filter==='geciken'?'Geciken ödev yok.':'Bu filtrede ödev yok.'}</b><span>{filter==='bekleyen'?'Yeni ödev ekleyebilir veya tamamlananları görüntüleyebilirsin.':'Başka bir filtre seçebilirsin.'}</span></div>}</section>
    <Sheet open={!!selected&&!edit&&!status} title={selected?.odev_basligi||selected?.konu||'Ödev'} subtitle={selected?studentName(data,selected.ogrenci_id):''} onClose={()=>setSelected(null)}>{selected&&<div className="detail-stack"><div className="mini-grid two"><div><span>Öğretmen</span><b>{teacherName(data,selected.ogretmen_id)}</b></div><div><span>Durum</span><b className={overdue(selected)?'danger-text':''}>{overdue(selected)?'Gecikti':selected.durum}</b></div><div><span>Veriliş</span><b>{fullDate(selected.verilis_tarihi)}</b></div><div><span>Son Teslim</span><b>{fullDate(selected.son_teslim_tarihi)}</b></div></div>{selected.odev_aciklamasi&&<div className="note-box">{selected.odev_aciklamasi}</div>}{selected.ogretmen_notu&&<div className="note-box">Öğretmen notu: {selected.ogretmen_notu}</div>}<div className="quick-detail-actions"><button className="primary-btn" onClick={()=>setStatus(selected)}><CheckCircle2 size={17}/>Durumu Güncelle</button><button className="secondary-btn" onClick={()=>setEdit(selected)}><Edit3 size={17}/>Düzenle</button></div></div>}</Sheet>
    <Sheet open={add} title="Yeni Ödev" subtitle="Öğrenciye yeni görev ekle." onClose={()=>setAdd(false)}><AssignmentForm onDone={()=>setAdd(false)} onCancel={()=>setAdd(false)}/></Sheet>
    <Sheet open={!!edit} title="Ödevi Düzenle" subtitle={edit?studentName(data,edit.ogrenci_id):''} onClose={()=>setEdit(null)}>{edit&&<AssignmentForm assignment={edit} onDone={()=>setEdit(null)} onCancel={()=>setEdit(null)}/>}</Sheet>
    <Sheet open={!!status} title="Ödev Durumu" subtitle={status?studentName(data,status.ogrenci_id):''} onClose={()=>setStatus(null)}>{status&&<AssignmentStatusForm assignment={status} onDone={()=>setStatus(null)} onCancel={()=>setStatus(null)}/>}</Sheet>
  </div>
}
