import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CandidatureCard } from "../../src/components/candidatures/CandidatureCard.js";

describe("CandidatureCard", () => {
  it("shows the score and applies the high-score border accent", () => {
    const { container } = render(<MemoryRouter>
      <CandidatureCard cand={{ id: "c1", nom: "A", email: "a@b", poste_titre: "Dev", score_global: 85, recommandation: "retenir", flagged: false, created_at: "2026-04-01T00:00:00Z" }} />
    </MemoryRouter>);
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(container.querySelector(".border-l-\\[var\\(--color-success\\)\\]")).toBeTruthy();
  });

  it("highlights flagged candidates", () => {
    const { container } = render(<MemoryRouter>
      <CandidatureCard cand={{ id: "c2", nom: "B", email: "b@c", poste_titre: "Dev", score_global: 30, recommandation: "refuser", flagged: true, flag_motif: "Injection", created_at: "2026-04-01T00:00:00Z" }} />
    </MemoryRouter>);
    expect(container.querySelector(".bg-flagged")).toBeTruthy();
  });
});
