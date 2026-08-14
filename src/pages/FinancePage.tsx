import { Banknote, GraduationCap, Landmark, Plus, Receipt, ReceiptText, Users, WalletCards, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppData } from '../components/AppDataProvider'
import { Sheet } from '../components/Sheet'
import { ExpenseForm } from '../components/forms'
import { CollectionQuickForm } from '../components/CollectionQuickForm'
import { TeacherPaymentQuickForm } from '../components/TeacherPaymentQuickForm'
import { accountName, cashBalance, expenseName, monthCollections, monthExpenses, monthTeacherPayments, studentName, teacherBalance, teacherName, totalOpenDebt, totalTeacherBalance } from '../services/metrics'
import { fullDate, money } from '../lib/format'
import { cancelCollection, cancelExpense, cancelTeacherPayment } from '../services/financeCancelService'
import { useToast } from '../components/Toast'

type Tab='tahsilatlar'|'ogretmen'|'giderler'|'kasa'
export function FinancePage(){
  const {data,refresh}=useAppData();const{toast}=useToast();const nav=useNavigate();const[params]=useSearchParams();const init=(params.get('tab') as Tab)||'tahsilatlar';const[tab,setTab]=useState<Tab>(init);const[add,setAdd]=useState<Tab|null>(null);const[paymentTeacher,setPaymentTeacher]=useState<string|null>(null);const[selected,setSelected]=useState<any|null>(null);const[cancelBusy,setCancelBusy]=useState(false)
  const kpis=useMemo(()=>data?{collections:monthCollections(data),open:totalOpenDebt(data),teacher:totalTeacherBalance(data),cash:cashBalance(data),expenses:monthExpenses(data),teacherPaid:monthTeacherPayments(data)}:null,[data])
  const teacherDue=useMemo(()=>data?data.ogretmenler.filter(x=>x.durum!=='Pasif').map(x=>({teacher:x,balance:Math.max(teacherBalance(data,x.ogretmen_id),0)})).filter(x=>x.balance>0).sort((a,b)=>b.balance-a.balance):[],[data])
  if(!data||!kpis)return null
  const actionLabel=tab==='tahsilatlar'?'Tahsilat Al':tab==='ogretmen'?'Ödeme Yap':tab==='giderler'?'Gider Ekle':null
  const openTeacherPayment=(teacherId='')=>{setPaymentTeacher(teacherId);setAdd(null)}
  const closeTeacherPayment=()=>setPaymentTeacher(null)
  const cancelSelected=async()=>{
    if(!selected||selected.row?.iptal_mi||!['tahsilat','ogretmen','gider'].includes(selected.type))return
    const label=selected.type==='tahsilat'?'Tahsilat':selected.type==='ogretmen'?'Öğretmen ödemesi':'Gider'
    if(!window.confirm(`${label} kaydı iptal edilsin mi?\n\nKayıt silinmeyecek; bağlı kasa hareketi de aynı işlemde iptal edilecek.`))return
    setCancelBusy(true)
    try{
      if(selected.type==='tahsilat')await cancelCollection(selected.row.tahsilat_id,'Kullanıcı tarafından iptal edildi')
      if(selected.type==='ogretmen')await cancelTeacherPayment(selected.row.ogretmen_odeme_id,'Kullanıcı tarafından iptal edildi')
      if(selected.type==='gider')await cancelExpense(selected.row.gider_id,'Kullanıcı tarafından iptal edildi')
      await refresh();toast(`${label} iptal edildi; bağlı kasa hareketi de güncellendi.`);setSelected(null)
    }catch(e:any){toast(e.message||String(e),'error')}finally{setCancelBusy(false)}
  }
  const activeCollectionCount=data.tahsilatlar.filter(x=>!x.iptal_mi).length
  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">FİNANS</span><h1>Finans</h1><p>Tahsilat, hakediş, gider ve kasa tek yerde.</p></div>{actionLabel&&<button className="primary-btn" onClick={()=>tab==='ogretmen'?openTeacherPayment():setAdd(tab)}><Plus size={17}/>{actionLabel}</button>}</section>

    <section className="kpi-grid four compact-kpis">
      <button className="kpi-card teal" onClick={()=>setTab('tahsilatlar')}><span>Bu Ay Tahsilat</span><strong>{money(kpis.collections)}</strong><small>gerçek nakit girişi</small></button>
      <button className="kpi-card orange" onClick={()=>nav('/ogrenciler?filtre=borclu')}><span>Açık Alacak</span><strong>{money(kpis.open)}</strong><small>borçlu öğrencileri aç</small></button>
      <button className="kpi-card red" onClick={()=>setTab('ogretmen')}><span>Öğretmen Borcu</span><strong>{money(kpis.teacher)}</strong><small>{teacherDue.length} öğretmene ödeme bekliyor</small></button>
      <button className="kpi-card blue" onClick={()=>setTab('kasa')}><span>Toplam Kasa</span><strong>{money(kpis.cash)}</strong><small>nakit + banka</small></button>
    </section>

    <div className="segmented four-seg"><button className={tab==='tahsilatlar'?'active':''} onClick={()=>setTab('tahsilatlar')}>Tahsilatlar</button><button className={tab==='ogretmen'?'active':''} onClick={()=>setTab('ogretmen')}>Öğretmen</button><button className={tab==='giderler'?'active':''} onClick={()=>setTab('giderler')}>Giderler</button><button className={tab==='kasa'?'active':''} onClick={()=>setTab('kasa')}>Kasa</button></div>

    {tab==='tahsilatlar'&&<>
      <div className="section-heading"><div><h2>Son Tahsilatlar</h2><span>{activeCollectionCount} aktif kayıt</span></div><button className="text-btn" onClick={()=>nav('/ogrenciler?filtre=borclu')}>Borçlu Öğrenciler</button></div>
      <section className="finance-list">{data.tahsilatlar.length?data.tahsilatlar.map(x=><button className="finance-card income" style={x.iptal_mi?{opacity:.5}:undefined} key={x.tahsilat_id} onClick={()=>setSelected({type:'tahsilat',row:x})}><div className="finance-icon"><Banknote/></div><div><strong>{studentName(data,x.ogrenci_id)}</strong><small>{fullDate(x.tarih)} · {x.odeme_yontemi||'—'}{x.iptal_mi?' · İptal':''}{x.aciklama?` · ${x.aciklama}`:''}</small></div><b>{x.iptal_mi?'İptal · ':''}{money(x.tutar)}</b></button>):<div className="calm-empty"><Users/><b>Henüz tahsilat yok.</b><span>İlk tahsilatı “Tahsilat Al” ile kaydedebilirsin.</span></div>}</section>
    </>}

    {tab==='ogretmen'&&<>
      <div className="section-heading"><div><h2>Ödeme Bekleyen Öğretmenler</h2><span>{teacherDue.length} kişi</span></div></div>
      {teacherDue.length?<section className="teacher-grid">{teacherDue.map(x=><button className="teacher-card" key={x.teacher.ogretmen_id} onClick={()=>openTeacherPayment(x.teacher.ogretmen_id)}><div className="student-top"><div className="avatar purple">{x.teacher.ad_soyad.split(/\s+/).slice(0,2).map(y=>y[0]).join('').toLocaleUpperCase('tr-TR')}</div><div className="student-name"><strong>{x.teacher.ad_soyad}</strong><span>{x.teacher.branslar||'Öğretmen'}</span></div><span className="soft-pill">Ödeme Yap</span></div><div className="student-balance"><span>Güncel kalan hakediş</span><b className="danger-text">{money(x.balance)}</b></div></button>)}</section>:<div className="all-good"><GraduationCap/><span><b>Bekleyen öğretmen ödemesi yok.</b><small>Güncel hakedişler ödenmiş görünüyor.</small></span></div>}
      <div className="section-heading"><div><h2>Son Öğretmen Ödemeleri</h2><span>bu ay {money(kpis.teacherPaid)}</span></div></div>
      <section className="finance-list">{data.ogretmenOdemeleri.length?data.ogretmenOdemeleri.map(x=><button className="finance-card expense" style={x.iptal_mi?{opacity:.5}:undefined} key={x.ogretmen_odeme_id} onClick={()=>setSelected({type:'ogretmen',row:x})}><div className="finance-icon"><Banknote/></div><div><strong>{teacherName(data,x.ogretmen_id)}</strong><small>{fullDate(x.tarih)} · {data.hakedisDonemleri.find(d=>d.hakedis_donemi_id===x.hakedis_donemi_id)?.donem_adi||'—'} · {x.odeme_yontemi||'—'}{x.iptal_mi?' · İptal':''}</small></div><b>{x.iptal_mi?'İptal · ':'− '}{money(x.tutar)}</b></button>):<div className="calm-empty"><GraduationCap/><b>Henüz öğretmen ödemesi yok.</b><span>Ödeme bekleyen öğretmene dokunarak doğrudan ödeme başlatabilirsin.</span></div>}</section>
    </>}

    {tab==='giderler'&&<>
      <div className="section-heading"><div><h2>Giderler</h2><span>bu ay {money(kpis.expenses)}</span></div></div>
      <section className="finance-list">{data.giderler.length?data.giderler.map(x=><button className="finance-card expense" style={x.iptal_mi?{opacity:.5}:undefined} key={x.gider_id} onClick={()=>setSelected({type:'gider',row:x})}><div className="finance-icon"><Receipt/></div><div><strong>{expenseName(data,x.kategori_id)}</strong><small>{fullDate(x.tarih)} · {x.odeme_yontemi||'—'}{x.iptal_mi?' · İptal':''}{x.aciklama?` · ${x.aciklama}`:''}</small></div><b>{x.iptal_mi?'İptal · ':'− '}{money(x.tutar)}</b></button>):<div className="calm-empty"><ReceiptText/><b>Henüz gider kaydı yok.</b><span>Gider eklendiğinde kasa çıkışı otomatik oluşur.</span></div>}</section>
    </>}

    {tab==='kasa'&&<><section className="account-grid">{data.kasaHesaplari.filter(x=>x.aktif!==false).map(a=>{const flow=data.kasaHareketleri.filter(x=>x.hesap_id===a.hesap_id&&!x.iptal_mi).reduce((s,x)=>s+(x.hareket_turu==='Gelir'?Number(x.tutar||0):-Number(x.tutar||0)),0);return <button className="account-card" key={a.hesap_id} onClick={()=>setSelected({type:'hesap',row:a,balance:Number(a.acilis_bakiyesi||0)+flow})}><Landmark/><span><strong>{a.hesap_adi}</strong><small>{a.hesap_turu||a.banka_adi||'Para Hesabı'}</small></span><b>{money(Number(a.acilis_bakiyesi||0)+flow)}</b></button>})}</section><div className="section-heading"><div><h2>Son Kasa Hareketleri</h2><span>son 50 kayıt</span></div></div><section className="finance-list">{data.kasaHareketleri.slice(0,50).map(x=><button className={`finance-card ${x.hareket_turu==='Gelir'?'income':'expense'}`} style={x.iptal_mi?{opacity:.5}:undefined} key={x.hareket_id} onClick={()=>setSelected({type:'kasa',row:x})}><div className="finance-icon"><WalletCards/></div><div><strong>{x.kaynak_turu||x.hareket_turu||'Kasa Hareketi'}</strong><small>{fullDate(x.tarih)} · {accountName(data,x.hesap_id)}{x.iptal_mi?' · İptal':''}{x.aciklama?` · ${x.aciklama}`:''}</small></div><b>{x.iptal_mi?'İptal · ':x.hareket_turu==='Gelir'?'+ ':'− '}{money(x.tutar)}</b></button>)}</section></>}

    <Sheet open={add==='tahsilatlar'} title="Tahsilat Al" subtitle="Öğrenciyi seç; güncel bakiye otomatik gösterilir." onClose={()=>setAdd(null)}><CollectionQuickForm onDone={()=>setAdd(null)} onCancel={()=>setAdd(null)}/></Sheet>
    <Sheet open={paymentTeacher!==null} title="Öğretmen Ödemesi" subtitle={paymentTeacher?teacherName(data,paymentTeacher):'Güncel hakediş dönemi otomatik seçilir.'} onClose={closeTeacherPayment}>{paymentTeacher!==null&&<TeacherPaymentQuickForm teacherId={paymentTeacher||undefined} onDone={closeTeacherPayment} onCancel={closeTeacherPayment}/>}</Sheet>
    <Sheet open={add==='giderler'} title="Gider Ekle" subtitle="Gider ve kasa çıkışı tek işlemde." onClose={()=>setAdd(null)}><ExpenseForm onDone={()=>setAdd(null)} onCancel={()=>setAdd(null)}/></Sheet>
    <Sheet open={!!selected} title={selected?.type==='tahsilat'?'Tahsilat Detayı':selected?.type==='ogretmen'?'Öğretmen Ödemesi':selected?.type==='gider'?'Gider Detayı':selected?.type==='hesap'?'Hesap Detayı':'Kasa Hareketi'} subtitle="Kayıt bilgileri" onClose={()=>setSelected(null)}>{selected&&<div className="detail-stack">{selected.type==='hesap'?<div className="detail-hero"><div><span>Hesap</span><strong>{selected.row.hesap_adi}</strong><small>{selected.row.hesap_turu||selected.row.banka_adi||'Para hesabı'}</small></div><b>{money(selected.balance)}</b></div>:<><div className="detail-hero"><div><span>{selected.type==='tahsilat'?'Öğrenci':selected.type==='ogretmen'?'Öğretmen':selected.type==='gider'?'Kategori':'Kaynak'}</span><strong>{selected.type==='tahsilat'?studentName(data,selected.row.ogrenci_id):selected.type==='ogretmen'?teacherName(data,selected.row.ogretmen_id):selected.type==='gider'?expenseName(data,selected.row.kategori_id):selected.row.kaynak_turu||'Kasa Hareketi'}</strong><small>{fullDate(selected.row.tarih)}</small></div><b className={selected.type==='tahsilat'||selected.row.hareket_turu==='Gelir'?'success-text':'danger-text'}>{money(selected.row.tutar)}</b></div><div className="detail-section"><div className="detail-row"><span>Durum</span><b>{selected.row.iptal_mi?'İptal':'Aktif'}</b></div><div className="detail-row"><span>Yöntem / Hesap</span><b>{selected.row.odeme_yontemi||accountName(data,selected.row.hesap_id)}</b></div>{selected.row.aciklama&&<div className="detail-row"><span>Açıklama</span><b>{selected.row.aciklama}</b></div>}</div>{['tahsilat','ogretmen','gider'].includes(selected.type)&&!selected.row.iptal_mi&&<button className="danger-btn full" disabled={cancelBusy} onClick={()=>void cancelSelected()}><XCircle size={17}/>{cancelBusy?'İptal Ediliyor…':'Kaydı İptal Et'}</button>}</>}</div>}</Sheet>
  </div>
}
