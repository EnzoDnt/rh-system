import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table.js";

export function ParPosteTable({ rows }: { rows: any[] }) {
  return (
    <div className="bg-surface border border-border rounded-[4px] overflow-hidden">
      <Table>
        <TableHeader className="bg-dark text-white">
          <TableRow>
            {["Poste", "Statut", "Candidatures", "Scorées", "Score moyen", "Signalées"].map((h) =>
              <TableHead key={h} className="text-white text-[12px] uppercase tracking-wider">{h}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.titre}</TableCell>
              <TableCell>{r.statut}</TableCell>
              <TableCell>{r.nb_candidatures}</TableCell>
              <TableCell>{r.nb_scored}</TableCell>
              <TableCell>{r.avg_score != null ? Math.round(r.avg_score) : "—"}</TableCell>
              <TableCell>{r.nb_flagged}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
