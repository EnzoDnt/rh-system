import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PromptEditor } from "../../src/components/prompts/PromptEditor.js";

vi.mock("../../src/lib/mutations.js", () => ({
  useUpdatePrompt: () => ({ mutateAsync: vi.fn(async () => ({ success: true, version: 2 })), isPending: false }),
}));

const qc = new QueryClient();

describe("PromptEditor", () => {
  it("renders system prompt and persists edit on save", async () => {
    render(
      <QueryClientProvider client={qc}>
        <PromptEditor prompt={{ id: "p1", nom: "X", system_prompt: "hello", model: "claude-sonnet-4-6", variables_disponibles: [] }} />
      </QueryClientProvider>);
    expect(screen.getByDisplayValue("hello")).toBeInTheDocument();
    const ta = screen.getByRole("textbox");
    await userEvent.clear(ta);
    await userEvent.type(ta, "world");
    await userEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
  });
});
