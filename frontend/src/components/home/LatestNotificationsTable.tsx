import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DS } from '@/theme/designSystem'
import { buildLatestNotificationsData } from '@/utils/latestNotificationsTable'
import './LatestNotificationsTable.css'

function formatDisplayDate(value, locale) {
  if (!value) return '—'
  const d = new Date(value)
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString(locale === 'en' ? 'en-IN' : locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }
  return String(value)
}

export default function LatestNotificationsTable({ jobs = [], loading = false, onJobClick }) {
  const { t, i18n } = useTranslation()
  const [activeCategoryId, setActiveCategoryId] = useState('all')

  const locale = i18n.language === 'en' ? 'en-IN' : i18n.language

  const { items, categories, total } = useMemo(
    () => buildLatestNotificationsData(jobs),
    [jobs]
  )

  const filtered = useMemo(() => {
    if (activeCategoryId === 'all') return items
    return items.filter((row) => row.categoryId === activeCategoryId)
  }, [items, activeCategoryId])

  const tabs = useMemo(() => {
    const all = { id: 'all', name: t('latestNotif.allCategories', { defaultValue: 'All' }), count: total }
    return [all, ...categories]
  }, [categories, total, t])

  const handleRowClick = (row) => {
    if (row._job) onJobClick?.(row._job)
  }

  if (loading) {
    return (
      <div className="latest-notif" role="status">
        <p style={{ color: DS.muted, fontSize: 13 }}>
          {t('latestNotif.loading', { defaultValue: 'Loading latest notifications…' })}
        </p>
      </div>
    )
  }

  if (!total) {
    return (
      <div className="latest-notif">
        <p style={{ color: DS.muted, fontSize: 13 }}>
          {t('latestNotif.empty', {
            defaultValue: 'No official listings yet. Run ingest to pull jobs from .gov.in / .gov portals only.',
          })}{' '}
          <code style={{ fontSize: 11 }}>npm run ingest:direct</code>
        </p>
      </div>
    )
  }

  return (
    <div className="latest-notif">
      <p className="latest-notif__intro">
        {t('latestNotif.intro', {
          defaultValue:
            'Latest recruitment from official government portals (.gov.in / .gov). Click a row for full details.',
        })}
      </p>

      <div
        className="latest-notif__tabs"
        role="tablist"
        aria-label={t('latestNotif.categories', { defaultValue: 'Categories' })}
      >
        {tabs.map((tab) => {
          const on = activeCategoryId === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={`latest-notif__tab${on ? ' latest-notif__tab--active' : ''}`}
              onClick={() => setActiveCategoryId(tab.id)}
            >
              {tab.name}
              <span className="latest-notif__tab-count">({tab.count})</span>
            </button>
          )
        })}
      </div>

      <div className="latest-notif__wrap">
        {filtered.length === 0 ? (
          <div className="latest-notif__empty">
            {t('latestNotif.emptyCategory', { defaultValue: 'No jobs in this category right now.' })}
          </div>
        ) : (
          <table className="latest-notif__table">
            <thead>
              <tr>
                <th>{t('latestNotif.colPostDate', { defaultValue: 'Post Date' })}</th>
                <th>{t('latestNotif.colBoard', { defaultValue: 'Recruitment Board' })}</th>
                <th>{t('latestNotif.colPost', { defaultValue: 'Exam / Post Name' })}</th>
                <th>{t('latestNotif.colQual', { defaultValue: 'Qualification' })}</th>
                <th>{t('latestNotif.colAdvt', { defaultValue: 'Advt No' })}</th>
                <th>{t('latestNotif.colLastDate', { defaultValue: 'Last Date' })}</th>
                <th>{t('latestNotif.colMore', { defaultValue: 'More Information' })}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => handleRowClick(row)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleRowClick(row)
                    }
                  }}
                  tabIndex={0}
                >
                  <td>{formatDisplayDate(row.postDateIso || row.postDate, locale)}</td>
                  <td className="latest-notif__board">{row.board}</td>
                  <td className="latest-notif__post">{row.postName}</td>
                  <td>{row.qualification || '—'}</td>
                  <td>{row.advtNo || '—'}</td>
                  <td>{formatDisplayDate(row.lastDateIso || row.lastDate, locale)}</td>
                  <td>
                    {row.detailUrl ? (
                      <a
                        className="latest-notif__link"
                        href={row.detailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t('latestNotif.getDetails', { defaultValue: 'Get Details' })}
                      </a>
                    ) : (
                      <span className="latest-notif__link" style={{ cursor: 'pointer' }}>
                        {t('latestNotif.view', { defaultValue: 'View' })}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="latest-notif__meta">
        {t('latestNotif.meta', {
          count: filtered.length,
          total,
          defaultValue: '{{count}} of {{total}} official listings',
        })}
      </p>
    </div>
  )
}
