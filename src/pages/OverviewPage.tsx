import { AlertCircle, Banknote, CalendarCheck2, CalendarPlus, GraduationCap, ReceiptText, UserPlus, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../components/AppDataProvider'
import { Sheet } from '../components/Sheet'
import { LessonForm, StudentForm } from '../components/forms'
import { CollectionQuickForm } from '../components/CollectionQuickForm'
import { LessonCard } from '../components/LessonCard'
import { LessonDetail } from '../components/LessonDetail'
import { featureEnabled, t } from '../lib/productProfile'
import { APP_MODE } from '../lib/supabase'
import type { Ders } from '../lib/types'
import { fullDate, money } from '../lib/format'
import { monthCollections, overdueAssignments, studentDebt, studentName, todayLessons, totalOpenDebt, totalTeacherBalance, zoomProblems } from '../services/metrics'

export function OverviewPage() {
  const {data}=useAppData();const nav=useNavigate();const[modal,setModal]=useState<'collection'|'student'|'lesson'|null>(null);const[selected,setSelected]=useState<Ders|null>(null);const[editLesson,setEditLesson]=useState<Ders|null>(null)
  const metrics=useMemo(()=>data?{today:todayLessons(data),collections:monthCollections(data),recentCollections:data.tahsilatlar.filter(x=>!x.iptal_mi).slice(0,3),debt:totalOpenDebt(data),debtors:data.ogrenciler.filter(x=>x.durum!=='Pasif'&&studentDebt(data,x.ogrenci_id)>0).length,teacher:totalTeacherBalance(data),assign:overdueAssignments(data),zoom:zoomProblems(data)}:null,[data])
  if(!data||!metrics)return null
  const isDemo=APP_MODE==='demo'
  const assignmentsEnabled=featureEnabled('assignments')
  const artsProfile=featureEnabled('groups')
  const todayLessonHours=metrics.today.reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)
  const plannedLessonHours=metrics.today.filter(x=>x.ders_durumu==='Planlandı').reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)
  const branchPulse=artsProfile?data.branslar.filter(x=>x.aktif!==false).map(branch=>{
    const programs=data.sabitProgramlar.filter(x=>x.brans_id===branch.brans_id&&x.aktif!==false&&x.program_durumu!=='Pasif')
    const students=new Set(programs.map(x=>x.ogrenci_id).filter(Boolean)).size
    const todayHours=metrics.today.filter(x=>x.brans_id===branch.brans_id).reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0)
    return{id:branch.brans_id,name:branch.brans_adi,students,todayHours}
  }).sort((a,b)=>b.students-a.students||b.todayHours-a.todayHours||a.name.localeCompare(b.name,'tr')).slice(0,6):[]
  const attention=[
    {show:plannedLessonHours>0,icon:CalendarCheck2,title:`${plannedLessonHours} planlı ders saati`,text:'Bugün sonuç bekleyen dersler',go:()=>nav('/takvim')},
    {show:metrics.debtors>0,icon:WalletCards,title:`${metrics.debtors} ${t.studentLower}de açık bakiye`,text:`${money(metrics.debt)} tahsilat bekliyor`,go:()=>nav('/ogrenciler?filtre=borclu')},
    {show:assignmentsEnabled&&metrics.assign.length>0,icon:ReceiptText,title:`${metrics.assign.length} geciken ödev`,text:'Son teslim tarihi geçmiş kayıtlar',go:()=>nav('/odevler')},
    {show:metrics.zoom.length>0,icon:AlertCircle,title:`${metrics.zoom.length} Zoom uyarısı`,text:'Kontrol edilmesi gereken online ders',go:()=>nav('/sistem')},
  ].filter(x=>x.show)
  return <div className="page-stack artistic-overview">
    <section className="page-title-row"><div><span className="eyebrow">YÖNETİM ÖZETİ</span><h1>Bugün</h1>{artsProfile&&<p>Kursunuzun ritmi, ders akışı ve finans görünümü.</p>}</div></section>

    {isDemo&&<section className="demo-discovery" aria-label="Önerilen demo rotası">
      <div className="demo-discovery-copy"><span>ÖNERİLEN DEMO ROTASI</span><h2>Demoyu 3 adımda keşfedin</h2><p>Örnek veriler üzerinden günlük yönetim akışının en güçlü üç bölümünü deneyin.</p></div>
      <div className="demo-discovery-actions">
        <button type="button" onClick={()=>nav('/ogrenciler')}><span className="demo-discovery-step">1</span><span><b>{t.student} ve bakiye</b><small>{t.student} kartı, açık bakiye ve tahsilat geçmişi</small></span><UserPlus/></button>
        <button type="button" onClick={()=>nav('/takvim')}><span className="demo-discovery-step">2</span><span><b>Takvim ve ders</b><small>Haftalık program, ders sonucu ve günlük akış</small></span><CalendarCheck2/></button>
        <button type="button" onClick={()=>nav('/finans')}><span className="demo-discovery-step">3</span><span><b>Finans ve rapor</b><small>Tahsilat, gider ve {t.teacherLower} hakediş özetleri</small></span><Banknote/></button>
      </div>
    </section>}

    <section className="kpi-grid four">
      <button className="kpi-card teal" onClick={()=>nav('/takvim')}><div className="kpi-icon"><CalendarCheck2/></div><span>Bugünkü Ders Saati</span><strong>{todayLessonHours}</strong><small>{plannedLessonHours} planlandı</small></button>
      <button className="kpi-card blue" onClick={()=>nav('/finans?tab=tahsilatlar')}><div className="kpi-icon"><Banknote/></div><span>Bu Ay Tahsilat</span><strong>{money(metrics.collections)}</strong><small>gerçek nakit girişi</small></button>
      <button className="kpi-card orange" onClick={()=>nav('/ogrenciler?filtre=borclu')}><div className="kpi-icon"><WalletCards/></div><span>Açık Alacak</span><strong>{money(metrics.debt)}</strong><small>{t.studentLower} bakiyeleri</small></button>
      <button className="kpi-card red" onClick={()=>nav('/finans?tab=ogretmen')}><div className="kpi-icon"><GraduationCap/></div><span>{t.teacher} Borcu</span><strong>{money(metrics.teacher)}</strong><small>ödenmemiş hakediş</small></button>
    </section>

    {artsProfile&&branchPulse.length>0&&<section className="branch-pulse-section">
      <div className="section-heading"><div><h2>Branş Nabzı</h2><span>aktif program yoğunluğu</span></div><button className="text-btn" onClick={()=>nav('/takvim')}>Programı Aç</button></div>
      <div className="branch-pulse-grid">{branchPulse.map((branch,index)=><button className={`branch-pulse-card branch-pulse-tone-${(index%4)+1}`} key={branch.id} onClick={()=>nav('/takvim')}>
        <span className="branch-pulse-mark" aria-hidden="true">{String(index+1).padStart(2,'0')}</span>
        <span className="branch-pulse-copy"><small>{t.branch}</small><b>{branch.name}</b><em>{branch.students} aktif {t.studentLower}{branch.todayHours?` · bugün ${branch.todayHours} saat`:''}</em></span>
      </button>)}</div>
    </section>}

    <section><div className="section-heading"><div><h2>Hızlı İşlemler</h2><span>tek dokunuş</span></div></div><div className="quick-actions">
      <button onClick={()=>setModal('collection')}><span className="quick-icon teal"><Banknote/></span><b>Tahsilat Al</b><small>{t.studentLower} ödemesi</small></button>
      <button onClick={()=>setModal('lesson')}><span className="quick-icon blue"><CalendarPlus/></span><b>Ders Ekle</b><small>yeni ders kaydı</small></button>
      <button onClick={()=>setModal('student')}><span className="quick-icon orange"><UserPlus/></span><b>{t.student} Ekle</b><small>yeni kayıt</small></button>
      {assignmentsEnabled&&<button onClick={()=>nav('/odevler?yeni=1')}><span className="quick-icon green"><ReceiptText/></span><b>Ödev Ekle</b><small>{t.studentLower} ödevi</small></button>}
    </div></section>

    <section><div className="section-heading"><div><h2>Son Tahsilatlar</h2><span>son {metrics.recentCollections.length} kayıt</span></div><button className="text-btn" onClick={()=>nav('/finans?tab=tahsilatlar')}>Tümünü Gör</button></div><div className="finance-list">{metrics.recentCollections.length?metrics.recentCollections.map(x=><button className="finance-card income" key={x.tahsilat_id} onClick={()=>nav('/finans?tab=tahsilatlar')}><div className="finance-icon"><Banknote/></div><div><strong>{studentName(data,x.ogrenci_id)}</strong><small>{fullDate(x.tarih)} · {x.odeme_yontemi||'—'}</small></div><b>{money(x.tutar)}</b></button>):<div className="calm-empty"><Banknote/><b>Henüz aktif tahsilat yok.</b><span>İlk tahsilatı “Tahsilat Al” ile kaydedebilirsin.</span></div>}</div></section>

    <section><div className="section-heading"><div><h2>Bugünün Programı</h2><span>{todayLessonHours} ders saati</span></div><button className="text-btn" onClick={()=>nav('/takvim')}>Tümünü Gör</button></div><div className="list-card">{metrics.today.length?metrics.today.map(x=><LessonCard key={x.ders_id} lesson={x} onClick={()=>setSelected(x)}/>):<div className="calm-empty"><CalendarCheck2/><b>Bugün ders yok.</b><span>Yeni ders ekleyebilir veya Takvim ekranından haftayı oluşturabilirsin.</span></div>}</div></section>

    <section><div className="section-heading"><div><h2>Dikkat Gerektirenler</h2><span>yalnız gerekenler</span></div></div>{attention.length?<div className="attention-grid">{attention.map((x,i)=><button key={i} onClick={x.go}><span className="attention-icon"><x.icon/></span><span><b>{x.title}</b><small>{x.text}</small></span></button>)}</div>:<div className="all-good"><CalendarCheck2/><span><b>Kontrol bekleyen kritik iş yok.</b><small>Günlük akış normal görünüyor.</small></span></div>}</section>

    <Sheet open={modal==='collection'} title="Tahsilat Al" subtitle={`${t.student} seç; güncel bakiye otomatik gösterilir.`} onClose={()=>setModal(null)}><CollectionQuickForm onDone={()=>setModal(null)} onCancel={()=>setModal(null)}/></Sheet>
    <Sheet open={modal==='student'} title={`Yeni ${t.student}`} subtitle="Yalnız gerekli bilgileri girin." onClose={()=>setModal(null)}><StudentForm onDone={()=>setModal(null)} onCancel={()=>setModal(null)}/></Sheet>
    <Sheet open={modal==='lesson'} title="Ders Ekle" subtitle="Uygunluk kaydetmeden önce otomatik kontrol edilir." onClose={()=>setModal(null)}><LessonForm onDone={()=>setModal(null)} onCancel={()=>setModal(null)}/></Sheet>
    <Sheet open={!!selected&&!editLesson} title="Ders Detayı" subtitle="Ders sonucu ve hızlı işlemler" onClose={()=>setSelected(null)}>{selected&&<LessonDetail lesson={selected} onDone={()=>setSelected(null)} onEdit={()=>{setEditLesson(selected);setSelected(null)}}/>}</Sheet>
    <Sheet open={!!editLesson} title="Dersi Düzenle" subtitle="Tarih, saat ve ders bilgileri" onClose={()=>setEditLesson(null)}>{editLesson&&<LessonForm lesson={editLesson} onDone={()=>setEditLesson(null)} onCancel={()=>setEditLesson(null)}/>}</Sheet>
  </div>
}
