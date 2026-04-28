import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreBadge } from "../../src/components/candidatures/ScoreBadge.js";

describe("ScoreBadge", () => {
  it("renders the numeric score when provided", () => {
    render(<ScoreBadge score={85} />);
    expect(screen.getByText("85")).toBeInTheDocument();
  });

  it("renders an em-dash when score is null", () => {
    render(<ScoreBadge score={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
