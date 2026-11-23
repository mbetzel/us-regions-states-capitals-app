export function ProgressBar({ index, total }: { index: number; total: number }) {
  const current = index + 1;
  const percent = total > 0 ? Math.round((index / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-lg font-bold">{`Question ${current} of ${total}`}</p>
      <div
        role="progressbar"
        aria-label="Round progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index}
        aria-valuetext={`Question ${current} of ${total}`}
        className="h-4 w-full overflow-hidden rounded-full bg-white/70"
      >
        <div
          className="h-full rounded-full bg-green-500 transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
