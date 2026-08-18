import { LogIn, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { APP_MODE } from '../lib/supabase'
import { useAppData } from './AppDataProvider'

export function LoginScreen() {
  const { signIn, error } = useAppData()
  const [busy, setBusy] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const isDemo = APP_MODE === 'demo'
  const handleSignIn = async () => {
    setBusy(true)
    setLoginError(null)
    try {
      await signIn()
    } catch (e: any) {
      const message = e?.message || String(e)
      setLoginError(isDemo ? 'Demo oturumu şu anda açılamadı. Lütfen daha sonra tekrar deneyin.' : message)
    } finally {
      setBusy(false)
    }
  }
  return <main className="login-page"><section className="login-card">
    <img className="login-logo" src="./bs-app-icon-512.png" alt="BS Eğitim" />
    <h1>BS Eğitim Yönetimi</h1>
    <p>{isDemo ? 'Satış demosunu gerçek kişisel veri kullanmadan deneyin.' : 'Ders, öğrenci, öğretmen, program ve finans işlemlerini tek yerden yönetin.'}</p>
    <button className="primary-btn login-btn" disabled={busy} onClick={() => void handleSignIn()}><LogIn size={18}/>{busy ? (isDemo ? 'Demo açılıyor…' : 'Yönlendiriliyor…') : (isDemo ? 'Yönetici Olarak Demoyu Aç' : 'Google ile Giriş Yap')}</button>
    <div className="login-security"><ShieldCheck size={15}/> {isDemo ? 'DEMO · Yalnızca örnek veriler kullanılır.' : 'Yalnız yetkili kurum kullanıcıları erişebilir.'}</div>
    {(loginError || error) && <div className="inline-error">{loginError || error}</div>}
  </section></main>
}
