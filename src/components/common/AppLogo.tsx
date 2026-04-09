/** Same three-bar mark as footer; scales with className on the wrapper if needed. */
export function AppLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-end gap-0.5 ${className}`} aria-hidden>
      <span className="w-1.5 sm:w-2 h-4 sm:h-5 rounded-sm bg-orange-500" />
      <span className="w-1.5 sm:w-2 h-4 sm:h-5 rounded-sm bg-amber-400" />
      <span className="w-1.5 sm:w-2 h-4 sm:h-5 rounded-sm bg-cyan-400" />
    </span>
  );
}
