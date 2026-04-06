import { Calendar, ExternalLink } from "lucide-react";

interface Props {
  contest: { id: number; name: string; startTimeSeconds: number; durationSeconds: number; };
  division: string;
}

function getDivisionColor(division: string): string {
  switch (division) {
    case "Div. 1": return "bg-destructive/10 text-destructive border-destructive/20";
    case "Div. 2": return "bg-accent/10 text-accent border-accent/20";
    case "Div. 3": return "bg-primary/10 text-primary border-primary/20";
    case "Div. 4": return "bg-[hsl(187,92%,69%)]/10 text-[hsl(187,92%,69%)] border-[hsl(187,92%,69%)]/20";
    case "Educational": return "bg-[hsl(120,50%,50%)]/10 text-[hsl(120,50%,50%)] border-[hsl(120,50%,50%)]/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export function ContestCard({ contest, division }: Props) {
  const date = new Date(contest.startTimeSeconds * 1000);

  return (
    <a href={`https://codeforces.com/contest/${contest.id}`} target="_blank" rel="noopener noreferrer"
      className="group glass-card-hover p-6 hover:shadow-[0_0_30px_hsl(217_91%_60%/0.1)]">
      <div className="flex flex-col gap-4">
        <span className={`self-start px-3 py-1 rounded-full text-xs font-medium border ${getDivisionColor(division)}`}>
          {division}
        </span>
        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {contest.name}
        </h3>
        <div className="flex items-center gap-4 text-muted-foreground text-sm">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>{date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-primary text-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-4 h-4" /> View on Codeforces
        </div>
      </div>
    </a>
  );
}
