export function CardSkeleton() {
  return (
    <div className="p-4 flex flex-col gap-3 justify-between rounded-md bg-background border border-border-muted/30 animate-pulse">
      <div className="w-full h-40 bg-foreground/5 rounded-md" />

      <div className="flex justify-between items-center">
        <div className="flex flex-col flex-1 gap-2">
          <div className="h-4 w-3/4 bg-foreground/10 rounded" />
          <div className="h-3 w-1/2 bg-foreground/5 rounded" />
        </div>
        <div className="w-6 h-6 bg-foreground/10 rounded-md" />
      </div>
    </div>
  );
}
