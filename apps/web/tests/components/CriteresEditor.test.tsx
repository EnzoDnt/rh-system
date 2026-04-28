import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CriteresEditor } from "../../src/components/postes/CriteresEditor.js";

describe("CriteresEditor", () => {
  it("renders existing criteres and allows adding one", async () => {
    const onChange = vi.fn();
    render(<CriteresEditor value={{ tech: { poids: 60, description: "TS" } }} onChange={onChange} />);
    expect(screen.getByDisplayValue("tech")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /ajouter/i }));
    expect(onChange).toHaveBeenCalled();
  });

  it("removes a critere on delete", async () => {
    const onChange = vi.fn();
    render(<CriteresEditor value={{ a: { poids: 50, description: "x" } }} onChange={onChange} />);
    await userEvent.click(screen.getAllByRole("button", { name: /supprimer/i })[0]!);
    expect(onChange).toHaveBeenCalledWith({});
  });
});
