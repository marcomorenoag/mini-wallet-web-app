import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { PageShell } from "./page-shell";

describe("PageShell", () => {
  it("renders the content in a focusable main landmark with a skip link", () => {
    renderWithIntl(<PageShell>Contenido</PageShell>);

    const main = screen.getByRole("main");
    expect(main).toHaveTextContent("Contenido");
    expect(main).toHaveAttribute("id", "main");
    expect(main).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("link", { name: "Saltar al contenido" })).toHaveAttribute(
      "href",
      "#main",
    );
  });

  it("renders the top bar only when a header is provided", () => {
    const { rerender } = renderWithIntl(<PageShell>Contenido</PageShell>);
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();

    rerender(<PageShell header={<span>Hola, Ana</span>}>Contenido</PageShell>);
    expect(screen.getByRole("banner")).toHaveTextContent("Hola, Ana");
  });
});
