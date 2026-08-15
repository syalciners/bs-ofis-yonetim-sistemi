import { useState } from 'react'
import type { Gider, OgretmenOdeme, Tahsilat } from '../lib/types'
import { money, todayISO } from '../lib/format'
import { updateCollection, updateExpense, updateTeacherPayment } from '../services/financeEditService'
import { useAppData } from './AppDataProvider'
import { useToast } from './Toast'

type Props =
  | { type:'tahsilat'; record:Tahsilat; onDone:()=>void; onCancel:()=>void }
  | { type:'gider'; record:Gider; onDone:()=>void; onCancel:()=>void }
  | { type:'ogretmen'; record:OgretmenOdeme; onDone:()=>void; onCancel:()=>void }

export function FinanceRecordEditForm(props: Props) {
  if(props.type==='tahsilat') return <CollectionEditForm record={props.record} onDone={props.onDone} onCancel={props.onCancel}/>
  if(props.type==='gider') return <ExpenseEditForm record={props.record} onDone={props.onDone} onCancel={props.onCancel}/>
  return <TeacherPaymentEditForm record={props.record} onDone={props.onDone} onCancel={props.onCancel}/>
}

function Actions({busy,onCancel}:{busy:boolean;onCancel:()=>void}) {
  return <div className="wide form-actions"><button className="secondary-btn" type="button" onClick={onCancel}>Vazgeç</button><button className="primary-btn" type="submit" disabled={busy}>{busy?'Kaydediliyor…':'Değişiklikleri Kaydet'}</button></div>
}

function CollectionEditForm({record,onDone,onCancel}:{record:Tahsilat;onDone:()=>void;onCancel:()=>void}) {
  const {data,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false);const[studentId,setStudentId]=useState(record.ogrenci_id);const[amount,setAmount]=useState(String(record.tutar))
  if(!data)return null
  return <form className="form-grid" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const input={tahsilat_id:record.tahsilat_id,ogrenci_id:studentId,tutar:Number(f.get('tutar')),tarih:String(f.get('tarih')),odeme_yontemi:String(f.get('odeme_yontemi')),aciklama:String(f.get('aciklama')||'')||null};const duplicate=data.tahsilatlar.find(x=>x.tahsilat_id!==record.tahsilat_id&&!x.iptal_mi&&x.ogrenci_id===input.ogrenci_id&&x.tarih===input.tarih&&Math.abs(Number(x.tutar||0)-input.tutar)<0.005&&String(x.odeme_yontemi||'')===input.odeme_yontemi);if(duplicate&&!window.confirm('Bu öğrenci için aynı tarih, tutar ve ödeme yöntemiyle başka bir aktif tahsilat var.\n\nYine de bu kayıt güncellensin mi?'))return;setBusy(true);try{await updateCollection(input);await refresh();toast('Tahsilat ve bağlı kasa hareketi güncellendi. Finans senkronizasyonu başlatıldı.');onDone()}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
    <label className="wide">Öğrenci<select value={studentId} onChange={e=>setStudentId(e.target.value)} required>{data.ogrenciler.filter(x=>x.durum!=='Pasif'||x.ogrenci_id===studentId).sort((a,b)=>a.ad_soyad.localeCompare(b.ad_soyad,'tr')).map(x=><option key={x.ogrenci_id} value={x.ogrenci_id}>{x.ad_soyad}</option>)}</select></label>
    <label>Tutar<input name="tutar" type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} required/></label>
    <label>Ödeme Yöntemi<select name="odeme_yontemi" defaultValue={record.odeme_yontemi||'Havale/EFT'}><option>Havale/EFT</option><option>Nakit</option></select></label>
    <label>Tarih<input name="tarih" type="date" defaultValue={record.tarih} required/></label>
    <label className="wide">Açıklama<textarea name="aciklama" rows={2} defaultValue={record.aciklama||''}/></label>
    <div className="wide form-hint">Kayıt güncellendiğinde bağlı kasa hareketi de aynı işlemde değiştirilir.</div>
    <Actions busy={busy} onCancel={onCancel}/>
  </form>
}

function ExpenseEditForm({record,onDone,onCancel}:{record:Gider;onDone:()=>void;onCancel:()=>void}) {
  const {data,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false)
  if(!data)return null
  return <form className="form-grid" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);try{await updateExpense({gider_id:record.gider_id,kategori_id:String(f.get('kategori_id')),tutar:Number(f.get('tutar')),tarih:String(f.get('tarih')),odeme_yontemi:String(f.get('odeme_yontemi')),hesap_id:String(f.get('hesap_id')||'')||null,aciklama:String(f.get('aciklama')||'')||null});await refresh();toast('Gider ve bağlı kasa hareketi güncellendi.');onDone()}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
    <label>Kategori<select name="kategori_id" defaultValue={record.kategori_id||''} required><option value="">Seçin</option>{data.giderKategorileri.filter(x=>x.aktif!==false||x.kategori_id===record.kategori_id).map(x=><option key={x.kategori_id} value={x.kategori_id}>{x.kategori_adi}</option>)}</select></label>
    <label>Tutar<input name="tutar" type="number" min="0.01" step="0.01" inputMode="decimal" defaultValue={record.tutar} required/></label>
    <label>Ödeme Yöntemi<select name="odeme_yontemi" defaultValue={record.odeme_yontemi||'Havale/EFT'}><option>Havale/EFT</option><option>Nakit</option></select></label>
    <label>Tarih<input name="tarih" type="date" defaultValue={record.tarih} required/></label>
    <label>Ödeme Hesabı<select name="hesap_id" defaultValue={record.hesap_id||''}><option value="">Otomatik</option>{data.kasaHesaplari.filter(x=>x.aktif!==false||x.hesap_id===record.hesap_id).map(x=><option key={x.hesap_id} value={x.hesap_id}>{x.hesap_adi}</option>)}</select></label>
    <label className="wide">Açıklama<textarea name="aciklama" rows={2} defaultValue={record.aciklama||''}/></label>
    <div className="wide form-hint">Kayıt güncellendiğinde bağlı kasa çıkışı da aynı işlemde değiştirilir.</div>
    <Actions busy={busy} onCancel={onCancel}/>
  </form>
}

function TeacherPaymentEditForm({record,onDone,onCancel}:{record:OgretmenOdeme;onDone:()=>void;onCancel:()=>void}) {
  const {data,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false);const[teacher,setTeacher]=useState(record.ogretmen_id||'');const[period,setPeriod]=useState(record.hakedis_donemi_id||'');const today=todayISO()
  if(!data)return null
  const periods=data.hakedisDonemleri.filter(x=>(x.aktif!==false&&x.baslangic_tarihi<=today)||x.hakedis_donemi_id===period).sort((a,b)=>b.baslangic_tarihi.localeCompare(a.baslangic_tarihi))
  const periodObj=data.hakedisDonemleri.find(x=>x.hakedis_donemi_id===period)
  const earned=periodObj?data.dersler.filter(x=>x.ogretmen_id===teacher&&x.ders_durumu==='Yapıldı'&&(x.tarih||'')>=periodObj.baslangic_tarihi&&(x.tarih||'')<=periodObj.bitis_tarihi).reduce((sum,x)=>sum+Number(x.ogretmen_toplam_hakedis||0),0):0
  const otherPaid=periodObj?data.ogretmenOdemeleri.filter(x=>x.ogretmen_odeme_id!==record.ogretmen_odeme_id&&x.ogretmen_id===teacher&&x.hakedis_donemi_id===period&&!x.iptal_mi).reduce((sum,x)=>sum+Number(x.tutar||0),0):0
  const editableMax=Math.max(earned-otherPaid,0)
  return <form className="form-grid" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);try{await updateTeacherPayment({ogretmen_odeme_id:record.ogretmen_odeme_id,ogretmen_id:teacher,hakedis_donemi_id:period,tutar:Number(f.get('tutar')),tarih:String(f.get('tarih')),odeme_yontemi:String(f.get('odeme_yontemi')),hesap_id:String(f.get('hesap_id')||'')||null,aciklama:String(f.get('aciklama')||'')||null});await refresh();toast('Öğretmen ödemesi ve bağlı kasa hareketi güncellendi.');onDone()}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
    <label>Öğretmen<select name="ogretmen_id" value={teacher} onChange={e=>setTeacher(e.target.value)} required><option value="">Seçin</option>{data.ogretmenler.filter(x=>x.durum!=='Pasif'||x.ogretmen_id===teacher).map(x=><option key={x.ogretmen_id} value={x.ogretmen_id}>{x.ad_soyad}</option>)}</select></label>
    <label>Hakediş Dönemi<select name="hakedis_donemi_id" value={period} onChange={e=>setPeriod(e.target.value)} required><option value="">Seçin</option>{periods.map(x=><option key={x.hakedis_donemi_id} value={x.hakedis_donemi_id}>{x.donem_adi}</option>)}</select></label>
    {teacher&&period&&<div className="wide form-summary">Dönem hakedişi <b>{money(earned)}</b> · Diğer ödemeler <b>{money(otherPaid)}</b> · Bu kayıt için azami <b>{money(editableMax)}</b></div>}
    <label>Tutar<input name="tutar" type="number" min="0.01" step="0.01" inputMode="decimal" defaultValue={record.tutar||''} required/></label>
    <label>Tarih<input name="tarih" type="date" defaultValue={record.tarih||today} required/></label>
    <label>Yöntem<select name="odeme_yontemi" defaultValue={record.odeme_yontemi||'Havale/EFT'}><option>Havale/EFT</option><option>Nakit</option></select></label>
    <label>Hesap<select name="hesap_id" defaultValue={record.hesap_id||''}><option value="">Otomatik</option>{data.kasaHesaplari.filter(x=>x.aktif!==false||x.hesap_id===record.hesap_id).map(x=><option key={x.hesap_id} value={x.hesap_id}>{x.hesap_adi}</option>)}</select></label>
    <label className="wide">Açıklama<textarea name="aciklama" rows={2} defaultValue={record.aciklama||''}/></label>
    <div className="wide form-hint">Mevcut ödeme, kalan hakediş hesabında iki kez sayılmaz; bağlı kasa çıkışı birlikte güncellenir.</div>
    <Actions busy={busy} onCancel={onCancel}/>
  </form>
}
