import {
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Video,
} from 'lucide-react'
import { useMemo, useState } from 'react'

type Tab = 'bugun' | 'program' | 'odevler' | 'profil'

type PreviewTask = {
  id: string
  group: 'Geciken' | 'Bugün' | 'Yaklaşan'
  title: string
  detail: string
  due: string
}

function isoDate(offset = 0) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

function trDate(value: string, long = false) {
  const date = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat('tr-TR', long
    ? { weekday: 'long', day: 'numeric', month: 'long' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

const initialTasks: PreviewTask[] = [
  {
    id: 'preview-1',
    group: 'Bugün',
    title: 'Matematik çalışması',
    detail: 'Örnek soru bankası · Test 4–5',
    due: isoDate(0),
  },
  {
    id: 'preview-2',
    group: 'Yaklaşan',
    title: 'Fen bilimleri tekrarı',
    detail: 'Kuvvet ve hareket · konu tekrarı',
    due: isoDate(2),
  },
]

const previewLessons = [
  { id: 'l1', start: '16:00', end: '16:50', branch: 'Matematik', teacher: 'Öğretmen', room: 'Derslik' },
  { id: 'l2', start: '18:00', end: '18:50', branch: 'Fen Bilimleri', teacher: 'Öğretmen', room: 'Online' },
]

function LessonList() {
  return <div className="lesson-list">
    {previewLessons.map((item, index) => <article className="lesson-card" key={item.id}>
      <div className="lesson-time"><strong>{item.start}</strong><span>{item.end}</span></div>
      <div className="lesson-copy">
        <h3>{item.branch}</h3>
        <p>{item.teacher}</p>
        <small>{item.room}</small>
      </div>
      {index === 1 && <button className="zoom" type="button"><Video /> Katıl</button>}
    </article>)}
  </div>
}

function Today({ tasks, onComplete }: { tasks: PreviewTask[]; onComplete: (id: string) => void }) {
  const groups = ['Geciken', 'Bugün', 'Yaklaşan'] as const
  const summary = useMemo(() => ({
    geciken: tasks.filter(x => x.group === 'Geciken').length,
    bugun: tasks.filter(x => x.group === 'Bugün').length,
    yaklasan: tasks.filter(x => x.group === 'Yaklaşan').length,
  }), [tasks])

  return <div className="page-stack">
    <section className="today-hero">
      <div>
        <span className="eyebrow">BUGÜN · {trDate(isoDate(), true).toLocaleUpperCase('tr-TR')}</span>
        <h1>Merhaba, Öğrenci.</h1>
        <p>Önce tamamlanması gerekenleri gösteriyoruz; geri kalan bilgi gerektiği yerde hazır.</p>
      </div>
      <div className="today-summary">
        <span className={summary.geciken ? 'danger' : ''}><b>{summary.geciken}</b><small>Geciken</small></span>
        <span><b>{summary.bugun}</b><small>Bugün</small></span>
        <span><b>{summary.yaklasan}</b><small>Yaklaşan</small></span>
      </div>
    </section>

    <section className="panel">
      <div className="section-head"><div><span>ÇALIŞMALAR</span><h2>Önce bunları tamamla</h2></div></div>
      {!tasks.length ? <div className="empty success"><CheckCircle2 /><b>Güncel çalışmalar tamam.</b><span>Yeni bir çalışma verildiğinde burada görünecek.</span></div> : <div className="study-groups">
        {groups.map(group => {
          const rows = tasks.filter(item => item.group === group)
          if (!rows.length) return null
          return <div className="study-group" key={group}>
            <h3 className={group === 'Geciken' ? 'danger-text' : ''}>{group}</h3>
            {rows.map(item => <article className={`study-card ${group === 'Geciken' ? 'overdue' : ''}`} key={item.id}>
              <div className="study-icon"><BookOpenCheck /></div>
              <div className="study-copy"><b>{item.title}</b><span>{item.detail}</span><small>Son teslim: {trDate(item.due)}</small></div>
              <button className="done-button" type="button" onClick={() => onComplete(item.id)}><Check /> Tamamladım</button>
            </article>)}
          </div>
        })}
      </div>}
    </section>

    <section className="panel">
      <div className="section-head"><div><span>DERSLER</span><h2>Bugünkü program</h2></div><small>{previewLessons.length} ders</small></div>
      <LessonList />
    </section>
  </div>
}

function Program() {
  return <div className="page-stack">
    <header className="page-title"><span className="eyebrow">PROGRAM</span><h1>Önümüzdeki 30 gün</h1><p>Dersler tarih ve saat sırasıyla gösterilir.</p></header>
    <section className="panel">
      <div className="section-head"><div><span>{trDate(isoDate(), true).toLocaleUpperCase('tr-TR')}</span><h2>{trDate(isoDate())}</h2></div><small>2 ders</small></div>
      <LessonList />
    </section>
    <section className="panel">
      <div className="section-head"><div><span>{trDate(isoDate(2), true).toLocaleUpperCase('tr-TR')}</span><h2>{trDate(isoDate(2))}</h2></div><small>1 ders</small></div>
      <div className="lesson-list"><article className="lesson-card"><div className="lesson-time"><strong>17:00</strong><span>17:50</span></div><div className="lesson-copy"><h3>Türkçe</h3><p>Öğretmen</p><small>Derslik</small></div></article></div>
    </section>
  </div>
}

function Assignments() {
  return <div className="page-stack">
    <header className="page-title"><span className="eyebrow">ÇALIŞMALAR</span><h1>Ödevler</h1><p>Verilen ve tamamlanan çalışmaların geçmişi.</p></header>
    <section className="panel assignment-history">
      <article><span className="history-status">Verildi</span><div><b>Matematik çalışması</b><p>Örnek soru bankası · Test 4–5</p><small>{trDate(isoDate(-1))} · Son teslim {trDate(isoDate())}</small></div></article>
      <article><span className="history-status done">Tamamlandı</span><div><b>Paragraf çalışması</b><p>20 soru</p><small>{trDate(isoDate(-3))}</small></div></article>
    </section>
  </div>
}

function Profile() {
  return <div className="page-stack">
    <header className="page-title"><span className="eyebrow">PROFİL</span><h1>Hesabım</h1><p>Portal kimliği doğrulanmış Google hesabıyla eşleştirilir.</p></header>
    <section className="profile-card"><div className="profile-avatar"><UserRound /></div><div><span>Öğrenci</span><h2>Örnek Öğrenci</h2><p>tasarım-onizleme@ornek.local</p></div><button type="button" disabled>Çıkış Yap</button></section>
    <div className="privacy-note"><ShieldCheck /><div><b>Yalnız eğitim bilgileri</b><span>Finans, tahsilat veya kurum yönetim bilgileri öğrenci portalında gösterilmez.</span></div></div>
  </div>
}

export default function PreviewApp() {
  const [tab, setTab] = useState<Tab>('bugun')
  const [tasks, setTasks] = useState(initialTasks)
  const [message, setMessage] = useState<string | null>(null)

  const complete = (id: string) => {
    setTasks(current => current.filter(item => item.id !== id))
    setMessage('Önizleme: çalışma tamamlandı. Gerçek veriye kayıt yapılmadı.')
  }

  const nav = [
    { id: 'bugun' as const, label: 'Bugün', Icon: Clock3 },
    { id: 'program' as const, label: 'Program', Icon: CalendarDays },
    { id: 'odevler' as const, label: 'Ödevler', Icon: BookOpenCheck },
    { id: 'profil' as const, label: 'Profil', Icon: UserRound },
  ]

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark small">BS</div><div><b>BS Eğitim</b><span>Portal</span></div></div>
      <div className="top-actions"><span>Tasarım Önizlemesi</span><button type="button" aria-label="Yenile" onClick={() => setTasks(initialTasks)}><RefreshCw /></button></div>
    </header>
    <main className="container">
      <div className="toast"><ShieldCheck />Tasarım önizlemesi · canlı öğrenci verisi kullanılmıyor.</div>
      {message && <div className="toast"><CheckCircle2 />{message}</div>}
      {tab === 'bugun' && <Today tasks={tasks} onComplete={complete} />}
      {tab === 'program' && <Program />}
      {tab === 'odevler' && <Assignments />}
      {tab === 'profil' && <Profile />}
    </main>
    <nav className="bottom-nav" aria-label="Portal menüsü">{nav.map(({ id, label, Icon }) => <button type="button" key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon /><span>{label}</span></button>)}</nav>
  </div>
}
