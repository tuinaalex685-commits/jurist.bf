export default function CodeLoading() {
  return (
    <div className="space-y-8">
      <div className="flex gap-4">
        <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="hall h-[74px] animate-pulse" />
        ))}
      </div>
    </div>
  );
}
