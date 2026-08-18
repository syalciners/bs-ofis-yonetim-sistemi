import { AlertCircle, Banknote, CalendarCheck2, CalendarPlus, GraduationCap, ReceiptText, UserPlus, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../components/AppDataProvider'
import { Sheet } from '../components/Sheet'
import { LessonForm, StudentForm } from '../components/forms'
import { CollectionQuickForm } from '../components/CollectionQuickForm'
import { LessonCard } from '../components/LessonCard'
import { LessonDetail } from '../components/LessonDetail'
import type { Ders } from '../lib/types'
import { fullDate, money } from '../lib/format'
import { monthCollections, overdueAssignments, studentDebt, studentName, todayLessons, totalOpenDebt, totalTeacherBalance, zoomProblems } from '../services/metrics'

export function OverviewPage() {
  const {data}=useAppData();const nav=useNavigate();const[modal,setModal]=useState<'collection'|'student'|'lesson'|null>(null);const[selected,setSelected]=useState<Ders|null>(null);const[editLesson,setEditLesson]=useState<Ders|null>(null)
  const metrics=useMemo(()=>data?{today:todayLessons(data),collections:monthCollections(data),recentCollections:data.tahsilatlar.filter(x=>!x.iptal_mi).slice(0,3),debt:totalOpenDebt(data),debtors:data.ogrenciler.filter(x=>x.durum!=='Pasif'&&studentDebt(data,x.ogrenci_id)>0).length,teacher:totalTeacherBalance(data),assign:overdueAssignments(data),zoom:zoomProblems(data)}:null,[data])
  if(!data||!metrics)return null
  const attention=[
    {show:metrics.today.filter(x=>x.ders_durumu==='Planlandı').length>0,icon:CalendarCheck2,title:`${metrics.today.filter(x=>x.ders_durumu==='Planlandı').length} planlı ders`,text:'Bugün sonuç bekleyen dersler',go:()=>nav('/takvim')},
    {show:metrics.debtors>0,icon:WalletCards,title:`${metrics.debtors} öğrencide açık bakiye`,text:`${money(metrics.debt)} tahsilat bekliyor`,go:()=>nav('/ogrenciler?filtre=borclu')},
    {show:metrics.assign.length>0,icon:ReceiptText,title:`${metrics.assign.length} geciken ödev`,text:'Son teslim tarihi geçmiş kayıtlar',go:()=>nav('/odevler')},
    {show:metrics.zoom.length>0,icon:AlertCircle,title:`${metrics.zoom.length} Zoom uyarısı`,text:'Kontrol edilmesi gereken online ders',go:()=>nav('/sistem')},
  ].filter(x=>x.show)
  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">YÖNETİM ÖZETİ</span><h1>Bugün</h1></div></section>

    <section className="kpi-grid four">
      <button className="kpi-card teal" onClick={()=>nav('/takvim')}><div className="kpi-icon"><CalendarCheck2/></div><span>Bugünkü Dersler</span><strong>{metrics.today.length}</strong><small>{metrics.today.filter(x=>x.ders_durumu==='Planlandı').length} planlandı</small></button>
      <button className="kpi-card blue" onClick={()=>nav('/finans?tab=tahsilatlar')}><div className="kpi-icon"><Banknote/></div><span>Bu Ay Tahsilat</span><strong>{money(metrics.collections)}</strong><small>gerçek nakit girişi</small></button>
      <button className="kpi-card orange" onClick={()=>nav('/ogrenciler?filtre=borclu')}><div className="kpi-icon"><WalletCards/></div><span>Açık Alacak</span><strong>{money(metrics.debt)}</strong><small>öğrenci bakiyeleri</small></button>
      <button className="kpi-card red" onClick={()=>nav('/finans?tab=ogretmen')}><div className="kpi-icon"><GraduationCap/></div><span>Öğretmen Borcu</span><strong>{money(metrics.teacher)}</strong><small>ödenmemiş hakediş</small></button>
    </section>

    <section><div className="section-heading"><div><h2>Hızlı İşlemler</h2><span>tek dokunuş</span></div></div><div className="quick-actions">
      <button onClick={()=>setModal('collection')}><span className="quick-icon teal"><Banknote/></span><b>Tahsilat Al</b><small>öğrenci ödemesi</small></button>
      <button onClick={()=>setModal('lesson')}><span className="quick-icon blue"><CalendarPlus/></span><b>Ders Ekle</b><small>yeni ders kaydı</small></button>
      <button onClick={()=>setModal('student')}><span className="quick-icon orange"><UserPlus/></span><b>Öğrenci Ekle</b><small>yeni kayıt</small></button>
      <button onClick={()=>nav('/odevler?yeni=1')}><span className="quick-icon green"><ReceiptText/></span><b>Ödev Ekle</b><small>öğrenci ödevi</small></button>
    </div></section>

    <section><div className="section-heading"><div><h2>Son Tahsilatlar</h2><span>son {metrics.recentCollections.length} kayıt</span></div><button className="text-btn" onClick={()=>nav('/finans?tab=tahsilatlar')}>Tümünü Gör</button></div><div className="finance-list">{metrics.recentCollections.length?metrics.recentCollections.map(x=><button className="finance-card income" key={x.tahsilat_id} onClick={()=>nav('/finans?tab=tahsilatlar')}><div className="finance-icon"><Banknote/></div><div><strong>{studentName(data,x.ogrenci_id)}</strong><small>{fullDate(x.tarih)} · {x.odeme_yontemi||'—'}</small></div><b>{money(x.tutar)}</b></button>):<div className="calm-empty"><Banknote/><b>Henüz aktif tahsilat yok.</b><span>İlk tahsilatı “Tahsilat Al” ile kaydedebilirsin.</span></div>}</div></section>

    <section><div className="section-heading"><div><h2>Bugünün Programı</h2><span>{metrics.today.length} ders</span></div><button className="text-btn" onClick={()=>nav('/takvim')}>Tümünü Gör</button></div><div className="list-card">{metrics.today.length?metrics.today.map(x=><LessonCard key={x.ders_id} lesson={x} onClick={()=>setSelected(x)}/>):<div className="calm-empty"><CalendarCheck2/><b>Bugün ders yok.</b><span>Yeni ders ekleyebilir veya Takvim ekranından haftayı oluşturabilirsin.</span></div>}</div></section>

    <section><div className="section-heading"><div><h2>Dikkat Gerektirenler</h2><span>yalnız gerekenler</span></div></div>{attention.length?<div className="attention-grid">{attention.map((x,i)=><button key={i} onClick={x.go}><span className="attention-icon"><x.icon/></span><span><b>{x.title}</b><small>{x.text}</small></span></button>)}</div>:<div className="all-good"><CalendarCheck2/><span><b>Kontrol bekleyen kritik iş yok.</b><small>Günlük akış normal görünüyor.</small></span></div>}</section>

    <Sheet open={modal==='collection'} title="Tahsilat Al" subtitle="Öğrenciyi seç; güncel bakiye otomatik gösterilir." onClose={()=>setModal(null)}><CollectionQuickForm onDone={()=>setModal(null)} onCancel={()=>setModal(null)}/></Sheet>
    <Sheet open={modal==='student'} title="Yeni Öğrenci" subtitle="Yalnız gerekli bilgileri girin." onClose={()=>setModal(null)}><StudentForm onDone={()=>setModal(null)} onCancel={()=>setModal(null)}/></Sheet>
    <Sheet open={modal==='lesson'} title="Ders Ekle" subtitle="Uygunluk kaydetmeden önce otomatik kontrol edilir." onClose={()=>setModal(null)}><LessonForm onDone={()=>setModal(null)} onCancel={()=>setModal(null)}/></Sheet>
    <Sheet open={!!selected&&!editLesson} title="Ders Detayı" subtitle="Ders sonucu ve hızlı işlemler" onClose={()=>setSelected(null)}>{selected&&<LessonDetail lesson={selected} onDone={()=>setSelected(null)} onEdit={()=>{setEditLesson(selected);setSelected(null)}}/>}</Sheet>
    <Sheet open={!!editLesson} title="Dersi Düzenle" subtitle="Tarih, saat ve ders bilgileri" onClose={()=>setEditLesson(null)}>{editLesson&&<LessonForm lesson={editLesson} onDone={()=>setEditLesson(null)} onCancel={()=>setEditLesson(null)}/>}</Sheet>
  </div>
}
