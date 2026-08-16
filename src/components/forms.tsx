import { useEffect, useState } from 'react'
import type { Ders, Odev, Ogrenci, Ogretmen, SabitProgram } from '../lib/types'
import { formatClockInput, todayISO, uid } from '../lib/format'
import { useAppData } from './AppDataProvider'
import { useToast } from './Toast'
import { PremiumLessonForm } from './PremiumLessonForm'
import { lessonConflict, moveProgramDate, previewProgram, saveAssignment, saveCollection, saveExpense, saveLesson, saveProgram, saveStudent, saveTeacher, saveTeacherPayment, updateAssignmentStatus, updateLesson, programConflict } from '../services/officeService'

function FormActions({ busy, onCancel, label = 'Kaydet' }: { busy: boolean; onCancel: () => void; label?: string }) {
  return <div className="form-actions"><button className="secondary-btn" type="button" onClick={onCancel}>Vazgeç</button><button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Kaydediliyor…' : label}</button></div>
}

export function StudentForm({ student, onDone, onCancel }: { student?: Ogrenci; onDone: () => void; onCancel: () => void }) {
  const { refresh } = useAppData(); const { toast } = useToast(); const [busy,setBusy]=useState(false)
  return <form className="form-grid" onSubmit={async e=>{e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);try{await saveStudent({ogrenci_id:student?.ogrenci_id,ad_soyad:String(f.get('ad_soyad')||''),veli_adi:String(f.get('veli_adi')||'')||null,veli_telefon:String(f.get('veli_telefon')||'')||null,ogrenci_telefon:String(f.get('ogrenci_telefon')||'')||null,email:String(f.get('email')||'')||null,kayit_tarihi:String(f.get('kayit_tarihi')||'')||null,durum:String(f.get('durum')||'Aktif'),notlar:String(f.get('notlar')||'')||null});await refresh();toast(student?'Öğrenci güncellendi.':'Öğrenci eklendi.');onDone()}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
    <label>Ad Soyad<input name="ad_soyad" defaultValue={student?.ad_soyad||''} required autoFocus/></label>
    <label>Durum<select name="durum" defaultValue={student?.durum||'Aktif'}><option>Aktif</option><option>Pasif</option></select></label>
    <label>Veli Ad Soyad<input name="veli_adi" defaultValue={student?.veli_adi||''}/></label>
    <label>Veli Telefon<input name="veli_telefon" defaultValue={student?.veli_telefon||''} inputMode="tel"/></label>
    <label>Öğrenci Telefon<input name="ogrenci_telefon" defaultValue={student?.ogrenci_telefon||''} inputMode="tel"/></label>
    <label>E-posta<input name="email" defaultValue={student?.email||''} type="email"/></label>
    <label>Kayıt Tarihi<input name="kayit_tarihi" defaultValue={student?.kayit_tarihi||todayISO()} type="date"/></label>
    <label className="wide">Notlar<textarea name="notlar" rows={3} defaultValue={student?.notlar||''}/></label>
    <div className="wide"><FormActions busy={busy} onCancel={onCancel}/></div>
  </form>
}

export function CollectionForm({ studentId, onDone, onCancel }: { studentId?: string; onDone: () => void; onCancel: () => void }) {
  const { data, refresh }=useAppData();const {toast}=useToast();const[busy,setBusy]=useState(false);if(!data)return null
  return <form className="form-grid" onSubmit={async e=>{e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);try{await saveCollection({ogrenci_id:String(f.get('ogrenci_id')),tutar:Number(f.get('tutar')),tarih:String(f.get('tarih')),odeme_yontemi:String(f.get('odeme_yontemi')),aciklama:String(f.get('aciklama')||'')||null});await refresh();toast('Tahsilat ve kasa hareketi kaydedildi.');onDone()}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
    <label>Öğrenci<select name="ogrenci_id" defaultValue={studentId||''} required><option value="">Seçin</option>{data.ogrenciler.filter(x=>x.durum!=='Pasif').map(x=><option key={x.ogrenci_id} value={x.ogrenci_id}>{x.ad_soyad}</option>)}</select></label>
    <label>Tutar<input name="tutar" type="number" min="0.01" step="0.01" inputMode="decimal" required autoFocus={!!studentId}/></label>
    <label>Ödeme Yöntemi<select name="odeme_yontemi" defaultValue="Havale/EFT"><option>Havale/EFT</option><option>Nakit</option></select></label>
    <label>Tarih<input name="tarih" type="date" defaultValue={todayISO()} required/></label>
    <label className="wide">Açıklama<textarea name="aciklama" rows={2}/></label>
    <div className="wide"><FormActions busy={busy} onCancel={onCancel} label="Tahsilatı Kaydet"/></div>
  </form>
}

export function ExpenseForm({ onDone, onCancel }: { onDone:()=>void;onCancel:()=>void }) {
  const {data,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false);if(!data)return null
  return <form className="form-grid" onSubmit={async e=>{e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);try{await saveExpense({kategori_id:String(f.get('kategori_id')),tutar:Number(f.get('tutar')),tarih:String(f.get('tarih')),odeme_yontemi:String(f.get('odeme_yontemi')),hesap_id:String(f.get('hesap_id')||'')||null,aciklama:String(f.get('aciklama')||'')||null});await refresh();toast('Gider ve kasa hareketi kaydedildi.');onDone()}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
    <label>Kategori<select name="kategori_id" required><option value="">Seçin</option>{data.giderKategorileri.filter(x=>x.aktif!==false).map(x=><option key={x.kategori_id} value={x.kategori_id}>{x.kategori_adi}</option>)}</select></label>
    <label>Tutar<input name="tutar" type="number" min="0.01" step="0.01" required/></label>
    <label>Ödeme Yöntemi<select name="odeme_yontemi"><option>Havale/EFT</option><option>Nakit</option></select></label>
    <label>Tarih<input name="tarih" type="date" defaultValue={todayISO()} required/></label>
    <label>Ödeme Hesabı<select name="hesap_id"><option value="">Otomatik</option>{data.kasaHesaplari.filter(x=>x.aktif!==false).map(x=><option key={x.hesap_id} value={x.hesap_id}>{x.hesap_adi}</option>)}</select></label>
    <label className="wide">Açıklama<textarea name="aciklama" rows={2}/></label>
    <div className="wide"><FormActions busy={busy} onCancel={onCancel} label="Gideri Kaydet"/></div>
  </form>
}

export function TeacherPaymentForm({ teacherId, onDone, onCancel }: { teacherId?:string;onDone:()=>void;onCancel:()=>void }) {
  const {data,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false);const[tid,setTid]=useState(teacherId||'');const[period,setPeriod]=useState('');if(!data)return null
  const periodObj=data.hakedisDonemleri.find(x=>x.hakedis_donemi_id===period);const earned=periodObj?data.dersler.filter(x=>x.ogretmen_id===tid&&x.ders_durumu==='Yapıldı'&&(x.tarih||'')>=periodObj.baslangic_tarihi&&(x.tarih||'')<=periodObj.bitis_tarihi).reduce((s,x)=>s+Number(x.ogretmen_toplam_hakedis||0),0):0;const paid=periodObj?data.ogretmenOdemeleri.filter(x=>x.ogretmen_id===tid&&x.hakedis_donemi_id===period&&!x.iptal_mi).reduce((s,x)=>s+Number(x.tutar||0),0):0;const remaining=Math.max(earned-paid,0)
  return <form className="form-grid" onSubmit={async e=>{e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);try{await saveTeacherPayment({ogretmen_id:String(f.get('ogretmen_id')),hakedis_donemi_id:String(f.get('hakedis_donemi_id')),tutar:Number(f.get('tutar')),tarih:String(f.get('tarih')),odeme_yontemi:String(f.get('odeme_yontemi')),hesap_id:String(f.get('hesap_id')||'')||null,aciklama:String(f.get('aciklama')||'')||null});await refresh();toast('Öğretmen ödemesi kaydedildi.');onDone()}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
    <label>Öğretmen<select name="ogretmen_id" value={tid} onChange={e=>setTid(e.target.value)} required><option value="">Seçin</option>{data.ogretmenler.filter(x=>x.durum!=='Pasif').map(x=><option key={x.ogretmen_id} value={x.ogretmen_id}>{x.ad_soyad}</option>)}</select></label>
    <label>Hakediş Dönemi<select name="hakedis_donemi_id" value={period} onChange={e=>setPeriod(e.target.value)} required><option value="">Seçin</option>{data.hakedisDonemleri.map(x=><option key={x.hakedis_donemi_id} value={x.hakedis_donemi_id}>{x.donem_adi}</option>)}</select></label>
    {tid&&period&&<div className="wide form-summary">Dönem hakedişi <b>{earned.toLocaleString('tr-TR')} ₺</b> · Ödenen <b>{paid.toLocaleString('tr-TR')} ₺</b> · Kalan <b>{remaining.toLocaleString('tr-TR')} ₺</b></div>}
    <label>Tutar<input name="tutar" type="number" min="0.01" step="0.01" defaultValue={remaining||''} key={`${tid}-${period}-${remaining}`} required/></label>
    <label>Tarih<input name="tarih" type="date" defaultValue={todayISO()} required/></label>
    <label>Yöntem<select name="odeme_yontemi"><option>Havale/EFT</option><option>Nakit</option></select></label>
    <label>Hesap<select name="hesap_id"><option value="">Otomatik</option>{data.kasaHesaplari.filter(x=>x.aktif!==false).map(x=><option key={x.hesap_id} value={x.hesap_id}>{x.hesap_adi}</option>)}</select></label>
    <label className="wide">Açıklama<textarea name="aciklama" rows={2}/></label>
    <div className="wide"><FormActions busy={busy} onCancel={onCancel} label="Ödemeyi Kaydet"/></div>
  </form>
}

export function LegacyLessonForm({ lesson, studentId, onDone, onCancel }: { lesson?:Ders;studentId?:string;onDone:()=>void;onCancel:()=>void }) {
  const {data,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false)
  const[student,setStudent]=useState(lesson?.ogrenci_id||studentId||'');const[teacher,setTeacher]=useState(lesson?.ogretmen_id||'');const[branch,setBranch]=useState(lesson?.brans_id||'')
  const[studentPrice,setStudentPrice]=useState(lesson?.ogrenci_birim_ucreti!=null?String(lesson.ogrenci_birim_ucreti):'');const[teacherPrice,setTeacherPrice]=useState(lesson?.ogretmen_birim_hakedisi!=null?String(lesson.ogretmen_birim_hakedisi):'')
  if(!data)return null
  const branchIds=new Set(data.ogretmenBranslari.filter(x=>x.ogretmen_id===teacher&&x.aktif!==false).map(x=>x.brans_id));const branches=data.branslar.filter(x=>x.aktif!==false&&(!teacher||branchIds.has(x.brans_id)))
  const applyKnownPrice=(sid:string,tid:string,bid:string)=>{if(lesson||!sid||!tid||!bid)return;const p=data.sabitProgramlar.find(x=>x.ogrenci_id===sid&&x.ogretmen_id===tid&&x.brans_id===bid&&x.program_durumu!=='Pasif'&&x.aktif!==false);if(p){setStudentPrice(String(p.ogrenci_birim_ucreti??''));setTeacherPrice(String(p.ogretmen_birim_hakedisi??''))}}
  return <form className="form-grid" onSubmit={async e=>{e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);const input={ders_id:lesson?.ders_id,tarih:String(f.get('tarih')),ogrenci_id:String(f.get('ogrenci_id')),ogretmen_id:String(f.get('ogretmen_id')),brans_id:String(f.get('brans_id')),derslik_id:String(f.get('derslik_id')),baslangic_saati:String(f.get('baslangic_saati')),ders_sayisi:Number(f.get('ders_sayisi')),ogrenci_birim_ucreti:Number(f.get('ogrenci_birim_ucreti')),ogretmen_birim_hakedisi:Number(f.get('ogretmen_birim_hakedisi')),aciklama:String(f.get('aciklama')||'')||null};try{const c=await lessonConflict({...input,haric_ders_id:lesson?.ders_id||null});if(!c?.uygun)throw new Error(c?.mesaj||'Bu tarih ve saatte çakışma var.');if(lesson)await updateLesson(input as any);else await saveLesson(input as any);await refresh();toast(lesson?'Ders güncellendi.':'Ders oluşturuldu.');onDone()}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
    <label>Öğrenci<select name="ogrenci_id" value={student} onChange={e=>{const v=e.target.value;setStudent(v);applyKnownPrice(v,teacher,branch)}} required><option value="">Seçin</option>{data.ogrenciler.filter(x=>x.durum!=='Pasif').map(x=><option key={x.ogrenci_id} value={x.ogrenci_id}>{x.ad_soyad}</option>)}</select></label>
    <label>Öğretmen<select name="ogretmen_id" value={teacher} onChange={e=>{setTeacher(e.target.value);setBranch('');if(!lesson){setStudentPrice('');setTeacherPrice('')}}} required><option value="">Seçin</option>{data.ogretmenler.filter(x=>x.durum!=='Pasif').map(x=><option key={x.ogretmen_id} value={x.ogretmen_id}>{x.ad_soyad}</option>)}</select></label>
    <label>Branş<select name="brans_id" value={branch} onChange={e=>{setBranch(e.target.value);applyKnownPrice(student,teacher,e.target.value)}} required><option value="">Seçin</option>{branches.map(x=><option key={x.brans_id} value={x.brans_id}>{x.brans_adi}</option>)}</select></label>
    <label>Derslik<select name="derslik_id" defaultValue={lesson?.derslik_id||''} required><option value="">Seçin</option>{data.derslikler.filter(x=>x.aktif!==false).map(x=><option key={x.derslik_id} value={x.derslik_id}>{x.mekan_adi}</option>)}</select></label>
    <label>Tarih<input name="tarih" type="date" defaultValue={lesson?.tarih||todayISO()} required/></label>
    <label>Saat<input name="baslangic_saati" type="text" inputMode="numeric" autoComplete="off" enterKeyHint="next" maxLength={5} pattern="([01][0-9]|2[0-3]):[0-5][0-9]" placeholder="19:00" title="Saati 00:00–23:59 arasında girin." defaultValue={(lesson?.baslangic_saati||'').slice(0,5)} onInput={e=>{e.currentTarget.value=formatClockInput(e.currentTarget.value)}} required/></label>
    <label>Ders Birimi<select name="ders_sayisi" defaultValue={String(lesson?.ders_sayisi||1)}>{[1,2,3,4].map(x=><option key={x} value={x}>{x} ders</option>)}</select></label>
    <label>Öğrenci Birim Ücreti<input name="ogrenci_birim_ucreti" type="number" min="0" step="0.01" value={studentPrice} onChange={e=>setStudentPrice(e.target.value)} required/></label>
    <label>Öğretmen Birim Hakedişi<input name="ogretmen_birim_hakedisi" type="number" min="0" step="0.01" value={teacherPrice} onChange={e=>setTeacherPrice(e.target.value)} required/></label>
    {!lesson&&student&&teacher&&branch&&studentPrice!==''&&<div className="wide form-summary">Varsayılan ücretler mevcut sabit programdan getirildi. Gerekirse yalnız bu ders için değiştirebilirsin.</div>}
    <label className="wide">Açıklama<textarea name="aciklama" rows={2} defaultValue={lesson?.aciklama||''}/></label>
    <div className="wide form-hint">Kaydetmeden önce öğrenci, öğretmen ve derslik çakışması otomatik kontrol edilir.</div>
    <div className="wide"><FormActions busy={busy} onCancel={onCancel} label={lesson?'Dersi Güncelle':'Dersi Oluştur'}/></div>
  </form>
}

export const LessonForm=PremiumLessonForm

export function ProgramForm({ program, onDone, onCancel }: { program?:SabitProgram;onDone:()=>void;onCancel:()=>void }) {
  const {data,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false);const[teacher,setTeacher]=useState(program?.ogretmen_id||'');if(!data)return null
  const branchIds=new Set(data.ogretmenBranslari.filter(x=>x.ogretmen_id===teacher&&x.aktif!==false).map(x=>x.brans_id));const branches=data.branslar.filter(x=>x.aktif!==false&&(!teacher||branchIds.has(x.brans_id)))
  const days=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar']
  return <form className="form-grid" onSubmit={async e=>{e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);const p:any={program_id:program?.program_id||uid('SP'),ogrenci_id:String(f.get('ogrenci_id')),ogretmen_id:String(f.get('ogretmen_id')),brans_id:String(f.get('brans_id')),derslik_id:String(f.get('derslik_id')),haftanin_gunu:String(f.get('haftanin_gunu')),baslangic_saati:String(f.get('baslangic_saati')),ders_sayisi:Number(f.get('ders_sayisi')),ogrenci_birim_ucreti:Number(f.get('ogrenci_birim_ucreti')),ogretmen_birim_hakedisi:Number(f.get('ogretmen_birim_hakedisi')),tekrar_sikligi:String(f.get('tekrar_sikligi')),baslangic_tarihi:String(f.get('baslangic_tarihi')||'')||null,bitis_tarihi:String(f.get('bitis_tarihi')||'')||null,program_durumu:String(f.get('program_durumu')),aciklama:String(f.get('aciklama')||'')||null};try{const c=await programConflict(p);if(!c?.uygun)throw new Error(c?.mesaj||'Program çakışması bulundu.');await saveProgram(p);await refresh();toast(program?'Sabit program güncellendi.':'Sabit program eklendi.');onDone()}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
    <label>Öğrenci<select name="ogrenci_id" defaultValue={program?.ogrenci_id||''} required><option value="">Seçin</option>{data.ogrenciler.filter(x=>x.durum!=='Pasif').map(x=><option key={x.ogrenci_id} value={x.ogrenci_id}>{x.ad_soyad}</option>)}</select></label>
    <label>Öğretmen<select name="ogretmen_id" value={teacher} onChange={e=>setTeacher(e.target.value)} required><option value="">Seçin</option>{data.ogretmenler.filter(x=>x.durum!=='Pasif').map(x=><option key={x.ogretmen_id} value={x.ogretmen_id}>{x.ad_soyad}</option>)}</select></label>
    <label>Branş<select name="brans_id" defaultValue={program?.brans_id||''} key={teacher} required><option value="">Seçin</option>{branches.map(x=><option key={x.brans_id} value={x.brans_id}>{x.brans_adi}</option>)}</select></label>
    <label>Derslik<select name="derslik_id" defaultValue={program?.derslik_id||''} required><option value="">Seçin</option>{data.derslikler.filter(x=>x.aktif!==false).map(x=><option key={x.derslik_id} value={x.derslik_id}>{x.mekan_adi}</option>)}</select></label>
    <label>Gün<select name="haftanin_gunu" defaultValue={program?.haftanin_gunu||'Pazartesi'}>{days.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Saat<input name="baslangic_saati" type="text" inputMode="numeric" autoComplete="off" enterKeyHint="next" maxLength={5} pattern="([01][0-9]|2[0-3]):[0-5][0-9]" placeholder="19:00" title="Saati 00:00–23:59 arasında girin." defaultValue={(program?.baslangic_saati||'').slice(0,5)} onInput={e=>{e.currentTarget.value=formatClockInput(e.currentTarget.value)}} required/></label>
    <label>Ders Birimi<select name="ders_sayisi" defaultValue={String(program?.ders_sayisi||1)}>{[1,2,3,4].map(x=><option key={x} value={x}>{x} ders</option>)}</select></label>
    <label>Tekrar<select name="tekrar_sikligi" defaultValue={program?.tekrar_sikligi||'Her Hafta'}><option>Her Hafta</option><option>2 Haftada Bir</option><option>Ayda Bir</option></select></label>
    <label>Başlangıç<input name="baslangic_tarihi" type="date" defaultValue={program?.baslangic_tarihi||todayISO()}/></label>
    <label>Bitiş<input name="bitis_tarihi" type="date" defaultValue={program?.bitis_tarihi||''}/></label>
    <label>Öğrenci Birim Ücreti<input name="ogrenci_birim_ucreti" type="number" min="0" step="0.01" defaultValue={program?.ogrenci_birim_ucreti||''} required/></label>
    <label>Öğretmen Birim Hakedişi<input name="ogretmen_birim_hakedisi" type="number" min="0" step="0.01" defaultValue={program?.ogretmen_birim_hakedisi||''} required/></label>
    <label>Durum<select name="program_durumu" defaultValue={program?.program_durumu||'Aktif'}><option>Aktif</option><option>Pasif</option></select></label>
    <label className="wide">Açıklama<textarea name="aciklama" rows={2} defaultValue={program?.aciklama||''}/></label>
    <div className="wide form-hint">Kaydetmeden önce gerçek tekrar tarihleri üzerinden öğrenci, öğretmen ve derslik çakışması kontrol edilir.</div>
    <div className="wide"><FormActions busy={busy} onCancel={onCancel}/></div>
  </form>
}

export function TeacherForm({ teacher, onDone, onCancel }: { teacher?: Ogretmen; onDone:()=>void; onCancel:()=>void }) {
  const {data,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false)
  const initial = new Set(data?.ogretmenBranslari.filter(x=>x.ogretmen_id===teacher?.ogretmen_id&&x.aktif!==false).map(x=>x.brans_id) || [])
  const [branchIds,setBranchIds]=useState<string[]>([...initial])
  if(!data)return null
  const toggle=(id:string)=>setBranchIds(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])
  return <form className="form-grid" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);if(String(f.get('durum')||'Aktif')==='Aktif'&&!branchIds.length){toast('Aktif öğretmen için en az bir branş seçin.','error');return}setBusy(true);try{await saveTeacher({ogretmen_id:teacher?.ogretmen_id,ad_soyad:String(f.get('ad_soyad')||''),telefon:String(f.get('telefon')||'')||null,email:String(f.get('email')||'')||null,durum:String(f.get('durum')||'Aktif'),notlar:String(f.get('notlar')||'')||null},branchIds);await refresh();toast(teacher?'Öğretmen güncellendi.':'Öğretmen eklendi.');onDone()}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
    <label>Ad Soyad<input name="ad_soyad" defaultValue={teacher?.ad_soyad||''} required autoFocus/></label>
    <label>Durum<select name="durum" defaultValue={teacher?.durum||'Aktif'}><option>Aktif</option><option>Pasif</option></select></label>
    <label>Telefon<input name="telefon" defaultValue={teacher?.telefon||''} inputMode="tel"/></label>
    <label>E-posta<input name="email" defaultValue={teacher?.email||''} type="email"/></label>
    <div className="wide"><span className="field-label">Branşlar</span><div className="check-grid">{data.branslar.filter(x=>x.aktif!==false).map(x=><label className="check-card" key={x.brans_id}><input type="checkbox" checked={branchIds.includes(x.brans_id)} onChange={()=>toggle(x.brans_id)}/><span>{x.brans_adi}</span></label>)}</div></div>
    <label className="wide">Notlar<textarea name="notlar" rows={3} defaultValue={teacher?.notlar||''}/></label>
    <div className="wide form-hint">Branş seçimi ders ve sabit program formlarındaki seçenekleri otomatik sınırlar.</div>
    <div className="wide"><FormActions busy={busy} onCancel={onCancel}/></div>
  </form>
}

export function AssignmentForm({ assignment, studentId, onDone, onCancel }: { assignment?:Odev;studentId?:string;onDone:()=>void;onCancel:()=>void }) {
  const {data,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false);if(!data)return null
  return <form className="form-grid" onSubmit={async e=>{e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);try{await saveAssignment({odev_id:assignment?.odev_id,ogrenci_id:String(f.get('ogrenci_id')),ogretmen_id:String(f.get('ogretmen_id')),konu:String(f.get('konu')),aciklama:String(f.get('aciklama')||'')||null,verilis_tarihi:String(f.get('verilis_tarihi')),son_teslim_tarihi:String(f.get('son_teslim_tarihi')||'')||null,oncelik:String(f.get('oncelik')||'Normal')});await refresh();toast(assignment?'Ödev güncellendi.':'Ödev eklendi.');onDone()}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
    <label>Öğrenci<select name="ogrenci_id" defaultValue={assignment?.ogrenci_id||studentId||''} required><option value="">Seçin</option>{data.ogrenciler.filter(x=>x.durum!=='Pasif').map(x=><option key={x.ogrenci_id} value={x.ogrenci_id}>{x.ad_soyad}</option>)}</select></label>
    <label>Öğretmen<select name="ogretmen_id" defaultValue={assignment?.ogretmen_id||''} required><option value="">Seçin</option>{data.ogretmenler.filter(x=>x.durum!=='Pasif').map(x=><option key={x.ogretmen_id} value={x.ogretmen_id}>{x.ad_soyad}</option>)}</select></label>
    <label className="wide">Ödev / Konu<input name="konu" defaultValue={assignment?.odev_basligi||assignment?.konu||''} required autoFocus/></label>
    <label>Veriliş Tarihi<input name="verilis_tarihi" type="date" defaultValue={assignment?.verilis_tarihi||todayISO()} required/></label>
    <label>Son Teslim<input name="son_teslim_tarihi" type="date" defaultValue={assignment?.son_teslim_tarihi||''}/></label>
    <label>Öncelik<select name="oncelik" defaultValue={assignment?.oncelik||'Normal'}><option>Düşük</option><option>Normal</option><option>Yüksek</option></select></label>
    <label className="wide">Açıklama<textarea name="aciklama" rows={3} defaultValue={assignment?.odev_aciklamasi||''}/></label>
    <div className="wide"><FormActions busy={busy} onCancel={onCancel}/></div>
  </form>
}

export function AssignmentStatusForm({ assignment, onDone, onCancel }: { assignment:Odev;onDone:()=>void;onCancel:()=>void }) {
  const {refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false)
  return <form className="form-grid" onSubmit={async e=>{e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);try{await updateAssignmentStatus(assignment.odev_id,String(f.get('durum')),String(f.get('ogretmen_notu')||'')||null,String(f.get('puan')||'')||null);await refresh();toast('Ödev durumu güncellendi.');onDone()}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
    <label>Durum<select name="durum" defaultValue={assignment.durum}><option>Bekliyor</option><option>Devam Ediyor</option><option>Teslim Edildi</option><option>Tamamlandı</option></select></label>
    <label>Puan / Not<input name="puan" defaultValue={assignment.puan||''} placeholder="İsteğe bağlı"/></label>
    <label className="wide">Öğretmen Notu<textarea name="ogretmen_notu" rows={3} defaultValue={assignment.ogretmen_notu||''}/></label>
    <div className="wide"><FormActions busy={busy} onCancel={onCancel} label="Durumu Kaydet"/></div>
  </form>
}

export function ProgramMoveForm({ program, onDone, onCancel }: { program:SabitProgram;onDone:()=>void;onCancel:()=>void }) {
  const {data,refresh}=useAppData();const{toast}=useToast();const[busy,setBusy]=useState(false);const[dates,setDates]=useState<any[]>([]);const[loading,setLoading]=useState(true)
  useEffect(()=>{let alive=true;void previewProgram(program.program_id,todayISO(),10).then((r:any)=>{if(alive)setDates(r?.tarihler||[])}).catch((e:any)=>toast(e.message||String(e),'error')).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[program.program_id,toast])
  if(!data)return null
  return <form className="form-grid" onSubmit={async e=>{e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);const input={program_id:program.program_id,orijinal_tarih:String(f.get('orijinal_tarih')),yeni_tarih:String(f.get('yeni_tarih')),yeni_baslangic_saati:String(f.get('yeni_baslangic_saati')),yeni_derslik_id:String(f.get('yeni_derslik_id')),aciklama:String(f.get('aciklama')||'')||null};try{const c=await lessonConflict({tarih:input.yeni_tarih,ogrenci_id:String(program.ogrenci_id||''),ogretmen_id:String(program.ogretmen_id||''),derslik_id:input.yeni_derslik_id,baslangic_saati:input.yeni_baslangic_saati,ders_sayisi:Number(program.ders_sayisi||1),haric_ders_id:null});if(!c?.uygun)throw new Error(c?.mesaj||'Yeni tarih ve saatte çakışma var.');await moveProgramDate(input);await refresh();toast('Bu haftaya özel değişiklik uygulandı. Sabit program değişmedi.');onDone()}catch(err:any){toast(err.message||String(err),'error')}finally{setBusy(false)}}}>
    <label className="wide">Hangi Ders?<select name="orijinal_tarih" required disabled={loading}><option value="">{loading?'Tarihler yükleniyor…':'Seçin'}</option>{dates.map((x:any)=><option key={x.tarih} value={x.tarih}>{x.tarih} · {String(x.saat||program.baslangic_saati||'').slice(0,5)}</option>)}</select></label>
    <label>Yeni Tarih<input name="yeni_tarih" type="date" min={todayISO()} required/></label>
    <label>Yeni Saat<input name="yeni_baslangic_saati" type="text" inputMode="numeric" autoComplete="off" enterKeyHint="next" maxLength={5} pattern="([01][0-9]|2[0-3]):[0-5][0-9]" placeholder="19:00" title="Saati 00:00–23:59 arasında girin." defaultValue={String(program.baslangic_saati||'').slice(0,5)} onInput={e=>{e.currentTarget.value=formatClockInput(e.currentTarget.value)}} required/></label>
    <label>Derslik<select name="yeni_derslik_id" defaultValue={program.derslik_id||''} required>{data.derslikler.filter(x=>x.aktif!==false).map(x=><option key={x.derslik_id} value={x.derslik_id}>{x.mekan_adi}</option>)}</select></label>
    <label className="wide">Açıklama<textarea name="aciklama" rows={2} placeholder="Örn. Bu haftaya özel saat değişikliği"/></label>
    <div className="wide form-hint">Yalnız seçilen tarih taşınır. Haftalık sabit programın gün ve saati değişmez.</div>
    <div className="wide"><FormActions busy={busy||loading} onCancel={onCancel} label="Değişikliği Uygula"/></div>
  </form>
}
