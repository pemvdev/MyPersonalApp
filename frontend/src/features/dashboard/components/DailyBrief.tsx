import { Icon } from '../../../components/ui/Icon'
import type { BriefArticle } from '../types'

interface DailyBriefProps {
  articles: BriefArticle[]
  bookmarks: string[]
  onBookmark: (id: string) => void
  onOpen: (article: BriefArticle) => void
  onViewAll?: () => void
}

export function DailyBrief({
  articles,
  bookmarks,
  onBookmark,
  onOpen,
  onViewAll,
}: DailyBriefProps) {
  return (
    <section
      className="grid gap-6 rounded-xl bg-sand p-6 sm:p-7 xl:grid-cols-[.9fr_1.6fr]"
      aria-labelledby="brief-heading"
    >
      <div>
        <p className="section-kicker flex items-center gap-2 text-muted">
          <Icon name="sparkles" className="size-4" />
          Your briefing
        </p>
        <h2
          id="brief-heading"
          className="mt-4 max-w-64 font-editorial text-[25px] leading-tight tracking-[-.04em]"
        >
          A little clarity for your day.
        </h2>
        <p className="mt-3 max-w-64 text-[10px] leading-5 text-muted">
          A personal perspective, drawn from your tasks and recorded finances.
        </p>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="mt-5 flex items-center gap-2 text-[10px] font-semibold"
          >
            Open daily brief
            <Icon name="arrow" className="size-3.5" />
          </button>
        )}
      </div>
      <ol className="divide-y divide-ink/8">
        {articles.map((article, index) => (
          <li
            key={article.id}
            className="flex items-start gap-4 py-4 first:pt-1"
          >
            <span className="pt-1 font-editorial text-lg text-muted/50">
              {String(index + 1).padStart(2, '0')}
            </span>
            <button
              className="flex-1 text-left"
              onClick={() => onOpen(article)}
            >
              <span className="text-[8px] uppercase tracking-[.12em] text-muted">
                {article.category} · {article.readTime} min read
              </span>
              <span className="mt-1.5 block text-[10px] leading-5 hover:underline">
                {article.title}
              </span>
            </button>
            <button
              aria-label={`${bookmarks.includes(article.id) ? 'Unsave' : 'Save'} article: ${article.title}`}
              aria-pressed={bookmarks.includes(article.id)}
              onClick={() => onBookmark(article.id)}
              className="icon-button -mr-1 text-muted"
            >
              <Icon
                name="bookmark"
                filled={bookmarks.includes(article.id)}
                className="size-3.5"
              />
            </button>
          </li>
        ))}
      </ol>
      {articles.length === 0 && (
        <p className="py-8 text-xs text-muted">
          No matching articles. Try another search.
        </p>
      )}
    </section>
  )
}
