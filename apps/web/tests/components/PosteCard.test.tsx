import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PosteCard } from "../../src/components/postes/PosteCard.js";

describe("PosteCard", () => {
  it("renders titre, statut and nb_candidatures", () => {
    render(<MemoryRouter>
      <PosteCard poste={{ id: "p1", titre: "Backend Dev", statut: "ouvert", nb_candidatures: 5, created_at: "2026-04-01T00:00:00Z" }} />
    </MemoryRouter>);
    expect(screen.getByText("Backend Dev")).toBeInTheDocument();
    expect(screen.getByText(/5 candidat/)).toBeInTheDocument();
    expect(screen.getByText(/Ouvert/i)).toBeInTheDocument();
  });
});
