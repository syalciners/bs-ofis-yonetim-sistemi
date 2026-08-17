import { GraduationCap, Printer, School, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAppData } from '../components/AppDataProvider'
import { addDays, fullDate, money, todayISO } from '../lib/format'
import { reportFilename } from '../lib/reportFilename'
import { branchName, cashBalance, totalOpenDebt, totalTeacherBalance } from '../services/metrics'
import { openStudentAccountPdf } from '../services/studentAccountPdfService'
import { openTeacherEarningPdf } from '../services/teacherEarningPdfService'

type ReportType = 'kurum' | 'ogrenci' | 'ogretmen'
type RangePreset = 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear' | 'all' | 'custom'
type DateRange = { start?: string; end?: string; label: string }
type StudentMovement = { date: string; label: string; debit: number; credit: number; balance: number }

const lessonStatuses = ['Yapıldı', 'Planlandı', 'İptal', 'Öğrenci Gelmedi', 'Ertelendi', 'Öğretmen İptali']
const studentRangeOptions: Array<{ value: RangePreset; label: string }> = [
  { value: 'thisMonth', label: 'Bu Ay' },
  { value: 'lastMonth', label: 'Geçen Ay' },
  { value: 'last3Months', label: 'Son 3 Ay' },
  { value: 'thisYear', label: 'Bu Yıl' },
  { value: 'all', label: 'Tüm Dönem' },
  { value: 'custom', label: 'Özel Tarih Aralığı' },
]
const institutionRangeOptions = studentRangeOptions.filter(x => x.value !== 'all')

const isoDate = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)

const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`
const shiftMonthStart = (iso: string, amount: number) => {
  const date = new Date(`${monthStart(iso)}T12:00:00+03:00`)
  date.setMonth(date.getMonth() + amount)
  return isoDate(date)
}
const monthEnd = (iso: string) => addDays(shiftMonthStart(iso, 1), -1)
const formatPercent = (value: number) =>
  `%${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(Number.isFinite(value) ? value : 0)}`

const resolveRange = (
  preset: RangePreset,
  today: string,
  customStart: string,
  customEnd: string,
): DateRange => {
  if (preset === 'all') return { label: 'Tüm kayıt dönemi' }

  let start = monthStart(today)
  let end = monthEnd(today)
  if (preset === 'lastMonth') {
    start = shiftMonthStart(today, -1)
    end = addDays(monthStart(today), -1)
  } else if (preset === 'last3Months') {
    start = shiftMonthStart(today, -2)
  } else if (preset === 'thisYear') {
    start = `${today.slice(0, 4)}-01-01`
    end = `${today.slice(0, 4)}-12-31`
  } else if (preset === 'custom') {
    start = customStart || monthStart(today)
    end = customEnd || today
    if (start > end) [start, end] = [end, start]
  }
  return { start, end, label: `${fullDate(start)} — ${fullDate(end)}` }
}

const inRange = (date: string | null | undefined, range: DateRange) =>
  Boolean(date) && (!range.start || String(date) >= range.start) && (!range.end || String(date) <= range.end)

const reportCodePart = (value?: string | null) =>
  String(value || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-5)
    .toUpperCase() || 'GENEL'

export function ReportsPage() {
  const { data } = useAppData()
  const [type, setType] = useState<ReportType>('kurum')
  const [student, setStudent] = useState('')
  const [teacher, setTeacher] = useState('')
  const today = todayISO()

  const [studentRangePreset, setStudentRangePreset] = useState<RangePreset>('thisMonth')
  const [institutionRangePreset, setInstitutionRangePreset] = useState<RangePreset>('thisMonth')
  const [studentCustomStart, setStudentCustomStart] = useState(monthStart(today))
  const [studentCustomEnd, setStudentCustomEnd] = useState(monthEnd(today))
  const [institutionCustomStart, setInstitutionCustomStart] = useState(monthStart(today))
  const [institutionCustomEnd, setInstitutionCustomEnd] = useState(monthEnd(today))

  const periods = (data?.hakedisDonemleri || [])
    .filter(x=>x.aktif!==false&&x.baslangic_tarihi<=today)
    .sort((a, b) => b.baslangic_tarihi.localeCompare(a.baslangic_tarihi))
  const currentPeriod = periods.find(x => today >= x.baslangic_tarihi && today <= x.bitis_tarihi)
  const [teacherPeriod, setTeacherPeriod] = useState('')

  useEffect(() => {
    if (!teacherPeriod && periods.length) {
      setTeacherPeriod(currentPeriod?.hakedis_donemi_id||periods[0].hakedis_donemi_id)
    }
  }, [teacherPeriod, currentPeriod?.hakedis_donemi_id, periods])

  const studentRange = useMemo(
    () => resolveRange(studentRangePreset, today, studentCustomStart, studentCustomEnd),
    [studentRangePreset, today, studentCustomStart, studentCustomEnd],
  )
  const institutionRange = useMemo(
    () => resolveRange(institutionRangePreset, today, institutionCustomStart, institutionCustomEnd),
    [institutionRangePreset, today, institutionCustomStart, institutionCustomEnd],
  )

  if (!data) return null

  const selectedStudent = data.ogrenciler.find(x => x.ogrenci_id === student)
  const selectedTeacher = data.ogretmenler.find(x => x.ogretmen_id === teacher)
  const selectedPeriod = periods.find(x => x.hakedis_donemi_id === teacherPeriod)

  const reportTitle =
    type === 'kurum' ? 'Kurum Yönetim Raporu' : type === 'ogrenci' ? 'Öğrenci Hesap Ekstresi' : 'Öğretmen Hakediş Raporu'
  const reportSubtitle =
    type === 'kurum'
      ? 'Operasyonel performans, finansal durum ve nakit akışı'
      : type === 'ogrenci'
        ? 'Ders tahakkukları, tahsilatlar ve dönemsel bakiye özeti'
        : 'Dönem dersleri, hakediş tahakkuku ve ödeme mutabakatı'
  const reportKicker = type === 'kurum' ? 'Yönetim Raporu' : type === 'ogrenci' ? 'Öğrenci Raporu' : 'Öğretmen Raporu'
  const periodText = type === 'kurum' ? institutionRange.label : type === 'ogrenci' ? studentRange.label : selectedPeriod?.donem_adi || 'Dönem seçilmedi'
  const subjectText =
    type === 'kurum'
      ? 'BS Eğitim'
      : type === 'ogrenci'
        ? selectedStudent?.ad_soyad || 'Öğrenci seçilmedi'
        : selectedTeacher?.ad_soyad || 'Öğretmen seçilmedi'
  const reportCodeSuffix =
    type === 'kurum'
      ? reportCodePart(institutionRange.start || today)
      : type === 'ogrenci'
        ? reportCodePart(student)
        : `${reportCodePart(teacher)}-${reportCodePart(teacherPeriod)}`
  const reportCode = `BS-${today.replaceAll('-', '')}-${type === 'kurum' ? 'KUR' : type === 'ogrenci' ? 'OGR' : 'OGT'}-${reportCodeSuffix}`
  const pdfFilename = reportFilename({
    type,
    today,
    studentName: selectedStudent?.ad_soyad,
    teacherName: selectedTeacher?.ad_soyad,
    periodStart: selectedPeriod?.baslangic_tarihi,
  })
  const logoSrc = `${import.meta.env.BASE_URL}bs-egitim-icon-512-v2.png`

  const handlePrint = async () => {
    if (type === 'ogrenci') {
      if (!student || !selectedStudent) {
        window.alert('PDF oluşturmak için öğrenci seçin.')
        return
      }

      const allStudentLessons = data.dersler.filter(x => x.ogrenci_id === student && x.ders_durumu === 'Yapıldı')
      const allStudentPayments = data.tahsilatlar.filter(x => x.ogrenci_id === student && !x.iptal_mi)
      const openingAccrual = studentRange.start
        ? allStudentLessons
            .filter(x => (x.tarih || '') < studentRange.start!)
            .reduce((sum, x) => sum + Number(x.ogrenci_toplam_tutar || 0), 0)
        : 0
      const openingPayments = studentRange.start
        ? allStudentPayments
            .filter(x => x.tarih < studentRange.start!)
            .reduce((sum, x) => sum + Number(x.tutar || 0), 0)
        : 0
      const openingBalance = openingAccrual - openingPayments
      const periodLessons = allStudentLessons.filter(x => inRange(x.tarih, studentRange))
      const periodPayments = allStudentPayments.filter(x => inRange(x.tarih, studentRange))
      const totalAccrual = periodLessons.reduce((sum, x) => sum + Number(x.ogrenci_toplam_tutar || 0), 0)
      const totalPaid = periodPayments.reduce((sum, x) => sum + Number(x.tutar || 0), 0)
      const periodEndBalance = openingBalance + totalAccrual - totalPaid
      const lessonUnits = periodLessons.reduce((sum, x) => sum + Number(x.ders_sayisi || 1), 0)

      let running = openingBalance
      const movements = [
        ...periodLessons.map(x => ({
          date: x.tarih || '',
          label: `${branchName(data, x.brans_id)} · ${Number(x.ders_sayisi || 1)} Ders`,
          debit: Number(x.ogrenci_toplam_tutar || 0),
          credit: 0,
          order: `${x.tarih || ''}-1-${x.ders_id}`,
        })),
        ...periodPayments.map(x => ({
          date: x.tarih || '',
          label: `Tahsilat · ${x.odeme_yontemi || 'Ödeme'}`,
          debit: 0,
          credit: Number(x.tutar || 0),
          order: `${x.tarih || ''}-2-${x.tahsilat_id}`,
        })),
      ].sort((a, b) => a.order.localeCompare(b.order))
      const ledger: StudentMovement[] = movements.map(x => {
        running += x.debit - x.credit
        return { date: x.date, label: x.label, debit: x.debit, credit: x.credit, balance: running }
      })

      try {
        await openStudentAccountPdf({
          studentName: selectedStudent.ad_soyad,
          guardianName: selectedStudent.veli_adi,
          periodLabel: studentRange.label,
          reportCode,
          documentDate: today,
          openingDate: studentRange.start,
          openingBalance,
          totalAccrual,
          totalPaid,
          periodEndBalance,
          lessonUnits,
          paymentCount: periodPayments.length,
          movements: ledger,
          filename: pdfFilename,
        })
      } catch (error: any) {
        window.alert(error?.message || 'Öğrenci ekstresi PDF olarak oluşturulamadı.')
      }
      return
    }

    if (type === 'ogretmen') {
      if (!teacher || !selectedTeacher || !teacherPeriod || !selectedPeriod) {
        window.alert('PDF oluşturmak için öğretmen ve hakediş dönemi seçin.')
        return
      }

      const allLessons = data.dersler
        .filter(x=>x.ogretmen_id===teacher&&x.ders_durumu==='Yapıldı'&&(x.tarih||'')>=selectedPeriod.baslangic_tarihi&&(x.tarih||'')<=selectedPeriod.bitis_tarihi)
        .sort(
          (a, b) =>
            String(a.tarih || '').localeCompare(String(b.tarih || '')) ||
            String(a.baslangic_saati || '').localeCompare(String(b.baslangic_saati || '')),
        )
      const allPayments = data.ogretmenOdemeleri
        .filter(x=>x.ogretmen_id===teacher&&x.hakedis_donemi_id===teacherPeriod&&!x.iptal_mi)
        .sort((a, b) => String(a.tarih || '').localeCompare(String(b.tarih || '')))
      const totalEarned = allLessons.reduce((sum, x) => sum + Number(x.ogretmen_toplam_hakedis || 0), 0)
      const totalPaid = allPayments.reduce((sum, x) => sum + Number(x.tutar || 0), 0)
      const remaining = totalEarned - totalPaid
      const paymentStatus: 'Ödendi'|'Kısmi Ödendi'|'Ödenmedi' = remaining <= 0 ? 'Ödendi' : totalPaid > 0 ? 'Kısmi Ödendi' : 'Ödenmedi'
      const lessonUnits = allLessons.reduce((sum, x) => sum + Number(x.ders_sayisi || 1), 0)

      try {
        await openTeacherEarningPdf({
          teacherName: selectedTeacher.ad_soyad,
          branches: selectedTeacher.branslar,
          periodName: selectedPeriod.donem_adi,
          periodStart: selectedPeriod.baslangic_tarihi,
          periodEnd: selectedPeriod.bitis_tarihi,
          reportCode,
          documentDate: today,
          lessonUnits,
          totalEarned,
          totalPaid,
          remaining,
          paymentStatus,
          lessons: allLessons.map(x => ({
            date: x.tarih || '',
            studentName: data.ogrenciler.find(s => s.ogrenci_id === x.ogrenci_id)?.ad_soyad || 'Öğrenci',
            branchName: branchName(data, x.brans_id),
            lessonCount: Number(x.ders_sayisi || 1),
            unitEarning: Number(x.ogretmen_birim_hakedisi || 0),
            totalEarning: Number(x.ogretmen_toplam_hakedis || 0),
          })),
          payments: allPayments.map(x => ({
            date: x.tarih || '',
            method: x.odeme_yontemi || '—',
            description: x.aciklama || '—',
            amount: Number(x.tutar || 0),
          })),
          filename: pdfFilename,
        })
      } catch (error: any) {
        window.alert(error?.message || 'Öğretmen hakediş raporu PDF olarak oluşturulamadı.')
      }
      return
    }

    const previousTitle = document.title
    const restore = () => {
      if (document.title === pdfFilename) document.title = previousTitle
    }
    document.title = pdfFilename
    window.addEventListener('focus', () => window.setTimeout(restore, 1200), { once: true })
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()))
    window.setTimeout(restore, 120000)
  }

  const institutionLessons = data.dersler.filter(x => inRange(x.tarih, institutionRange))
  const completedInstitutionLessons = institutionLessons.filter(x => x.ders_durumu === 'Yapıldı')
  const institutionRevenue = completedInstitutionLessons.reduce((sum, x) => sum + Number(x.ogrenci_toplam_tutar || 0), 0)
  const institutionTeacherAccrual = completedInstitutionLessons.reduce((sum, x) => sum + Number(x.ogretmen_toplam_hakedis || 0), 0)
  const institutionCollections = data.tahsilatlar
    .filter(x => !x.iptal_mi && inRange(x.tarih, institutionRange))
    .reduce((sum, x) => sum + Number(x.tutar || 0), 0)
  const institutionExpenses = data.giderler
    .filter(x => !x.iptal_mi && inRange(x.tarih, institutionRange))
    .reduce((sum, x) => sum + Number(x.tutar || 0), 0)
  const institutionTeacherPaid = data.ogretmenOdemeleri
    .filter(x => !x.iptal_mi && inRange(x.tarih, institutionRange))
    .reduce((sum, x) => sum + Number(x.tutar || 0), 0)
  const operationalResult = institutionRevenue - institutionTeacherAccrual - institutionExpenses
  const netCashMovement = institutionCollections - institutionTeacherPaid - institutionExpenses
  const collectionRate = institutionRevenue ? (institutionCollections / institutionRevenue) * 100 : 0
  const teacherCostRate = institutionRevenue ? (institutionTeacherAccrual / institutionRevenue) * 100 : 0
  const operationalMargin = institutionRevenue ? (operationalResult / institutionRevenue) * 100 : 0

  const institutionStatusRows = lessonStatuses.map(status => {
    const rows = institutionLessons.filter(x => x.ders_durumu === status)
    return {
      status,
      count: rows.length,
      percent: institutionLessons.length ? (rows.length / institutionLessons.length) * 100 : 0,
    }
  })

  return (
    <div className="page-stack report-page">
      <section className="page-title-row no-print">
        <div>
          <span className="eyebrow">RAPORLAR</span>
          <h1>Raporlar</h1>
          <p>Yönetim, öğrenci ve öğretmen raporlarını kurumsal belge düzeninde görüntüle.</p>
        </div>
        <button className="secondary-btn" onClick={() => void handlePrint()}>
          <Printer size={17} />
          Yazdır / PDF
        </button>
      </section>

      <section className="report-choice no-print">
        <button className={type === 'kurum' ? 'active' : ''} onClick={() => setType('kurum')}>
          <School />
          <span>
            <b>Kurum Yönetim Raporu</b>
            <small>Operasyon, finans ve nakit özeti</small>
          </span>
        </button>
        <button className={type === 'ogrenci' ? 'active' : ''} onClick={() => setType('ogrenci')}>
          <UserRound />
          <span>
            <b>Öğrenci Hesap Ekstresi</b>
            <small>Ders borcu, tahsilat ve bakiye</small>
          </span>
        </button>
        <button className={type === 'ogretmen' ? 'active' : ''} onClick={() => setType('ogretmen')}>
          <GraduationCap />
          <span>
            <b>Öğretmen Hakedişi</b>
            <small>Dönem ders, hakediş ve ödeme</small>
          </span>
        </button>
      </section>

      {type === 'kurum' && (
        <>
          <div className="report-filter-row report-filter-single no-print">
            <label className="report-filter-field">
              <span>Rapor Dönemi</span>
              <select
                className="report-select"
                value={institutionRangePreset}
                onChange={e => setInstitutionRangePreset(e.target.value as RangePreset)}
              >
                {institutionRangeOptions.map(x => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {institutionRangePreset === 'custom' && (
            <div className="report-date-row no-print">
              <label className="report-filter-field">
                <span>Başlangıç</span>
                <input type="date" value={institutionCustomStart} onChange={e => setInstitutionCustomStart(e.target.value)} />
              </label>
              <label className="report-filter-field">
                <span>Bitiş</span>
                <input type="date" value={institutionCustomEnd} onChange={e => setInstitutionCustomEnd(e.target.value)} />
              </label>
            </div>
          )}
        </>
      )}

      {type === 'ogrenci' && (
        <>
          <div className="report-filter-row no-print">
            <label className="report-filter-field">
              <span>Öğrenci</span>
              <select className="report-select" value={student} onChange={e => setStudent(e.target.value)}>
                <option value="">Öğrenci seçin</option>
                {data.ogrenciler.map(x => (
                  <option key={x.ogrenci_id} value={x.ogrenci_id}>
                    {x.ad_soyad}
                  </option>
                ))}
              </select>
            </label>
            <label className="report-filter-field">
              <span>Rapor Dönemi</span>
              <select
                className="report-select"
                value={studentRangePreset}
                onChange={e => setStudentRangePreset(e.target.value as RangePreset)}
              >
                {studentRangeOptions.map(x => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {studentRangePreset === 'custom' && (
            <div className="report-date-row no-print">
              <label className="report-filter-field">
                <span>Başlangıç</span>
                <input type="date" value={studentCustomStart} onChange={e => setStudentCustomStart(e.target.value)} />
              </label>
              <label className="report-filter-field">
                <span>Bitiş</span>
                <input type="date" value={studentCustomEnd} onChange={e => setStudentCustomEnd(e.target.value)} />
              </label>
            </div>
          )}
        </>
      )}

      {type === 'ogretmen' && (
        <div className="report-filter-row no-print">
          <label className="report-filter-field">
            <span>Öğretmen</span>
            <select className="report-select" value={teacher} onChange={e => setTeacher(e.target.value)}>
              <option value="">Öğretmen seçin</option>
              {data.ogretmenler
                .filter(x => x.durum !== 'Pasif')
                .map(x => (
                  <option key={x.ogretmen_id} value={x.ogretmen_id}>
                    {x.ad_soyad}
                  </option>
                ))}
            </select>
          </label>
          <label className="report-filter-field">
            <span>Hakediş Dönemi</span>
            <select className="report-select" value={teacherPeriod} onChange={e => setTeacherPeriod(e.target.value)}>
              <option value="">Hakediş dönemi seçin</option>
              {periods.map(x => (
                <option key={x.hakedis_donemi_id} value={x.hakedis_donemi_id}>
                  {x.donem_adi}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <section className="report-sheet">
        <header className="report-doc-header">
          <div className="report-brand-lockup">
            <img src={logoSrc} alt="BS Eğitim" />
            <div>
              <h2>BS Eğitim Yönetimi</h2>
              <span>Kurumsal eğitim operasyonları</span>
            </div>
          </div>
          <div className="report-doc-heading">
            <span className="report-doc-kicker">{reportKicker}</span>
            <h2>{reportTitle}</h2>
            <p>{reportSubtitle}</p>
            <b>{periodText}</b>
          </div>
        </header>
        <div className="report-accent-line">
          <span />
        </div>
        <div className="report-meta">
          <div>
            <span>Rapor Kodu</span>
            <b>{reportCode}</b>
          </div>
          <div>
            <span>Rapor Konusu</span>
            <b>{subjectText}</b>
          </div>
          <div>
            <span>Belge Tarihi</span>
            <b>{fullDate(today)}</b>
          </div>
        </div>

        <div className="report-content">
          {type === 'kurum' && (
            <>
              <h3>
                Yönetim Özeti <span className="report-section-note">{institutionRange.label}</span>
              </h3>

              <div className="report-dual-summary">
                <section className="report-summary-panel report-summary-operations">
                  <header>
                    <div>
                      <span>OPERASYONEL SONUÇ</span>
                      <small>Hizmet üretimi ve tahakkuk</small>
                    </div>
                    <b>{money(operationalResult)}</b>
                  </header>
                  <div>
                    <span>Gerçekleşen Ciro</span>
                    <strong>{money(institutionRevenue)}</strong>
                  </div>
                  <div>
                    <span>Öğretmen Hakedişi</span>
                    <strong>{money(institutionTeacherAccrual)}</strong>
                  </div>
                  <div>
                    <span>Genel Gider</span>
                    <strong>{money(institutionExpenses)}</strong>
                  </div>
                </section>

                <section className="report-summary-panel report-summary-cash">
                  <header>
                    <div>
                      <span>NAKİT AKIŞI</span>
                      <small>Gerçek para giriş ve çıkışları</small>
                    </div>
                    <b>{money(netCashMovement)}</b>
                  </header>
                  <div>
                    <span>Tahsilat</span>
                    <strong>{money(institutionCollections)}</strong>
                  </div>
                  <div>
                    <span>Öğretmen Ödemesi</span>
                    <strong>{money(institutionTeacherPaid)}</strong>
                  </div>
                  <div>
                    <span>Genel Gider</span>
                    <strong>{money(institutionExpenses)}</strong>
                  </div>
                </section>
              </div>

              <div className="report-kpis corporate report-kpis-premium">
                <div>
                  <span>Öğrenci Alacağı</span>
                  <b>{money(totalOpenDebt(data))}</b>
                  <small>Açık öğrenci bakiyeleri</small>
                </div>
                <div>
                  <span>Öğretmen Borcu</span>
                  <b>{money(totalTeacherBalance(data))}</b>
                  <small>Ödenmemiş hakediş</small>
                </div>
                <div>
                  <span>Kasa / Banka</span>
                  <b>{money(cashBalance(data))}</b>
                  <small>Güncel hesap bakiyesi</small>
                </div>
                <div>
                  <span>Yapılan Ders</span>
                  <b>{completedInstitutionLessons.length}</b>
                  <small>Seçili dönem toplamı</small>
                </div>
              </div>

              <h3>
                Ders Durumu Dağılımı <span className="report-section-note">operasyon kalitesi</span>
              </h3>
              <div className="report-status-distribution">
                {institutionStatusRows.map(row => (
                  <div key={row.status}>
                    <span className="strong">{row.status}</span>
                    <b>{row.count}</b>
                    <div>
                      <i style={{ width: `${Math.max(row.percent, row.count ? 2 : 0)}%` }} />
                    </div>
                    <strong>{formatPercent(row.percent)}</strong>
                  </div>
                ))}
              </div>

              <h3>
                Yönetim Notları <span className="report-section-note">tek bakışta karar desteği</span>
              </h3>
              <div className="report-management-notes">
                <div>
                  <span>Tahsilat / Ciro</span>
                  <b>{formatPercent(collectionRate)}</b>
                  <small>Seçili dönemde tahsilatın gerçekleşen ciroya oranı.</small>
                </div>
                <div>
                  <span>Hakediş / Ciro</span>
                  <b>{formatPercent(teacherCostRate)}</b>
                  <small>Öğretmen hakedişinin gerçekleşen ciroya oranı.</small>
                </div>
                <div>
                  <span>Operasyonel Marj</span>
                  <b>{formatPercent(operationalMargin)}</b>
                  <small>Cirodan hakediş ve genel gider düşüldükten sonraki oran.</small>
                </div>
              </div>
            </>
          )}

          {type === 'ogrenci' &&
            student &&
            (() => {
              const s = data.ogrenciler.find(x => x.ogrenci_id === student)!
              const allStudentLessons = data.dersler.filter(x => x.ogrenci_id === student && x.ders_durumu === 'Yapıldı')
              const allStudentPayments = data.tahsilatlar.filter(x => x.ogrenci_id === student && !x.iptal_mi)

              const openingAccrual = studentRange.start
                ? allStudentLessons
                    .filter(x => (x.tarih || '') < studentRange.start!)
                    .reduce((sum, x) => sum + Number(x.ogrenci_toplam_tutar || 0), 0)
                : 0
              const openingPayments = studentRange.start
                ? allStudentPayments
                    .filter(x => x.tarih < studentRange.start!)
                    .reduce((sum, x) => sum + Number(x.tutar || 0), 0)
                : 0
              const openingBalance = openingAccrual - openingPayments

              const periodLessons = allStudentLessons.filter(x => inRange(x.tarih, studentRange))
              const periodPayments = allStudentPayments.filter(x => inRange(x.tarih, studentRange))
              const totalAccrual = periodLessons.reduce((sum, x) => sum + Number(x.ogrenci_toplam_tutar || 0), 0)
              const totalPaid = periodPayments.reduce((sum, x) => sum + Number(x.tutar || 0), 0)
              const periodEndBalance = openingBalance + totalAccrual - totalPaid
              const lessonUnits = periodLessons.reduce((sum, x) => sum + Number(x.ders_sayisi || 1), 0)

              let running = openingBalance
              const movements = [
                ...periodLessons.map(x => ({
                  date: x.tarih || '',
                  label: `${branchName(data, x.brans_id)} · ${Number(x.ders_sayisi || 1)} Ders`,
                  debit: Number(x.ogrenci_toplam_tutar || 0),
                  credit: 0,
                  order: `${x.tarih || ''}-1-${x.ders_id}`,
                })),
                ...periodPayments.map(x => ({
                  date: x.tarih || '',
                  label: `Tahsilat · ${x.odeme_yontemi || 'Ödeme'}`,
                  debit: 0,
                  credit: Number(x.tutar || 0),
                  order: `${x.tarih || ''}-2-${x.tahsilat_id}`,
                })),
              ].sort((a, b) => a.order.localeCompare(b.order))

              const ledger: StudentMovement[] = movements.map(x => {
                running += x.debit - x.credit
                return { date: x.date, label: x.label, debit: x.debit, credit: x.credit, balance: running }
              })
              const balanceLabel =
                periodEndBalance > 0 ? 'Ödenecek Bakiye' : periodEndBalance < 0 ? 'Peşin Bakiye' : 'Bakiye Kapalı'
              const balanceClass =
                periodEndBalance > 0 ? 'report-balance-positive' : periodEndBalance < 0 ? 'report-balance-negative' : ''

              return (
                <>
                  <section className="report-subject-card">
                    <span className="report-subject-avatar">Ö</span>
                    <div>
                      <h3>{s.ad_soyad}</h3>
                      <p>
                        Veli: {s.veli_adi || '—'} · Rapor dönemi: {studentRange.label}
                      </p>
                    </div>
                    <aside>
                      <span>Hesap Durumu</span>
                      <b>{balanceLabel}</b>
                    </aside>
                  </section>

                  <div className="report-kpis corporate report-kpis-premium">
                    <div>
                      <span>Devir Bakiyesi</span>
                      <b>{money(openingBalance)}</b>
                      <small>{studentRange.start ? `${fullDate(studentRange.start)} öncesinden` : 'Tüm dönem başlangıcı'}</small>
                    </div>
                    <div>
                      <span>Dönem Ders Borcu</span>
                      <b>{money(totalAccrual)}</b>
                      <small>{lessonUnits} ders</small>
                    </div>
                    <div>
                      <span>Dönem Tahsilatı</span>
                      <b>{money(totalPaid)}</b>
                      <small>{periodPayments.length} ödeme</small>
                    </div>
                    <div>
                      <span>{balanceLabel}</span>
                      <b className={balanceClass}>{money(Math.abs(periodEndBalance))}</b>
                      <small>Dönem sonu hesap durumu</small>
                    </div>
                  </div>

                  <h3>
                    Hesap Hareketleri <span className="report-section-note">kronolojik ekstre</span>
                  </h3>
                  <div className="report-table corporate">
                    <div className="report-tr head">
                      <span>Tarih</span>
                      <span>İşlem</span>
                      <span className="num">Borç</span>
                      <span className="num">Tahsilat</span>
                      <span className="num">Bakiye</span>
                    </div>
                    {studentRange.start && (
                      <div className="report-tr report-opening-row">
                        <span>{fullDate(studentRange.start)}</span>
                        <span className="strong">Önceki Dönemden Devir</span>
                        <span className="num">{openingBalance > 0 ? money(openingBalance) : '—'}</span>
                        <span className="num">{openingBalance < 0 ? money(Math.abs(openingBalance)) : '—'}</span>
                        <span className={`num strong ${openingBalance < 0 ? 'report-balance-negative' : openingBalance > 0 ? 'report-balance-positive' : ''}`}>
                          {money(openingBalance)}
                        </span>
                      </div>
                    )}
                    {ledger.length ? (
                      ledger.map((x, i) => (
                        <div className="report-tr" key={`${x.date}-${i}`}>
                          <span>{fullDate(x.date)}</span>
                          <span className="strong">{x.label}</span>
                          <span className="num">{x.debit ? money(x.debit) : '—'}</span>
                          <span className="num">{x.credit ? money(x.credit) : '—'}</span>
                          <span className={`num strong ${x.balance < 0 ? 'report-balance-negative' : x.balance > 0 ? 'report-balance-positive' : ''}`}>
                            {money(x.balance)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="report-empty-row">Seçili dönemde hesap hareketi bulunmuyor.</div>
                    )}
                  </div>

                  <section className="report-closing-summary">
                    <div>
                      <span>Dönem Özeti</span>
                      <p>Seçili dönemin ders tahakkukları, tahsilatları ve devir bakiyesi birlikte hesaplanmıştır.</p>
                    </div>
                    <aside>
                      <span>{balanceLabel}</span>
                      <b className={balanceClass}>{money(Math.abs(periodEndBalance))}</b>
                    </aside>
                  </section>
                </>
              )
            })()}

          {type === 'ogrenci' && !student && <div className="report-placeholder">Raporu görmek için öğrenci seçin.</div>}

          {type === 'ogretmen' &&
            teacher &&
            teacherPeriod &&
            (() => {
              const t = data.ogretmenler.find(x => x.ogretmen_id === teacher)!
              const p = periods.find(x => x.hakedis_donemi_id === teacherPeriod)
              if (!p) return <div className="report-placeholder">Hakediş dönemi bulunamadı.</div>

              const allLessons = data.dersler
                .filter(x=>x.ogretmen_id===teacher&&x.ders_durumu==='Yapıldı'&&(x.tarih||'')>=p.baslangic_tarihi&&(x.tarih||'')<=p.bitis_tarihi)
                .sort(
                  (a, b) =>
                    String(a.tarih || '').localeCompare(String(b.tarih || '')) ||
                    String(a.baslangic_saati || '').localeCompare(String(b.baslangic_saati || '')),
                )
              const allPayments = data.ogretmenOdemeleri
                .filter(x=>x.ogretmen_id===teacher&&x.hakedis_donemi_id===teacherPeriod&&!x.iptal_mi)
                .sort((a, b) => String(a.tarih || '').localeCompare(String(b.tarih || '')))
              const totalEarned = allLessons.reduce((sum, x) => sum + Number(x.ogretmen_toplam_hakedis || 0), 0)
              const totalPaid = allPayments.reduce((sum, x) => sum + Number(x.tutar || 0), 0)
              const remaining = totalEarned - totalPaid
              const paymentStatus = remaining <= 0 ? 'Ödendi' : totalPaid > 0 ? 'Kısmi Ödendi' : 'Ödenmedi'

              return (
                <>
                  <section className="report-subject-card report-teacher-subject">
                    <span className="report-subject-avatar">Ö</span>
                    <div>
                      <h3>{t.ad_soyad}</h3>
                      <p>
                        Branş: {t.branslar || '—'} · {fullDate(p.baslangic_tarihi)} — {fullDate(p.bitis_tarihi)}
                      </p>
                    </div>
                    <aside className={`report-payment-status status-${paymentStatus === 'Ödendi' ? 'paid' : paymentStatus === 'Kısmi Ödendi' ? 'partial' : 'open'}`}>
                      <span>Dönem Durumu</span>
                      <b>{paymentStatus}</b>
                    </aside>
                  </section>

                  <div className="report-kpis corporate report-kpis-premium">
                    <div>
                      <span>Yapılan Ders</span>
                      <b>{allLessons.reduce((sum, x) => sum + Number(x.ders_sayisi || 1), 0)}</b>
                      <small>Dönem toplamı</small>
                    </div>
                    <div>
                      <span>Dönem Hakedişi</span>
                      <b>{money(totalEarned)}</b>
                      <small>Tahakkuk</small>
                    </div>
                    <div>
                      <span>Dönem Ödemesi</span>
                      <b>{money(totalPaid)}</b>
                      <small>Gerçek ödeme</small>
                    </div>
                    <div>
                      <span>Kalan Hakediş</span>
                      <b className={remaining > 0 ? 'report-balance-positive' : ''}>{money(remaining)}</b>
                      <small>Ödenecek</small>
                    </div>
                  </div>

                  <h3>
                    Dönem Dersleri <span className="report-section-note">hakediş detayı</span>
                  </h3>
                  <div className="report-table teacher-detail-ledger">
                    <div className="report-tr head">
                      <span>Tarih</span>
                      <span>Öğrenci</span>
                      <span>Branş</span>
                      <span className="num">Ders</span>
                      <span className="num">Birim Hakediş</span>
                      <span className="num">Hakediş Tutarı</span>
                    </div>
                    {allLessons.length ? (
                      allLessons.map(x => (
                        <div className="report-tr" key={x.ders_id}>
                          <span>{fullDate(x.tarih)}</span>
                          <span className="strong">{data.ogrenciler.find(s => s.ogrenci_id === x.ogrenci_id)?.ad_soyad || 'Öğrenci'}</span>
                          <span>{branchName(data, x.brans_id)}</span>
                          <span className="num">{Number(x.ders_sayisi || 1)}</span>
                          <span className="num">{money(x.ogretmen_birim_hakedisi)}</span>
                          <span className="num strong">{money(x.ogretmen_toplam_hakedis)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="report-empty-row">Bu dönemde yapılmış ders yok.</div>
                    )}
                  </div>

                  <h3>
                    Dönem Ödemeleri <span className="report-section-note">ödeme hareketleri</span>
                  </h3>
                  <div className="report-table payment-ledger">
                    <div className="report-tr head">
                      <span>Tarih</span>
                      <span>Yöntem</span>
                      <span>Açıklama</span>
                      <span className="num">Tutar</span>
                    </div>
                    {allPayments.length ? (
                      allPayments.map(x => (
                        <div className="report-tr" key={x.ogretmen_odeme_id}>
                          <span>{fullDate(x.tarih)}</span>
                          <span>{x.odeme_yontemi || '—'}</span>
                          <span>{x.aciklama || '—'}</span>
                          <span className="num">{money(x.tutar)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="report-empty-row">Bu dönemde ödeme kaydı yok.</div>
                    )}
                  </div>

                  <section className="report-reconciliation">
                    <div>
                      <span>Dönem Hakedişi</span>
                      <b>{money(totalEarned)}</b>
                    </div>
                    <div>
                      <span>Dönem Ödemesi</span>
                      <b>{money(totalPaid)}</b>
                    </div>
                    <aside>
                      <span>Kalan</span>
                      <b>{money(remaining)}</b>
                    </aside>
                  </section>
                </>
              )
            })()}

          {type === 'ogretmen' && (!teacher || !teacherPeriod) && (
            <div className="report-placeholder">Raporu görmek için öğretmen ve hakediş dönemi seçin.</div>
          )}

          <footer className="report-doc-footer">
            <span>
              <b>BS Eğitim Yönetimi</b> tarafından oluşturulmuştur.
            </span>
            <span>
              Belge tarihi: {fullDate(today)} · Rapor kodu: {reportCode}
            </span>
          </footer>
        </div>
      </section>
    </div>
  )
}
