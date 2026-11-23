export type MascotMood = 'idle' | 'happy' | 'encourage' | 'celebrate';

interface MascotProps {
  mood: MascotMood;
  /** Optional speech bubble text. Visible to everyone; the drawing itself is decorative. */
  message?: string;
}

const INK = '#1e3a8a';

/** Mouth and eye shapes per mood. Drawn in a 120 x 120 box. */
function Face({ mood }: { mood: MascotMood }) {
  if (mood === 'happy' || mood === 'celebrate') {
    return (
      <>
        {mood === 'celebrate' ? (
          <>
            <path
              d="M38 52 Q45 42 52 52"
              fill="none"
              stroke={INK}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M68 52 Q75 42 82 52"
              fill="none"
              stroke={INK}
              strokeWidth="4"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <circle cx="45" cy="50" r="5" fill={INK} />
            <circle cx="75" cy="50" r="5" fill={INK} />
          </>
        )}
        <path
          d="M38 70 Q60 98 82 70 Z"
          fill={INK}
          stroke={INK}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M52 86 Q60 80 68 86 Q60 92 52 86 Z" fill="#f472b6" />
      </>
    );
  }
  if (mood === 'encourage') {
    return (
      <>
        <circle cx="45" cy="52" r="5" fill={INK} />
        <circle cx="75" cy="52" r="5" fill={INK} />
        <path d="M38 44 L52 47" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M82 44 L68 47" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path
          d="M46 82 Q60 78 74 82"
          fill="none"
          stroke={INK}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </>
    );
  }
  return (
    <>
      <circle cx="45" cy="52" r="5" fill={INK} />
      <circle cx="75" cy="52" r="5" fill={INK} />
      <path
        d="M42 74 Q60 86 78 74"
        fill="none"
        stroke={INK}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </>
  );
}

/** Friendly round compass named Cody. An original drawing made for this app. */
export function Mascot({ mood, message }: MascotProps) {
  const motion =
    mood === 'happy' || mood === 'celebrate'
      ? 'anim-bounce'
      : mood === 'encourage'
        ? 'anim-tilt'
        : '';
  return (
    <div className="flex flex-wrap items-center justify-center gap-3" data-testid="mascot">
      <div data-mood={mood} className={`size-24 shrink-0 sm:size-28 ${motion}`}>
        <svg
          viewBox="0 0 120 120"
          aria-hidden="true"
          focusable="false"
          className="size-full overflow-visible"
        >
          {/* Compass points: north in red, the others in ink */}
          <polygon points="51,22 60,2 69,22" fill="#ef4444" />
          <polygon points="98,51 118,60 98,69" fill={INK} />
          <polygon points="51,98 60,118 69,98" fill={INK} />
          <polygon points="22,51 2,60 22,69" fill={INK} />
          <circle cx="60" cy="60" r="40" fill="#fef9c3" stroke={INK} strokeWidth="4" />
          <circle cx="36" cy="66" r="6" fill="#fda4af" opacity="0.7" />
          <circle cx="84" cy="66" r="6" fill="#fda4af" opacity="0.7" />
          <Face mood={mood} />
        </svg>
      </div>
      {message && (
        <p className="max-w-xs rounded-2xl bg-white px-4 py-2 text-lg font-bold text-sky-950 shadow-md">
          {message}
        </p>
      )}
    </div>
  );
}
