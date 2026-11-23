import type { Stars as StarCount } from '../store/useAppStore';

export function Stars({ count }: { count: StarCount }) {
  return (
    <span
      role="img"
      aria-label={`${count} of 3 stars`}
      className="inline-flex text-2xl leading-none"
    >
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          aria-hidden="true"
          className={n <= count ? 'text-amber-400 drop-shadow-sm' : 'text-sky-200'}
        >
          ★
        </span>
      ))}
    </span>
  );
}
