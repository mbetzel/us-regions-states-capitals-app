import type { Mode } from '../quiz/engine';
import type { Stars as StarCount } from '../store/useAppStore';
import { MODE_INFO } from '../lib/modes';
import { Stars } from './Stars';

interface ModeCardProps {
  mode: Mode;
  stars: StarCount;
  onSelect: () => void;
}

export function ModeCard({ mode, stars, onSelect }: ModeCardProps) {
  const info = MODE_INFO[mode];
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full flex-col items-center gap-2 rounded-3xl bg-white p-6 text-center shadow-lg transition-transform motion-safe:active:scale-95 motion-safe:hover:-translate-y-1 hover:shadow-xl focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
    >
      <span aria-hidden="true" className="text-5xl">
        {info.icon}
      </span>
      <span className="text-2xl font-bold text-sky-950">{info.title}</span>
      <span className="text-lg text-sky-800">{info.subtitle}</span>
      <Stars count={stars} />
    </button>
  );
}
