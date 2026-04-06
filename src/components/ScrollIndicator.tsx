export function ScrollIndicator() {
  return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
        <div className="w-1.5 h-3 rounded-full bg-muted-foreground/50 animate-scroll-mouse" />
      </div>
    </div>
  );
}
