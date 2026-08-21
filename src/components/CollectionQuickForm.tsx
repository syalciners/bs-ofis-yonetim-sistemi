import { useState } from 'react'
import { money, todayISO } from '../lib/format'
import { t } from '../lib/productProfile'
import { matchingActiveCollection, studentDebt } from '../services/metrics'
import { saveCollection } from '../services/officeService'
import { useAppData } from './AppDataProvider'
import { useToast } from './Toast'

export function CollectionQuickForm({ onDone, onCancel }: {onDone:()=>void;onCancel:()=>void}) {
  const {data,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false);const[studentId,setStudentId]=useState('');const[amount,setAmount]=useState('')
  if(!data)return null
  const balance=studentId?studentDebt(data,studentId):0
  const balanceText=balance>0?`${money(balance)} borç`:balance<0?`${money(Math.abs(balance))} avans`:'Bakiye kapalı'

  return <form className="form-grid" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const input={ogrenci_id:studentId,tutar:Number(f.get('tutar')),tarih:String(f.get('tarih')),odeme_yontemi:String(f.get('odeme_yontemi')),aciklama:String(f.get('aciklama')||'')||null};const duplicate=matchingActiveCollection(data,input);if(duplicate&&!window.confirm(`Bu ${t.studentLower} için aynı tarih, tutar ve ödeme yöntemiyle aktif bir tahsilat zaten var.\n\nYine de yeni kayıt oluşturulsun mu?`))return;setBusy(true);try{await saveCollection(input);await refresh();toast('Tahsilat ve kasa hareketi kaydedildi.');onDone()}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
    <label className="wide">{t.student}<select value={studentId} onChange={e=>{setStudentId(e.target.value);setAmount('')}} required><option value="">{t.student} seçin</option>{data.ogrenciler.filter(x=>x.durum!=='Pasif').sort((a,b)=>a.ad_soyad.localeCompare(b.ad_soyad,'tr')).map(x=><option key={x.ogrenci_id} value={x.ogrenci_id}>{x.ad_soyad}</option>)}</select></label>
    {studentId&&<div className="wide form-summary">Güncel durum: <b>{balanceText}</b>{balance>0&&<> · <button type="button" className="text-btn" onClick={()=>setAmount(String(balance))}>Borcu tutara aktar</button></>}</div>}
    <label>Tutar<input name="tutar" type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} required/></label>
    <label>Ödeme Yöntemi<select name="odeme_yontemi" defaultValue="Havale/EFT"><option>Havale/EFT</option><option>Nakit</option></select></label>
    <label>Tarih<input name="tarih" type="date" defaultValue={todayISO()} required/></label>
    <label className="wide">Açıklama<textarea name="aciklama" rows={2} placeholder="İsteğe bağlı"/></label>
    <div className="wide form-hint">Borçtan fazla ödeme alınabilir; fazla tutar {t.studentLower} bakiyesinde avans olarak kalır.</div>
    <div className="wide form-actions"><button className="secondary-btn" type="button" onClick={onCancel}>Vazgeç</button><button className="primary-btn" type="submit" disabled={busy||!studentId}>{busy?'Kaydediliyor…':'Tahsilatı Kaydet'}</button></div>
  </form>
}
