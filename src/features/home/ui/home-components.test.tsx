import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { money } from "@/domain/money/money";
import { renderWithIntl } from "@/test/render-with-intl";

import { BalanceCard } from "./balance-card";
import { HomeHeader } from "./home-header";

vi.mock("../actions", () => ({ logoutAction: vi.fn() }));

describe("BalanceCard", () => {
  it("shows the formatted balance with its currency", () => {
    renderWithIntl(<BalanceCard balance={money(1_250_000)} />);

    const card = screen.getByRole("region", { name: "Saldo disponible" });
    expect(card).toHaveTextContent("$12,500.00");
    expect(card).toHaveTextContent("MXN");
  });
});

describe("HomeHeader", () => {
  it("greets the user by first name and offers theme and logout controls", () => {
    renderWithIntl(<HomeHeader userName="Ana López" />);

    expect(screen.getByRole("heading", { level: 1, name: "Hola, Ana" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cambiar tema" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salir" })).toHaveAttribute("type", "submit");
  });
});
