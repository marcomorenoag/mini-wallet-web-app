import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import ErrorPage from "./error";
import NotFound from "./not-found";

describe("NotFound", () => {
  it("explains the problem and links back home", () => {
    renderWithIntl(<NotFound />);

    expect(screen.getByRole("heading", { name: "Página no encontrada" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/home");
  });
});

describe("ErrorPage", () => {
  it("logs the error and retries the segment on demand", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const retry = vi.fn();
    const error = new Error("boom");
    renderWithIntl(<ErrorPage error={error} retry={retry} />);

    expect(screen.getByRole("heading", { name: "Algo salió mal" })).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith(error);

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
