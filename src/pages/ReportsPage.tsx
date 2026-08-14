import { GraduationCap, Printer, School, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useAppData } from '../components/AppDataProvider'
import { money, todayISO, fullDate } from '../lib/format'
import { monthCollections, monthExpenses, monthRevenue, monthTeacherPayments, studentDebt, teacherBalance } from '../services/metrics'

type ReportType='kurum'|'ogrenci'|'ogretmen'
const lessonStatuses=['Yapıldı','Planlandı','İptal','Öğrenci Gelmedi','Ertelendi','Öğretmen İptali']

export function ReportsPage(){
  const{data}=useAppData();const[type,setType]=useState<ReportType>('kurum');const[student,setStudent]=useState('');const[teacher,setTeacher]=useState('');if(!data)return null
  const kurum={revenue:monthRevenue(data),collections:monthCollections(data),expenses:monthExpenses(data),teacherPaid:monthTeacherPayments(data)}
  return <div className="page-stack report-page">
    <section className="page-title-row no-print"><div><span className="eyebrow">RAPORLAR</span><h1>Raporlar</h1><p>Gereken bilgiyi seç, ekranda gör, PDF olarak kaydet.</p></div><button className="secondary-btn" onClick={()=>window.print()}><Printer size={17}/>Yazdır / PDF</button></section>
    <section className="report-choice no-print"><button className={type==='kurum'?'active':''} onClick={()=>setType('kurum')}><School/><span><b>Kurum Özeti</b><small>Bu ay operasyon ve finans</small></span></button><button className={type==='ogrenci'?'active':''} onClick={()=>setType('ogrenci')}><UserRound/><span><b>Öğrenci Ekstresi</b><small>Ders ve tahsilat hareketleri</small></span></button><button className={type==='ogretmen'?'active':''} onClick={()=>setType('ogretmen')}><GraduationCap/><span><b>Öğretmen Hakedişi</b><small>Ders, hakediş ve ödeme</small></span></button></section>
    {type==='ogrenci'&&<select className="report-select no-print" value={student} onChange={e=>setStudent(e.target.value)}><option value="">Öğrenci seçin</option>{data.ogrenciler.map(x=><option key={x.ogrenci_id} value={x.ogrenci_id}>{x.ad_soyad}</option>)}</select>}
    {type==='ogretmen'&&<select className="report-select no-print" value={teacher} onChange={e=>setTeacher(e.target.value)}><option value="">Öğretmen seçin</option>{data.ogretmenler.map(x=><option key={x.ogretmen_id} value={x.ogretmen_id}>{x.ad_soyad}</option>)}</select>}

    <section className="report-sheet">
      <header><img src="./bs-app-icon-192.png"/><div><h2>BS Ofis Yönetim Sistemi</h2><p>{type==='kurum'?'Aylık Kurum Özeti':type==='ogrenci'?'Öğrenci Ekstresi':'Öğretmen Hakediş Özeti'}</p></div><span>{fullDate(todayISO())}</span></header>

      {type==='kurum'&&<>
        <h3>Bu Ay</h3><div className="report-kpis"><div><span>Gerçekleşen Ciro</span><b>{money(kurum.revenue)}</b></div><div><span>Tahsilat</span><b>{money(kurum.collections)}</b></div><div><span>Öğretmen Ödemesi</span><b>{money(kurum.teacherPaid)}</b></div><div><span>Gider</span><b>{money(kurum.expenses)}</b></div></div>
        <h3>Ders Özeti</h3><div className="report-table"><div className="report-tr head"><span>Durum</span><span>Adet</span><span>Öğrenci Tutarı</span><span>Hakediş</span></div>{lessonStatuses.map(status=>{const rows=data.dersler.filter(x=>x.tarih?.startsWith(todayISO().slice(0,7))&&x.ders_durumu===status);const finansal=status==='Yapıldı';return <div className="report-tr" key={status}><span>{status}</span><span>{rows.length}</span><span>{money(finansal?rows.reduce((a,x)=>a+Number(x.ogrenci_toplam_tutar||0),0):0)}</span><span>{money(finansal?rows.reduce((a,x)=>a+Number(x.ogretmen_toplam_hakedis||0),0):0)}</span></div>})}</div>
      </>}

      {type==='ogrenci'&&student&&(()=>{const s=data.ogrenciler.find(x=>x.ogrenci_id===student)!;const allLessons=data.dersler.filter(x=>x.ogrenci_id===student&&x.ders_durumu==='Yapıldı');const allPayments=data.tahsilatlar.filter(x=>x.ogrenci_id===student);const lessons=allLessons.slice(0,30),payments=allPayments.slice(0,30);const totalAccrual=allLessons.reduce((a,x)=>a+Number(x.ogrenci_toplam_tutar||0),0),totalPaid=allPayments.reduce((a,x)=>a+Number(x.tutar||0),0);return <>
        <h3>{s.ad_soyad}</h3><div className="report-kpis"><div><span>Yapılan Ders</span><b>{allLessons.length}</b></div><div><span>Toplam Ders Tutarı</span><b>{money(totalAccrual)}</b></div><div><span>Toplam Tahsilat</span><b>{money(totalPaid)}</b></div><div><span>Güncel Bakiye</span><b>{money(studentDebt(data,student))}</b></div></div>
        <h3>Son Yapılan Dersler</h3><div className="report-table">{lessons.map(x=><div className="report-tr" key={x.ders_id}><span>{fullDate(x.tarih)}</span><span>{x.ders_durumu}</span><span>{money(x.ogrenci_toplam_tutar)}</span></div>)}</div>
        <h3>Son Tahsilatlar</h3><div className="report-table">{payments.map(x=><div className="report-tr" key={x.tahsilat_id}><span>{fullDate(x.tarih)}</span><span>{x.odeme_yontemi}</span><span>{money(x.tutar)}</span></div>)}</div>
      </>})()}
      {type==='ogrenci'&&!student&&<div className="report-placeholder">Raporu görmek için öğrenci seçin.</div>}

      {type==='ogretmen'&&teacher&&(()=>{const t=data.ogretmenler.find(x=>x.ogretmen_id===teacher)!;const allLessons=data.dersler.filter(x=>x.ogretmen_id===teacher&&x.ders_durumu==='Yapıldı');const allPayments=data.ogretmenOdemeleri.filter(x=>x.ogretmen_id===teacher&&!x.iptal_mi);const lessons=allLessons.slice(0,40),payments=allPayments.slice(0,30);const totalEarned=allLessons.reduce((a,x)=>a+Number(x.ogretmen_toplam_hakedis||0),0),totalPaid=allPayments.reduce((a,x)=>a+Number(x.tutar||0),0);return <>
        <h3>{t.ad_soyad}</h3><div className="report-kpis"><div><span>Yapılan Ders</span><b>{allLessons.length}</b></div><div><span>Toplam Hakediş</span><b>{money(totalEarned)}</b></div><div><span>Toplam Ödeme</span><b>{money(totalPaid)}</b></div><div><span>Güncel Kalan Hakediş</span><b>{money(teacherBalance(data,teacher))}</b></div></div>
        <h3>Son Yapılan Dersler</h3><div className="report-table">{lessons.map(x=><div className="report-tr" key={x.ders_id}><span>{fullDate(x.tarih)}</span><span>{money(x.ogretmen_toplam_hakedis)}</span></div>)}</div>
        <h3>Son Ödemeler</h3><div className="report-table">{payments.map(x=><div className="report-tr" key={x.ogretmen_odeme_id}><span>{fullDate(x.tarih)}</span><span>{x.odeme_yontemi}</span><span>{money(x.tutar)}</span></div>)}</div>
      </>})()}
      {type==='ogretmen'&&!teacher&&<div className="report-placeholder">Raporu görmek için öğretmen seçin.</div>}
    </section>
  </div>
}
