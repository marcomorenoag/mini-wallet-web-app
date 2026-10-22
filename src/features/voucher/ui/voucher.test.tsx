import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TransferSchema } from "@/domain/transfer/transfer";
import { renderWithIntl } from "@/test/render-with-intl";

import { ShareVoucherButton } from "./share-voucher-button";
import { VoucherCard } from "./voucher-card";

const transfer = TransferSchema.parse({
  id: "trf_3b151e46-6773-4023-935e-5c3945ae7f5b",
  accountId: "acc_ana",
  idempotencyKey: "0b9f1f0e-3c1a-4d8e-9a57-2f6d1c3b8e41",
  recipient: { contactId: "cnt_luis", name: "Luis Pérez", phone: "+525511112222" },
  amount: { amount: 25_050, currency: "MXN" },
  createdAt: "2026-10-22T16:42:00.000Z",
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VoucherCard", () => {
  it("shows the receipt details of a completed transfer", () => {
    renderWithIntl(<VoucherCard transfer={transfer} />);

    expect(screen.getByRole("heading", { name: "¡Transferencia exitosa!" })).toBeInTheDocument();
    const details = screen.getByRole("region", { name: "¡Transferencia exitosa!" });
    expect(details).toHaveTextContent("TX-3B151E46");
    expect(details).toHaveTextContent("Luis Pérez · 55 •••• 2222");
    // Intl separates the currency code with a non-breaking space.
    expect(details).toHaveTextContent(/MXN\s250\.50/);
    expect(details).toHaveTextContent("22 oct 2026, 10:42");
    expect(details).toHaveTextContent("Completada");
  });
});

describe("ShareVoucherButton", () => {
  it("uses the native share sheet when available", async () => {
    const share = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { ...navigator, share });
    renderWithIntl(<ShareVoucherButton text="Transferencia" />);

    await userEvent.click(screen.getByRole("button", { name: "Compartir comprobante" }));
    expect(share).toHaveBeenCalledWith({ title: "Comprobante", text: "Transferencia" });
  });

  it("copies the summary otherwise", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { ...navigator, share: undefined, clipboard: { writeText } });
    renderWithIntl(<ShareVoucherButton text="Transferencia" />);

    await userEvent.click(screen.getByRole("button", { name: "Compartir comprobante" }));
    expect(writeText).toHaveBeenCalledWith("Transferencia");
    expect(await screen.findByText("Comprobante copiado")).toBeInTheDocument();
  });
});
