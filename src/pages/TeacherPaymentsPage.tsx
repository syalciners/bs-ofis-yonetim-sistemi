import { Banknote, CalendarRange, CheckCircle2, GraduationCap, Plus, WalletCards, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppData } from '../components/AppDataProvider'
import { Sheet } from '../components/Sheet'
import { TeacherPaymentQuickForm } from '../components/TeacherPaymentQuickForm'
import { TeacherSectionNav } from '../components/TeacherSectionNav'
import { useToast } from '../components/Toast'
import { fullDate, money, todayISO } from '../lib/format'
import { teacherTone } from '../lib/teacherTone'
import { cancelTeacherPayment } from '../services/financeCancelService'
import { teacherName } from '../services/metrics'

export function TeacherPaymentsPage(){
  const {data,refresh}=useAppData();const{toast}=useToast();const[params]=useSearchParams();const today=todayISO()
  const periods=useMemo(()=>data?data.hakedisDonemleri.filter(x=>x.aktif!==false&&x.baslangic_tarihi<=today).sort((a,b)=>b.baslangic_tarihi.localeCompare(a.baslangic_tarihi)):[],[data,today])
  const currentPeriod=periods.find(x=>today>=x.baslangic_tarihi&&today<=x.bitis_tarihi)||periods[0]
  const[periodId,setPeriodId]=useState(params.get('donem')||currentPeriod?.hakedis_donemi_id||'')
  const[teacherFilter,setTeacherFilter]=useState(params.get('ogretmen')||'tum')
  const[paymentTeacher,setPaymentTeacher]=useState<string|null>(null);const[selected,setSelected]=useState<any|null>(null);const[cancelBusy,setCancelBusy]=useState(false)
  if(!data)return null
  const period=data.hakedisDonemleri.find(x=>x.hakedis_donemi_id===periodId)||currentPeriod
  const branchNames=(teacherId:string)=>data.ogretmenBranslari.filter(x=>x.ogretmen_id===teacherId&&x.aktif!==false).map(x=>data.branslar.find(b=>b.brans_id===x.brans_id&&b.aktif!==false)?.brans_adi).filter((x):x is string=>Boolean(x))
  const teachers=data.ogretmenler.filter(x=>x.durum!=='Pasif'&&(teacherFilter==='tum'||x.ogretmen_id===teacherFilter))
  const rows=teachers.map(t=>{
    const lessons=period?data.dersler.filter(x=>x.ogretmen_id===t.ogretmen_id&&x.ders_durumu==='Yapıldı'&&(x.tarih||'')>=period.baslangic_tarihi&&(x.tarih||'')<=period.bitis_tarihi):[]
    const earned=lessons.reduce((s,x)=>s+Number(x.ogretmen_toplam_hakedis||0),0)
    const paid=period?data.ogretmenOdemeleri.filter(x=>x.ogretmen_id===t.ogretmen_id&&x.hakedis_donemi_id===period.hakedis_donemi_id&&!x.iptal_mi).reduce((s,x)=>s+Number(x.tutar||0),0):0
    return {teacher:t,earned,paid,remaining:Math.max(earned-paid,0),lessonHours:lessons.reduce((sum,x)=>sum+Number(x.ders_sayisi||1),0),branches:branchNames(t.ogretmen_id)}
  }).sort((a,b)=>b.remaining-a.remaining||a.teacher.ad_soyad.localeCompare(b.teacher.ad_soyad,'tr-TR'))
  const totalEarned=rows.reduce((s,x)=>s+x.earned,0),totalPaid=rows.reduce((s,x)=>s+x.paid,0),totalRemaining=rows.reduce((s,x)=>s+x.remaining,0),dueCount=rows.filter(x=>x.remaining>0).length
  const payments=data.ogretmenOdemeleri.filter(x=>(!period||x.hakedis_donemi_id===period.hakedis_donemi_id)&&(teacherFilter==='tum'||x.ogretmen_id===teacherFilter)).sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||'')))
  const cancelSelected=async()=>{if(!selected||selected.iptal_mi)return;if(!window.confirm('Öğretmen ödemesi iptal edilsin mi?\n\nKayıt silinmeyecek; bağlı kasa hareketi de aynı işlemde iptal edilecek.'))return;setCancelBusy(true);try{await cancelTeacherPayment(selected.ogretmen_odeme_id,'Kullanıcı tarafından iptal edildi');await refresh();toast('Öğretmen ödemesi iptal edildi.');setSelected(null)}catch(e:any){toast(e.message||String(e),'error')}finally{setCancelBusy(false)}}

  return <div className="page-stack teacher-payments-page">
    <section className="page-title-row"><div><span className="eyebrow">ÖĞRETMEN YÖNETİMİ</span><h1>Öğretmen Ödemeleri</h1></div><button className="primary-btn" onClick={()=>setPaymentTeacher('')}><Plus size={17}/>Ödeme Yap</button></section>
    <TeacherSectionNav active="payments"/>

    <section className="teacher-payment-toolbar">
      <label><span>Hakediş Dönemi</span><select value={period?.hakedis_donemi_id||''} onChange={e=>setPeriodId(e.target.value)}>{periods.map(x=><option key={x.hakedis_donemi_id} value={x.hakedis_donemi_id}>{x.donem_adi}</option>)}</select></label>
      <label><span>Öğretmen</span><select value={teacherFilter} onChange={e=>setTeacherFilter(e.target.value)}><option value="tum">Tüm Öğretmenler</option>{data.ogretmenler.filter(x=>x.durum!=='Pasif').map(x=><option key={x.ogretmen_id} value={x.ogretmen_id}>{x.ad_soyad}</option>)}</select></label>
    </section>

    <section className="kpi-grid four compact-kpis teacher-payment-kpis">
      <div className="kpi-card blue"><span>Dönem Hakedişi</span><strong>{money(totalEarned)}</strong><small>{rows.reduce((s,x)=>s+x.lessonHours,0)} yapılan ders saati</small></div>
      <div className="kpi-card teal"><span>Dönem Ödenen</span><strong>{money(totalPaid)}</strong><small>aktif ödeme kayıtları</small></div>
      <div className="kpi-card orange"><span>Dönem Kalan</span><strong>{money(totalRemaining)}</strong><small>ödenmesi gereken</small></div>
      <div className="kpi-card red"><span>Ödeme Bekleyen</span><strong>{dueCount}</strong><small>öğretmen</small></div>
    </section>

    <div className="section-heading"><div><h2>Öğretmen Hakedişleri</h2><span>{period?.donem_adi||'Dönem seçin'}</span></div></div>
    <section className="teacher-payment-grid">{rows.map(x=><button key={x.teacher.ogretmen_id} className={`teacher-payment-card ${teacherTone(x.teacher.ad_soyad)} ${x.remaining<=0?'paid-up':''}`} onClick={()=>setPaymentTeacher(x.teacher.ogretmen_id)}>
      <div className="teacher-payment-card-head"><div className="avatar purple">{x.teacher.ad_soyad.split(/\s+/).slice(0,2).map(y=>y[0]).join('').toLocaleUpperCase('tr-TR')}</div><div><strong>{x.teacher.ad_soyad}</strong><span>{x.branches.length?x.branches.join(' · '):'Branş tanımlanmamış'}</span></div>{x.remaining>0?<span className="soft-pill danger-soft">Ödeme Bekliyor</span>:<span className="soft-pill success-soft">Tamam</span>}</div>
      <div className="teacher-payment-stats"><span><small>Hakediş</small><b>{money(x.earned)}</b></span><span><small>Ödenen</small><b>{money(x.paid)}</b></span><span><small>Kalan</small><b className={x.remaining>0?'danger-text':'success-text'}>{money(x.remaining)}</b></span></div>
      <div className="teacher-payment-card-foot"><span>{x.lessonHours} yapılan ders saati</span><b>{x.remaining>0?'Ödeme Yap':'Ödeme tamamlandı'}</b></div>
    </button>)}</section>
    {!rows.length&&<div className="calm-empty"><GraduationCap/><b>Bu filtrede öğretmen bulunamadı.</b><span>Öğretmen veya hakediş dönemi filtresini değiştirin.</span></div>}

    <div className="section-heading"><div><h2>Ödeme Geçmişi</h2><span>{payments.filter(x=>!x.iptal_mi).length} aktif kayıt</span></div></div>
    <section className="finance-list teacher-payment-history">{payments.length?payments.map(x=><button className="finance-card expense" style={x.iptal_mi?{opacity:.5}:undefined} key={x.ogretmen_odeme_id} onClick={()=>setSelected(x)}><div className="finance-icon"><Banknote/></div><div><strong>{teacherName(data,x.ogretmen_id)}</strong><small>{fullDate(x.tarih)} · {x.odeme_yontemi||'—'}{x.iptal_mi?' · İptal':''}</small></div><b>{x.iptal_mi?'İptal · ':'− '}{money(x.tutar)}</b></button>):<div className="all-good"><CheckCircle2/><span><b>Bu dönemde ödeme kaydı yok.</b><small>Ödeme yapıldığında burada görünecek.</small></span></div>}</section>

    <Sheet open={paymentTeacher!==null} title="Öğretmen Ödemesi" subtitle={paymentTeacher?teacherName(data,paymentTeacher):'Öğretmeni seçin'} onClose={()=>setPaymentTeacher(null)}>{paymentTeacher!==null&&<TeacherPaymentQuickForm teacherId={paymentTeacher||undefined} onDone={()=>setPaymentTeacher(null)} onCancel={()=>setPaymentTeacher(null)}/>}</Sheet>
    <Sheet open={!!selected} title="Öğretmen Ödemesi" subtitle="Ödeme kaydı" onClose={()=>setSelected(null)}>{selected&&<div className="detail-stack"><div className="payment-detail-hero"><WalletCards/><div><span>Öğretmen</span><strong>{teacherName(data,selected.ogretmen_id)}</strong><small>{fullDate(selected.tarih)} · {selected.odeme_yontemi||'—'}</small></div><b>{money(selected.tutar)}</b></div><div className="mini-grid two"><div><span>Hakediş Dönemi</span><b>{data.hakedisDonemleri.find(x=>x.hakedis_donemi_id===selected.hakedis_donemi_id)?.donem_adi||'—'}</b></div><div><span>Durum</span><b>{selected.iptal_mi?'İptal':'Aktif'}</b></div></div>{selected.aciklama&&<div className="note-box">{selected.aciklama}</div>}{!selected.iptal_mi&&<button className="danger-btn full" disabled={cancelBusy} onClick={()=>void cancelSelected()}><XCircle size={17}/>{cancelBusy?'İptal Ediliyor…':'Ödemeyi İptal Et'}</button>}</div>}</Sheet>
  </div>
}
