import { ChevronRight, Landmark, Plus, ReceiptText, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import type { GiderKategori, KasaHareketi, KasaHesabi } from '../lib/types'
import { saveCashAccount, saveExpenseCategory } from '../services/financeDefinitionsService'
import { useToast } from './Toast'

type Mode='hesap'|'kategori'
type AccountDraft={hesap_id?:string;hesap_adi:string;hesap_turu:string;banka_adi:string;iban:string;acilis_bakiyesi:number;aktif:boolean;aciklama:string}
type CategoryDraft={kategori_id?:string;kategori_adi:string;grup:string;sira_no:number|null;aktif:boolean;aciklama:string}

export function FinancialDefinitionsPanel({accounts,categories,movements,onUpdated}:{accounts:KasaHesabi[];categories:GiderKategori[];movements:KasaHareketi[];onUpdated:()=>Promise<void>}){
  const{toast}=useToast();const[mode,setMode]=useState<Mode>('hesap');const[accountDraft,setAccountDraft]=useState<AccountDraft|null>(null);const[categoryDraft,setCategoryDraft]=useState<CategoryDraft|null>(null);const[busy,setBusy]=useState(false)
  const switchMode=(next:Mode)=>{setMode(next);setAccountDraft(null);setCategoryDraft(null)}
  const selectAccount=(x:KasaHesabi)=>setAccountDraft({hesap_id:x.hesap_id,hesap_adi:x.hesap_adi,hesap_turu:x.hesap_turu||'',banka_adi:x.banka_adi||'',iban:x.iban||'',acilis_bakiyesi:Number(x.acilis_bakiyesi||0),aktif:x.aktif!==false,aciklama:x.aciklama||''})
  const selectCategory=(x:GiderKategori)=>setCategoryDraft({kategori_id:x.kategori_id,kategori_adi:x.kategori_adi,grup:x.grup||'',sira_no:x.sira_no??null,aktif:x.aktif!==false,aciklama:x.aciklama||''})
  const openingLocked=Boolean(accountDraft?.hesap_id&&movements.some(x=>x.hesap_id===accountDraft.hesap_id))

  return <div className="settings-definitions-panel">
    <div className="settings-info-note settings-definitions-safety"><ShieldCheck size={17}/><span>Finans tanımları silinmez ve kimlikleri değiştirilmez. Geçmiş kasa hareketi bulunan bir hesabın açılış bakiyesi kilitlidir; böylece geçmiş bakiye geriye dönük değişmez.</span></div>
    <div className="settings-definition-tabs" role="tablist" aria-label="Finans tanımları">
      <button type="button" className={mode==='hesap'?'active':''} onClick={()=>switchMode('hesap')}><Landmark size={16}/>Kasa / Banka <span>{accounts.length}</span></button>
      <button type="button" className={mode==='kategori'?'active':''} onClick={()=>switchMode('kategori')}><ReceiptText size={16}/>Gider Kategorileri <span>{categories.length}</span></button>
    </div>

    {mode==='hesap'?<div className="settings-definition-layout">
      <div className="settings-definition-list">
        <button type="button" className="settings-definition-add" onClick={()=>setAccountDraft({hesap_adi:'',hesap_turu:'Nakit',banka_adi:'',iban:'',acilis_bakiyesi:0,aktif:true,aciklama:''})}><Plus size={16}/>Yeni Kasa / Banka Hesabı</button>
        {accounts.map(x=><button key={x.hesap_id} type="button" className={`settings-definition-row${accountDraft?.hesap_id===x.hesap_id?' selected':''}`} onClick={()=>selectAccount(x)}><span className={`settings-user-status ${x.aktif!==false?'active':'passive'}`}/><span><strong>{x.hesap_adi}</strong><small>{x.hesap_turu||'Para Hesabı'} · {x.aktif!==false?'Aktif':'Pasif'}</small></span><ChevronRight size={16}/></button>)}
      </div>
      <div className="settings-definition-editor">
        {!accountDraft?<div className="settings-users-empty"><Landmark/><strong>Hesap seçin veya yeni hesap ekleyin</strong><span>Kasa ve banka hesaplarının tanımlarını yönetin.</span></div>:<form className="form-grid" onSubmit={async e=>{e.preventDefault();const current=accountDraft;setBusy(true);try{await saveCashAccount(current);await onUpdated();toast(current.hesap_id?'Hesap güncellendi.':'Yeni hesap eklendi.');setAccountDraft(null)}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
          <label className="wide">Hesap Adı<input value={accountDraft.hesap_adi} onChange={e=>setAccountDraft({...accountDraft,hesap_adi:e.target.value})} required autoFocus/></label>
          <label>Hesap Türü<select value={accountDraft.hesap_turu} onChange={e=>setAccountDraft({...accountDraft,hesap_turu:e.target.value})}><option>Nakit</option><option>Havale / EFT</option><option>Banka</option><option>Diğer</option></select></label>
          <label>Banka Adı<input value={accountDraft.banka_adi} onChange={e=>setAccountDraft({...accountDraft,banka_adi:e.target.value})}/></label>
          <label className="wide">IBAN<input value={accountDraft.iban} onChange={e=>setAccountDraft({...accountDraft,iban:e.target.value})} autoCapitalize="characters"/></label>
          <label>Açılış Bakiyesi<input type="number" step="0.01" value={accountDraft.acilis_bakiyesi} disabled={openingLocked} onChange={e=>setAccountDraft({...accountDraft,acilis_bakiyesi:Number(e.target.value)||0})}/></label>
          <label>Durum<select value={accountDraft.aktif?'Aktif':'Pasif'} onChange={e=>setAccountDraft({...accountDraft,aktif:e.target.value==='Aktif'})}><option>Aktif</option><option>Pasif</option></select></label>
          {openingLocked&&<div className="wide form-hint">Bu hesabın kasa hareketleri bulunduğu için açılış bakiyesi değiştirilemez.</div>}
          <label className="wide">Açıklama<textarea rows={3} value={accountDraft.aciklama} onChange={e=>setAccountDraft({...accountDraft,aciklama:e.target.value})}/></label>
          <div className="wide settings-user-readonly"><span>Hesap Kimliği</span><strong>{accountDraft.hesap_id||'Otomatik oluşturulacak'}</strong><small>Finans kayıtlarının bütünlüğü için kimlik değiştirilemez.</small></div>
          <div className="wide form-actions"><button type="button" className="secondary-btn" onClick={()=>setAccountDraft(null)}>Vazgeç</button><button type="submit" className="primary-btn" disabled={busy}>{busy?'Kaydediliyor…':'Hesabı Kaydet'}</button></div>
        </form>}
      </div>
    </div>:<div className="settings-definition-layout">
      <div className="settings-definition-list">
        <button type="button" className="settings-definition-add" onClick={()=>setCategoryDraft({kategori_adi:'',grup:'',sira_no:null,aktif:true,aciklama:''})}><Plus size={16}/>Yeni Gider Kategorisi</button>
        {categories.map(x=><button key={x.kategori_id} type="button" className={`settings-definition-row${categoryDraft?.kategori_id===x.kategori_id?' selected':''}`} onClick={()=>selectCategory(x)}><span className={`settings-user-status ${x.aktif!==false?'active':'passive'}`}/><span><strong>{x.kategori_adi}</strong><small>{x.grup||'Grupsuz'} · {x.aktif!==false?'Aktif':'Pasif'}</small></span><ChevronRight size={16}/></button>)}
      </div>
      <div className="settings-definition-editor">
        {!categoryDraft?<div className="settings-users-empty"><ReceiptText/><strong>Kategori seçin veya yeni kategori ekleyin</strong><span>Gider girişinde kullanılan sınıflandırmaları yönetin.</span></div>:<form className="form-grid" onSubmit={async e=>{e.preventDefault();const current=categoryDraft;setBusy(true);try{await saveExpenseCategory(current);await onUpdated();toast(current.kategori_id?'Gider kategorisi güncellendi.':'Yeni gider kategorisi eklendi.');setCategoryDraft(null)}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
          <label className="wide">Kategori Adı<input value={categoryDraft.kategori_adi} onChange={e=>setCategoryDraft({...categoryDraft,kategori_adi:e.target.value})} required autoFocus/></label>
          <label>Grup<input value={categoryDraft.grup} onChange={e=>setCategoryDraft({...categoryDraft,grup:e.target.value})} placeholder="Sabit Gider"/></label>
          <label>Sıra No<input type="number" min="1" step="1" value={categoryDraft.sira_no??''} onChange={e=>setCategoryDraft({...categoryDraft,sira_no:e.target.value?Number(e.target.value):null})}/></label>
          <label className="wide">Durum<select value={categoryDraft.aktif?'Aktif':'Pasif'} onChange={e=>setCategoryDraft({...categoryDraft,aktif:e.target.value==='Aktif'})}><option>Aktif</option><option>Pasif</option></select></label>
          <label className="wide">Açıklama<textarea rows={3} value={categoryDraft.aciklama} onChange={e=>setCategoryDraft({...categoryDraft,aciklama:e.target.value})}/></label>
          <div className="wide settings-user-readonly"><span>Kategori Kimliği</span><strong>{categoryDraft.kategori_id||'Otomatik oluşturulacak'}</strong><small>Geçmiş gider kayıtlarının bütünlüğü için kimlik değiştirilemez.</small></div>
          <div className="wide form-actions"><button type="button" className="secondary-btn" onClick={()=>setCategoryDraft(null)}>Vazgeç</button><button type="submit" className="primary-btn" disabled={busy}>{busy?'Kaydediliyor…':'Kategoriyi Kaydet'}</button></div>
        </form>}
      </div>
    </div>}
  </div>
}
