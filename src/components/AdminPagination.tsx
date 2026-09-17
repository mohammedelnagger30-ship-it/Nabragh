import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AdminPaginationProps {
  page: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

export default function AdminPagination({ page, total, perPage, onPageChange }: AdminPaginationProps) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
      <span className="text-xs text-slate-500 dark:text-slate-400">
        عرض {start}–{end} من {total.toLocaleString('ar-EG')}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-700"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {pages.map((p, idx) =>
          p === '...' ? (
            <span key={`e${idx}`} className="px-1 text-xs text-slate-400">...</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`min-w-[32px] rounded-lg px-2 py-1 text-xs font-bold transition ${p === page ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'}`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-700"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
