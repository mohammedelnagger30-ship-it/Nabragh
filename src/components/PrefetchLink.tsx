import { Link, LinkProps } from 'react-router-dom';
import { useCallback, useRef } from 'react';

const prefetched = new Set<string>();

function prefetchRoute(pathname: string) {
  if (prefetched.has(pathname)) return;
  prefetched.add(pathname);

  const routes: Record<string, () => Promise<unknown>> = {
    '/teachers': () => import('@/pages/TeachersPage'),
    '/courses': () => import('@/pages/CoursesPage'),
    '/categories': () => import('@/pages/CategoriesPage'),
    '/competitions': () => import('@/pages/CompetitionsPage'),
    '/dashboard': () => import('@/pages/DashboardPage'),
    '/search': () => import('@/pages/SearchPage'),
    '/become-teacher': () => import('@/pages/BecomeTeacherPage'),
    '/contact': () => import('@/pages/ContactPage'),
  };

  const match = routes[pathname];
  if (match) match().catch(() => {});
}

type PrefetchLinkProps = LinkProps & { prefetch?: boolean };

export default function PrefetchLink({ to, prefetch = true, onMouseEnter, ...props }: PrefetchLinkProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (prefetch) {
        const href = typeof to === 'string' ? to : to.pathname || '';
        timerRef.current = setTimeout(() => prefetchRoute(href), 100);
      }
      onMouseEnter?.(e);
    },
    [to, prefetch, onMouseEnter]
  );

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  return <Link to={to} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} {...props} />;
}
