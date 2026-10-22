import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { z } from "zod";

import { MovementSchema } from "@/domain/account/movement";
import { renderWithIntl } from "@/test/render-with-intl";

import { MovementList } from "./movement-list";

const movement = (overrides: Partial<z.input<typeof MovementSchema>>) =>
  MovementSchema.parse({
    id: "mov_1",
    accountId: "acc_ana",
    type: "TRANSFER_OUT",
    amount: { amount: 25_000, currency: "MXN" },
    counterpartyName: "Luis Pérez",
    createdAt: "2026-10-21T16:42:00.000Z",
    ...overrides,
  });

describe("MovementList", () => {
  it("describes each movement with its signed amount and date", () => {
    renderWithIntl(
      <MovementList
        movements={[
          movement({ id: "mov_1" }),
          movement({
            id: "mov_2",
            type: "TRANSFER_IN",
            amount: { amount: 120_000, currency: "MXN" },
            counterpartyName: "Marta Ruiz",
          }),
          movement({ id: "mov_3", type: "DEPOSIT", counterpartyName: "Nómina Acme S.A." }),
        ]}
      />,
    );

    const [sent, received, deposit] = screen.getAllByRole("listitem");
    expect(sent).toHaveTextContent("Envío a Luis Pérez");
    expect(sent).toHaveTextContent("-$250.00");
    expect(sent).toHaveTextContent("Cargo");
    expect(within(sent!).getByText("21 oct, 10:42")).toHaveAttribute(
      "datetime",
      "2026-10-21T16:42:00.000Z",
    );
    expect(received).toHaveTextContent("Recibido de Marta Ruiz");
    expect(received).toHaveTextContent("+$1,200.00");
    expect(received).toHaveTextContent("Ingreso");
    expect(deposit).toHaveTextContent("Nómina Acme S.A.");
  });

  it("shows an empty state without movements", () => {
    renderWithIntl(<MovementList movements={[]} />);

    expect(screen.getByRole("heading", { name: "Aún no tienes movimientos" })).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
