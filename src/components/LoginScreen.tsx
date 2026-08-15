import { LogIn, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useAppData } from './AppDataProvider'
export function LoginScreen() {
  const { signIn, error } = useAppData()
  const [busy, setBusy] = useState(false)
  return <main className="login-page"><section className="login-card">
    <img className="login-logo" src="./bs-app-icon-512.png" alt="BS Eğitim" />
    <h1>BS Eğitim Yönetimi</h1>
    <p>Ders, öğrenci, öğretmen, program ve finans işlemlerini tek yerden yönetin.</p>
    <button className="primary-btn login-btn" disabled={busy} onClick={async () => { setBusy(true); try { await signIn() } finally { setBusy(false) } }}><LogIn size={18}/>{busy ? 'Yönlendiriliyor…' : 'Google ile Giriş Yap'}</button>
    <div className="login-security"><ShieldCheck size={15}/> Yalnız yetkili kurum kullanıcıları erişebilir.</div>
    {error && <div className="inline-error">{error}</div>}
  </section></main>
}
