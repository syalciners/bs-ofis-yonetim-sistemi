import { FileText, GraduationCap, Printer, School, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppData } from '../components/AppDataProvider'
import { fullDate, money, todayISO } from '../lib/format'
import { monthCollections, monthExpenses, monthRevenue, monthTeacherPayments, studentDebt } from '../services/metrics'

type ReportType='kurum'|'ogrenci'|'ogretmen'
type StudentMovement={date:string;label:string;debit:number;credit:number;balance:number}
const lessonStatuses=['Yapıldı','Planlandı','İptal','Öğrenci Gelmedi','Ertelendi','Öğretmen İptali']
const monthLabel=(iso:string)=>new Intl.DateTimeFormat('tr-TR',{month:'long',year:'numeric'}).format(new Date(`${iso.slice(0,7)}-01T12:00:00`))

export function ReportsPage(){
  const{data}=useAppData();const[type,setType]=useState<ReportType>('kurum');const[student,setStudent]=useState('');const[teacher,setTeacher]=useState('');const today=todayISO();const periods=(data?.hakedisDonemleri||[]).filter(x=>x.aktif!==false&&x.baslangic_tarihi<=today).sort((a,b)=>b.baslangic_tarihi.localeCompare(a.baslangic_tarihi));const currentPeriod=periods.find(x=>today>=x.baslangic_tarihi&&today<=x.bitis_tarihi);const[teacherPeriod,setTeacherPeriod]=useState('')
  useEffect(()=>{if(!teacherPeriod&&periods.length)setTeacherPeriod(currentPeriod?.hakedis_donemi_id||periods[0].hakedis_donemi_id)},[teacherPeriod,currentPeriod?.hakedis_donemi_id,periods.length])
  if(!data)return null

  const kurum={revenue:monthRevenue(data),collections:monthCollections(data),expenses:monthExpenses(data),teacherPaid:monthTeacherPayments(data)}
  const reportTitle=type==='kurum'?'Aylık Kurum Yönetim Raporu':type==='ogrenci'?'Öğrenci Hesap Ekstresi':'Öğretmen Hakediş Raporu'
  const reportCode=`BS-${today.replaceAll('-','')}-${type==='kurum'?'KUR':type==='ogrenci'?'OGR':'OGT'}`
  const selectedStudent=data.ogrenciler.find(x=>x.ogrenci_id===student)
  const selectedTeacher=data.ogretmenler.find(x=>x.ogretmen_id===teacher)
  const selectedPeriod=periods.find(x=>x.hakedis_donemi_id===teacherPeriod)
  const periodText=type==='kurum'?monthLabel(today):type==='ogrenci'?'Tüm kayıt dönemi':selectedPeriod?.donem_adi||'Dönem seçilmedi'
  const subjectText=type==='kurum'?'BS Ofis':type==='ogrenci'?selectedStudent?.ad_soyad||'Öğrenci seçilmedi':selectedTeacher?.ad_soyad||'Öğretmen seçilmedi'

  return <div className="page-stack report-page">
    <section className="page-title-row no-print"><div><span className="eyebrow">RAPORLAR</span><h1>Raporlar</h1><p>Yönetim, öğrenci ve öğretmen raporlarını kurumsal belge düzeninde görüntüle.</p></div><button className="secondary-btn" onClick={()=>window.print()}><Printer size={17}/>Yazdır / PDF</button></section>
    <section className="report-choice no-print"><button className={type==='kurum'?'active':''} onClick={()=>setType('kurum')}><School/><span><b>Kurum Yönetim Raporu</b><small>Aylık operasyon ve finans özeti</small></span></button><button className={type==='ogrenci'?'active':''} onClick={()=>setType('ogrenci')}><UserRound/><span><b>Öğrenci Hesap Ekstresi</b><small>Ders borcu, tahsilat ve bakiye</small></span></button><button className={type==='ogretmen'?'active':''} onClick={()=>setType('ogretmen')}><GraduationCap/><span><b>Öğretmen Hakedişi</b><small>Dönem ders, hakediş ve ödeme</small></span></button></section>
    {type==='ogrenci'&&<select className="report-select no-print" value={student} onChange={e=>setStudent(e.target.value)}><option value="">Öğrenci seçin</option>{data.ogrenciler.map(x=><option key={x.ogrenci_id} value={x.ogrenci_id}>{x.ad_soyad}</option>)}</select>}
    {type==='ogretmen'&&<div className="report-filter-row no-print"><select className="report-select" value={teacher} onChange={e=>setTeacher(e.target.value)}><option value="">Öğretmen seçin</option>{data.ogretmenler.filter(x=>x.durum!=='Pasif').map(x=><option key={x.ogretmen_id} value={x.ogretmen_id}>{x.ad_soyad}</option>)}</select><select className="report-select" value={teacherPeriod} onChange={e=>setTeacherPeriod(e.target.value)}><option value="">Hakediş dönemi seçin</option>{periods.map(x=><option key={x.hakedis_donemi_id} value={x.hakedis_donemi_id}>{x.donem_adi}</option>)}</select></div>}

    <section className="report-sheet">
      <header className="report-doc-header"><img src="./bs-app-icon-192.png"/><div className="report-doc-brand"><h2>BS Ofis Yönetim Sistemi</h2><p>{reportTitle}</p></div><div className="report-doc-code"><b>{reportCode}</b><span>{fullDate(today)}</span></div></header>
      <div className="report-meta"><div><span>Rapor Dönemi</span><b>{periodText}</b></div><div><span>Rapor Konusu</span><b>{subjectText}</b></div><div><span>Belge Türü</span><b>{reportTitle}</b></div></div>
      <div className="report-content">
        {type==='kurum'&&<>
          <h3>Yönetim Özeti <span className="report-section-note">{monthLabel(today)}</span></h3><div className="report-kpis corporate"><div><span>Gerçekleşen Ciro</span><b>{money(kurum.revenue)}</b></div><div><span>Gerçek Tahsilat</span><b>{money(kurum.collections)}</b></div><div><span>Öğretmen Ödemesi</span><b>{money(kurum.teacherPaid)}</b></div><div><span>Genel Gider</span><b>{money(kurum.expenses)}</b></div></div>
          <h3>Ders Durumu Dağılımı</h3><div className="report-table lesson-summary"><div className="report-tr head"><span>Durum</span><span>Adet</span><span className="num">Öğrenci Tutarı</span><span className="num">Hakediş</span></div>{lessonStatuses.map(status=>{const rows=data.dersler.filter(x=>x.tarih?.startsWith(today.slice(0,7))&&x.ders_durumu===status);const finansal=status==='Yapıldı';return <div className="report-tr" key={status}><span className="strong">{status}</span><span>{rows.length}</span><span className="num">{money(finansal?rows.reduce((a,x)=>a+Number(x.ogrenci_toplam_tutar||0),0):0)}</span><span className="num">{money(finansal?rows.reduce((a,x)=>a+Number(x.ogretmen_toplam_hakedis||0),0):0)}</span></div>})}</div>
        </>}

        {type==='ogrenci'&&student&&(()=>{const s=data.ogrenciler.find(x=>x.ogrenci_id===student)!;const allLessons=data.dersler.filter(x=>x.ogrenci_id===student&&x.ders_durumu==='Yapıldı');const allPayments=data.tahsilatlar.filter(x=>x.ogrenci_id===student&&!x.iptal_mi);const totalAccrual=allLessons.reduce((a,x)=>a+Number(x.ogrenci_toplam_tutar||0),0),totalPaid=allPayments.reduce((a,x)=>a+Number(x.tutar||0),0);let running=0;const movements=[...allLessons.map(x=>({date:x.tarih||'',label:`Ders · ${data.branslar.find(b=>b.brans_id===x.brans_id)?.brans_adi||'Ders'}`,debit:Number(x.ogrenci_toplam_tutar||0),credit:0,order:`${x.tarih||''}-1-${x.ders_id}`})),...allPayments.map(x=>({date:x.tarih||'',label:`Tahsilat · ${x.odeme_yontemi||'Ödeme'}`,debit:0,credit:Number(x.tutar||0),order:`${x.tarih||''}-2-${x.tahsilat_id}`}))].sort((a,b)=>a.order.localeCompare(b.order));const ledger:StudentMovement[]=movements.map(x=>{running+=x.debit-x.credit;return{date:x.date,label:x.label,debit:x.debit,credit:x.credit,balance:running}});const current=studentDebt(data,student);return <>
          <h3>{s.ad_soyad} <span className="report-section-note">hesap özeti</span></h3><div className="report-kpis corporate"><div><span>Yapılan Ders</span><b>{allLessons.length}</b></div><div><span>Ders Borcu</span><b>{money(totalAccrual)}</b></div><div><span>Tahsilat</span><b>{money(totalPaid)}</b></div><div><span>Güncel Bakiye</span><b className={current<0?'report-balance-negative':current>0?'report-balance-positive':''}>{money(current)}</b></div></div>
          <h3>Hesap Hareketleri <span className="report-section-note">kronolojik ekstre</span></h3><div className="report-table corporate"><div className="report-tr head"><span>Tarih</span><span>İşlem</span><span className="num">Borç</span><span className="num">Tahsilat</span><span className="num">Bakiye</span></div>{ledger.length?ledger.map((x,i)=><div className="report-tr" key={`${x.date}-${i}`}><span>{fullDate(x.date)}</span><span className="strong">{x.label}</span><span className="num">{x.debit?money(x.debit):'—'}</span><span className="num">{x.credit?money(x.credit):'—'}</span><span className={`num strong ${x.balance<0?'report-balance-negative':x.balance>0?'report-balance-positive':''}`}>{money(x.balance)}</span></div>):<div className="report-empty-row">Bu öğrenci için hesap hareketi bulunmuyor.</div>}</div>
        </>})()}
        {type==='ogrenci'&&!student&&<div className="report-placeholder">Raporu görmek için öğrenci seçin.</div>}

        {type==='ogretmen'&&teacher&&teacherPeriod&&(()=>{const t=data.ogretmenler.find(x=>x.ogretmen_id===teacher)!;const p=periods.find(x=>x.hakedis_donemi_id===teacherPeriod);if(!p)return <div className="report-placeholder">Hakediş dönemi bulunamadı.</div>;const allLessons=data.dersler.filter(x=>x.ogretmen_id===teacher&&x.ders_durumu==='Yapıldı'&&(x.tarih||'')>=p.baslangic_tarihi&&(x.tarih||'')<=p.bitis_tarihi).sort((a,b)=>String(a.tarih||'').localeCompare(String(b.tarih||'')));const allPayments=data.ogretmenOdemeleri.filter(x=>x.ogretmen_id===teacher&&x.hakedis_donemi_id===teacherPeriod&&!x.iptal_mi).sort((a,b)=>String(a.tarih||'').localeCompare(String(b.tarih||'')));const totalEarned=allLessons.reduce((a,x)=>a+Number(x.ogretmen_toplam_hakedis||0),0),totalPaid=allPayments.reduce((a,x)=>a+Number(x.tutar||0),0),remaining=totalEarned-totalPaid;return <>
          <h3>{t.ad_soyad} <span className="report-section-note">{p.donem_adi}</span></h3><div className="report-kpis corporate"><div><span>Yapılan Ders</span><b>{allLessons.length}</b></div><div><span>Dönem Hakedişi</span><b>{money(totalEarned)}</b></div><div><span>Dönem Ödemesi</span><b>{money(totalPaid)}</b></div><div><span>Kalan Hakediş</span><b>{money(remaining)}</b></div></div>
          <h3>Dönem Dersleri</h3><div className="report-table teacher-ledger"><div className="report-tr head"><span>Tarih</span><span>Öğrenci</span><span>Ders</span><span className="num">Hakediş</span></div>{allLessons.length?allLessons.map(x=><div className="report-tr" key={x.ders_id}><span>{fullDate(x.tarih)}</span><span className="strong">{data.ogrenciler.find(s=>s.ogrenci_id===x.ogrenci_id)?.ad_soyad||'Öğrenci'}</span><span>{Number(x.ders_sayisi||1)} ders</span><span className="num">{money(x.ogretmen_toplam_hakedis)}</span></div>):<div className="report-empty-row">Bu dönemde yapılmış ders yok.</div>}</div>
          <h3>Dönem Ödemeleri</h3><div className="report-table payment-ledger"><div className="report-tr head"><span>Tarih</span><span>Yöntem</span><span>Açıklama</span><span className="num">Tutar</span></div>{allPayments.length?allPayments.map(x=><div className="report-tr" key={x.ogretmen_odeme_id}><span>{fullDate(x.tarih)}</span><span>{x.odeme_yontemi}</span><span>{x.aciklama||'—'}</span><span className="num">{money(x.tutar)}</span></div>):<div className="report-empty-row">Bu dönemde ödeme kaydı yok.</div>}</div>
        </>})()}
        {type==='ogretmen'&&(!teacher||!teacherPeriod)&&<div className="report-placeholder">Raporu görmek için öğretmen ve hakediş dönemi seçin.</div>}

        <footer className="report-doc-footer"><span><b>BS Ofis Yönetim Sistemi</b> tarafından oluşturulmuştur.</span><span>Belge tarihi: {fullDate(today)} · Rapor kodu: {reportCode}</span></footer>
      </div>
    </section>
  </div>
}
