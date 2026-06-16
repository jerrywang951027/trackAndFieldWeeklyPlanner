export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-1/3 animate-pulse rounded-md bg-secondary" />
      <div className="h-4 w-2/3 animate-pulse rounded-md bg-secondary" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl bg-secondary"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-secondary" />
    </div>
  );
}
