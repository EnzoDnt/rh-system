import { Link } from "react-router-dom";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table.js";
import { ScoreBadge } from "./ScoreBadge.js";
import { useFormatDate, recoBadgeClass } from "@/lib/format.js";

export function CandidatureTable({ rows }: { rows: any[] }) {
  const fmt = useFormatDate();
  return (
    <Table>
      <TableHeader className="bg-dark text-white">
        <TableRow>
          {["Nom", "Email", "Poste", "Score", "Recommandation", "Statut", "Date"].map((h) =>
            <TableHead key={h} className="text-white text-[12px] uppercase tracking-wider">{h}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.id} className={c.flagged ? "bg-flagged hover:bg-flagged" : ""}>
            <TableCell><Link className="hover:underline" to={`/candidatures/${c.id}`}>{c.nom}</Link></TableCell>
            <TableCell>{c.email}</TableCell>
            <TableCell>{c.poste_titre}</TableCell>
            <TableCell><ScoreBadge score={c.score_global} size={28} /></TableCell>
            <TableCell>{c.recommandation && <span className={`text-[11px] px-2 py-0.5 rounded-[4px] border ${recoBadgeClass(c.recommandation)}`}>{c.recommandation}</span>}</TableCell>
            <TableCell>{c.statut}</TableCell>
            <TableCell>{fmt(c.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
