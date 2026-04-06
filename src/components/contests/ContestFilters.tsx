import { Filter } from "lucide-react";

interface Props {
  division: string; setDivision: (v: string) => void;
  year: string; setYear: (v: string) => void;
  sortBy: string; setSortBy: (v: string) => void;
}

const divisions = [
  { value: "all", label: "All Divisions" }, { value: "Div. 1", label: "Div. 1" },
  { value: "Div. 2", label: "Div. 2" }, { value: "Div. 3", label: "Div. 3" },
  { value: "Div. 4", label: "Div. 4" }, { value: "Educational", label: "Educational" },
];

const years = [
  { value: "all", label: "All Years" }, { value: "2026", label: "2026" },
  { value: "2025", label: "2025" }, { value: "2024", label: "2024" },
  { value: "2023", label: "2023" }, { value: "2022", label: "2022" },
];

export function ContestFilters({ division, setDivision, year, setYear, sortBy, setSortBy }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 glass-card">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">Filters:</span>
      </div>
      <select value={division} onChange={(e) => setDivision(e.target.value)}
        className="px-4 py-2 rounded-lg bg-background/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer">
        {divisions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
      </select>
      <select value={year} onChange={(e) => setYear(e.target.value)}
        className="px-4 py-2 rounded-lg bg-background/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer">
        {years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
      </select>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">Sort:</span>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 rounded-lg bg-background/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>
    </div>
  );
}
