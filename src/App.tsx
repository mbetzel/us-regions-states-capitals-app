import { USMap } from './map/USMap';

export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-sky-200 p-6">
      <h1 className="font-display text-4xl font-bold text-sky-900 sm:text-6xl">
        US Geography Quiz
      </h1>
      <div className="w-full max-w-4xl">
        <USMap colorMode="regions" highlight={null} />
      </div>
    </main>
  );
}
