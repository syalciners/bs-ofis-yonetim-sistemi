import { LogIn, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useAppData } from './AppDataProvider'
export function LoginScreen() {
  const { signIn, error, institution } = useAppData()
  const [busy, setBusy] = useState(false)
  const institutionName=institution?.kurum_adi||'BS Eğitim Yönetimi'
  const logo=institution?.logo_url||'./bs-egitim-icon-512-v2.png'
  return <main className="login-page"><section className="login-card">
    <img className="login-logo" src={logo} alt={institutionName} />
    <h1>{institutionName}</h1>
    <p>Ders, öğrenci, öğretmen, program ve finans işlemlerini tek yerden yönetin.</p>
    <button className="primary-btn login-btn" disabled={busy} onClick={async () => { setBusy(true); try { await signIn() } finally { setBusy(false) } }}><LogIn size={18}/>{busy ? 'Yönlendiriliyor…' : 'Google ile Giriş Yap'}</button>
    <div className="login-security"><ShieldCheck size={15}/> Yalnız yetkili kurum kullanıcıları erişebilir.</div>
    {error && <div className="inline-error">{error}</div>}
  </section></main>
}
