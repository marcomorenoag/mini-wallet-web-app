import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import type { LoginFormState } from "../login-form-state";
import { LoginForm } from "./login-form";

const loginAction = vi.hoisted(() =>
  vi.fn<(previous: LoginFormState, formData: FormData) => Promise<LoginFormState>>(),
);
vi.mock("../actions", () => ({ loginAction }));

const field = () => screen.getByLabelText("Teléfono o correo electrónico");
const submitButton = () => screen.getByRole("button", { name: /Continuar|Entrando/ });

beforeEach(() => {
  loginAction.mockReset();
});

describe("LoginForm", () => {
  it("blocks invalid input on the client and explains why", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LoginForm />);

    await user.click(submitButton());
    expect(screen.getByText("Ingresa tu teléfono o correo electrónico.")).toBeInTheDocument();
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveFocus();

    await user.type(field(), "abc");
    expect(screen.getByText("Ingresa un teléfono o correo válido.")).toBeInTheDocument();

    await user.clear(field());
    await user.type(field(), "ana@example.com");
    expect(field()).not.toHaveAttribute("aria-invalid");
    expect(loginAction).not.toHaveBeenCalled();
  });

  it("validates on blur once something was typed", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LoginForm />);

    await user.type(field(), "55 12");
    await user.tab();

    expect(screen.getByText("Ingresa un teléfono o correo válido.")).toBeInTheDocument();
  });

  it("submits valid input with the destination and shows a pending state", async () => {
    const user = userEvent.setup();
    let resolve: (state: LoginFormState) => void = () => undefined;
    loginAction.mockImplementation(() => new Promise((done) => (resolve = done)));
    renderWithIntl(<LoginForm next="/transfer" />);

    await user.type(field(), "ana@example.com");
    await user.click(submitButton());

    await waitFor(() => expect(submitButton()).toBeDisabled());
    expect(submitButton()).toHaveTextContent("Entrando…");
    const formData = loginAction.mock.calls[0]?.[1];
    expect(formData?.get("identifier")).toBe("ana@example.com");
    expect(formData?.get("next")).toBe("/transfer");

    resolve({ identifier: "ana@example.com", fieldError: "IDENTIFIER_NOT_FOUND" });
    expect(await screen.findByText("No encontramos una cuenta con esos datos.")).toBeVisible();
  });

  it("submits a value that was filled before hydration (no change event)", async () => {
    const user = userEvent.setup();
    loginAction.mockResolvedValue({ identifier: "ana@example.com" });
    renderWithIntl(<LoginForm />);

    // Autofill or typing before React hydrated the page sets the DOM value without `onChange`.
    (field() as HTMLInputElement).value = "ana@example.com";
    await user.click(submitButton());

    await waitFor(() => expect(loginAction).toHaveBeenCalledOnce());
    expect(loginAction.mock.calls[0]?.[1].get("identifier")).toBe("ana@example.com");
    expect(screen.queryByText("Ingresa tu teléfono o correo electrónico.")).not.toBeInTheDocument();
  });

  it("shows a banner for problems and keeps the typed value", async () => {
    const user = userEvent.setup();
    loginAction.mockResolvedValue({ identifier: "ana@example.com", problem: "NETWORK" });
    renderWithIntl(<LoginForm />);

    await user.type(field(), "ana@example.com");
    await user.click(submitButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No pudimos iniciar sesión");
    expect(alert).toHaveTextContent("Hubo un problema de conexión. Intenta de nuevo.");
    expect(field()).toHaveValue("ana@example.com");
  });

  it("hides a server field error once the value is edited", async () => {
    const user = userEvent.setup();
    loginAction.mockResolvedValue({
      identifier: "nobody@example.com",
      fieldError: "IDENTIFIER_NOT_FOUND",
    });
    renderWithIntl(<LoginForm />);

    await user.type(field(), "nobody@example.com");
    await user.click(submitButton());
    await screen.findByText("No encontramos una cuenta con esos datos.");

    await user.type(field(), "x");
    expect(screen.queryByText("No encontramos una cuenta con esos datos.")).not.toBeInTheDocument();
  });
});
