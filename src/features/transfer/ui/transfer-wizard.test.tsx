import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { money } from "@/domain/money/money";
import { apiPath, server, setupMswServer } from "@/test/msw";
import { renderWithIntl } from "@/test/render-with-intl";

import { TransferFlowProvider } from "../transfer-flow-context";
import { TransferWizard } from "./transfer-wizard";

// In-memory URL: `?step=` changes re-render the wizard like a client-side navigation.
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

const goToSummary = async (user: ReturnType<typeof userEvent.setup>) => {
  await fillAmountAndContinue(user, "250");
  await user.click(screen.getByRole("radio", { name: /Luis Pérez/ }));
  await user.click(continueButton());
};

/** Balance lookup made after an insufficient-funds rejection. */
const accountResponse = (amount: number) =>
  http.get(apiPath("/account"), () =>
    HttpResponse.json({ userName: "Ana López", balance: { amount, currency: "MXN" } }),
  );

const problemResponse = (code: string, status: number) =>
  HttpResponse.json({ type: "about:blank", title: code, status, code }, { status });

const completedResponse = (idempotencyKey: string | null) =>
  HttpResponse.json(
    {
      status: "COMPLETED",
      transfer: {
        id: "trf_1",
        idempotencyKey,
        recipient: { contactId: "cnt_luis", name: "Luis Pérez", phone: "+525511112222" },
        amount: { amount: 25_000, currency: "MXN" },
        createdAt: "2026-10-22T16:42:00.000Z",
      },
    },
    { status: 201 },
  );

beforeEach(() => {
  nav.go("/transfer");
  // Steps are changed through the History API, which Next.js syncs with `useSearchParams`.
  const toNav = (_state: unknown, _title: string, url?: string | URL | null) => nav.go(String(url));
  vi.spyOn(window.history, "pushState").mockImplementation(toNav);
  vi.spyOn(window.history, "replaceState").mockImplementation(toNav);
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

  it("changes steps through the History API, without a server navigation", async () => {
    const user = userEvent.setup();
    renderWizard();

    await fillAmountAndContinue(user, "250");
    expect(window.history.pushState).toHaveBeenCalledWith(null, "", "/transfer?step=recipient");
    expect(screen.getByText("Paso 2 de 3")).toBeInTheDocument();
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

  it("retries a network failure with the same idempotency key", async () => {
    const user = userEvent.setup();
    const keys: (string | null)[] = [];
    server.use(
      http.post(apiPath("/transfers"), ({ request }) => {
        keys.push(request.headers.get("Idempotency-Key"));
        return keys.length === 1 ? problemResponse("NETWORK", 503) : completedResponse(keys[1]!);
      }),
    );
    renderWizard();
    await goToSummary(user);

    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    const failure = await screen.findByRole("alert");
    expect(failure).toHaveTextContent("No pudimos completar la transferencia");
    expect(failure).toHaveTextContent("No se hizo ningún cargo");

    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(nav.url).toBe("/voucher/trf_1"));
    expect(keys[0]).toBe(keys[1]);
  });

  it("replaces a stale balance after an insufficient-funds rejection", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(apiPath("/transfers"), () => problemResponse("INSUFFICIENT_FUNDS", 422)),
      // The balance was spent elsewhere after the flow was opened.
      accountResponse(10_000),
    );
    renderWizard();
    await goToSummary(user);

    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await screen.findByText(/Tu saldo no alcanza/);
    await user.click(screen.getByRole("button", { name: "Cambiar monto" }));

    expect(await screen.findByText("Saldo disponible: $100.00")).toBeInTheDocument();
    await user.click(continueButton());
    expect(screen.getByText("El monto supera tu saldo.")).toBeInTheDocument();
  });

  it("sends an insufficient-funds failure back to the amount with a new key", async () => {
    const user = userEvent.setup();
    const keys: (string | null)[] = [];
    server.use(
      http.post(apiPath("/transfers"), ({ request }) => {
        keys.push(request.headers.get("Idempotency-Key"));
        return problemResponse("INSUFFICIENT_FUNDS", 422);
      }),
      accountResponse(1_250_000),
    );
    renderWizard();
    await goToSummary(user);

    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText(/Tu saldo no alcanza/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cambiar monto" }));
    expect(nav.url).toBe("/transfer?step=amount");
    expect(screen.getByLabelText("Monto")).toHaveValue("250");

    await user.click(continueButton());
    await user.click(continueButton());
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await screen.findByText(/Tu saldo no alcanza/);
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it.each([
    ["UNKNOWN", 500, "Reintentar"],
    ["TIMEOUT", 504, "Consultar estado"],
  ])("offers the next safe action for %s", async (code, status, action) => {
    const user = userEvent.setup();
    server.use(http.post(apiPath("/transfers"), () => problemResponse(code, status)));
    renderWizard();
    await goToSummary(user);

    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByRole("button", { name: action })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/home");
  });
});
