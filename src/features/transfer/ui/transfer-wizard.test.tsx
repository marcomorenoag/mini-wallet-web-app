import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { money } from "@/domain/money/money";
import { apiPath, server, setupMswServer } from "@/test/msw";
import { renderWithIntl } from "@/test/render-with-intl";

import { TransferFlowProvider } from "../transfer-flow-context";
import { TransferWizard } from "./transfer-wizard";

// In-memory router: `?step=` changes re-render the wizard like a client-side navigation.
const nav = vi.hoisted(() => {
  let url = "/transfer";
  const listeners = new Set<() => void>();
  return {
    get url() {
      return url;
    },
    go(next: string) {
      url = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
});

vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    usePathname: () => "/transfer",
    useSearchParams: () =>
      new URLSearchParams(useSyncExternalStore(nav.subscribe, () => nav.url).split("?")[1]),
    useRouter: () => ({ push: nav.go, replace: nav.go }),
  };
});

setupMswServer();

const contacts = [
  { id: "cnt_luis", name: "Luis Pérez", phone: "+525511112222", isFavorite: true },
  { id: "cnt_carlos", name: "Carlos Gómez", phone: "+525555556666", isFavorite: false },
];

const renderWizard = () =>
  renderWithIntl(
    <TransferFlowProvider balance={money(1_250_000)} contacts={contacts}>
      <TransferWizard />
    </TransferFlowProvider>,
  );

const continueButton = () => screen.getByRole("button", { name: "Continuar" });

const fillAmountAndContinue = async (user: ReturnType<typeof userEvent.setup>, amount: string) => {
  await user.type(screen.getByLabelText("Monto"), amount);
  await user.click(continueButton());
};

beforeEach(() => {
  nav.go("/transfer");
});

describe("TransferWizard", () => {
  it("walks through amount, recipient and summary, then confirms", async () => {
    const user = userEvent.setup();
    let idempotencyKey: string | null = null;
    server.use(
      http.post(apiPath("/transfers"), ({ request }) => {
        idempotencyKey = request.headers.get("Idempotency-Key");
        return HttpResponse.json(
          {
            status: "COMPLETED",
            transfer: {
              id: "trf_1",
              idempotencyKey,
              recipient: { contactId: "cnt_luis", name: "Luis Pérez", phone: "+525511112222" },
              amount: { amount: 25_050, currency: "MXN" },
              createdAt: "2026-10-22T16:42:00.000Z",
            },
          },
          { status: 201 },
        );
      }),
    );
    renderWizard();

    expect(screen.getByText("Paso 1 de 3")).toBeInTheDocument();
    expect(screen.getByText("Saldo disponible: $12,500.00")).toBeInTheDocument();
    await fillAmountAndContinue(user, "99999");
    expect(screen.getByText("El monto supera tu saldo.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Monto"));
    await fillAmountAndContinue(user, "250.50");
    expect(nav.url).toBe("/transfer?step=recipient");
    expect(screen.getByRole("heading", { name: "¿A quién se lo envías?" })).toHaveFocus();

    await user.click(continueButton());
    expect(screen.getByText("Elige a quién enviarle dinero.")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Luis Pérez/ }));
    await user.click(continueButton());

    expect(nav.url).toBe("/transfer?step=summary");
    expect(screen.getByText("55 •••• 2222")).toBeInTheDocument();
    expect(screen.getByText("$250.50")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(nav.url).toBe("/voucher/trf_1"));
    expect(idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("saves a new contact and selects it", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(apiPath("/contacts"), async ({ request }) =>
        HttpResponse.json(
          { id: "cnt_new", phone: "+525522223333", ...((await request.json()) as object) },
          { status: 201 },
        ),
      ),
    );
    renderWizard();
    await fillAmountAndContinue(user, "100");

    await user.click(screen.getByRole("button", { name: "Nuevo contacto" }));
    await user.click(screen.getByRole("button", { name: "Guardar en favoritos" }));
    expect(screen.getByText("Ingresa un nombre.")).toBeInTheDocument();
    expect(screen.getByText("Ingresa un teléfono.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nombre"), "Sofía Martínez");
    await user.type(screen.getByLabelText("Teléfono"), "55 2222 3333");
    await user.click(screen.getByRole("button", { name: "Guardar en favoritos" }));

    expect(await screen.findByRole("radio", { name: /Sofía Martínez/ })).toBeChecked();
    expect(screen.queryByRole("form", { name: "Nuevo contacto" })).not.toBeInTheDocument();
  });

  it("shows server-side contact errors on the field", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(apiPath("/contacts"), () =>
        HttpResponse.json(
          {
            type: "about:blank",
            title: "Validation failed",
            status: 422,
            code: "VALIDATION",
            issues: [{ field: "phone", code: "CONTACT_ALREADY_EXISTS" }],
          },
          { status: 422 },
        ),
      ),
    );
    renderWizard();
    await fillAmountAndContinue(user, "100");

    await user.click(screen.getByRole("button", { name: "Nuevo contacto" }));
    await user.type(screen.getByLabelText("Nombre"), "Luis");
    await user.type(screen.getByLabelText("Teléfono"), "55 1111 2222");
    await user.click(screen.getByRole("button", { name: "Guardar en favoritos" }));

    expect(await screen.findByText("Ya tienes un contacto con ese teléfono.")).toBeInTheDocument();
  });

  it("sends a step without its prerequisites back to the first gap", async () => {
    nav.go("/transfer?step=summary");
    renderWizard();

    await waitFor(() => expect(nav.url).toBe("/transfer?step=amount"));
    expect(screen.getByRole("heading", { name: "¿Cuánto quieres enviar?" })).toBeInTheDocument();
  });
});
