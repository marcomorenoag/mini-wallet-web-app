import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { LinkPendingIcon } from "./link-pending-icon";
import { RetryButton } from "./retry-button";
import { SubmitButton } from "./submit-button";

const link = vi.hoisted(() => ({ pending: false }));
vi.mock("next/link", () => ({ useLinkStatus: () => ({ pending: link.pending }) }));

beforeEach(() => {
  link.pending = false;
});

describe("LinkPendingIcon", () => {
  it("shows the icon while the link is idle", () => {
    renderWithIntl(<LinkPendingIcon icon={<svg data-testid="icon" />} />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("swaps the icon for a spinner while the destination loads", () => {
    link.pending = true;
    const { container } = renderWithIntl(<LinkPendingIcon icon={<svg data-testid="icon" />} />);
    expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders nothing for a link without an icon until it is pending", () => {
    const { container } = renderWithIntl(<LinkPendingIcon />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("SubmitButton", () => {
  it("is disabled with a spinner while the form action runs", async () => {
    const user = userEvent.setup();
    // An action that never settles keeps the form pending.
    const action = vi.fn(() => new Promise<void>(() => {}));
    renderWithIntl(
      <form action={action}>
        <SubmitButton icon={<svg data-testid="icon" />}>Salir</SubmitButton>
      </form>,
    );

    const button = screen.getByRole("button", { name: "Salir" });
    expect(button).toBeEnabled();
    await user.click(button);

    expect(action).toHaveBeenCalledOnce();
    expect(button).toBeDisabled();
    expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
    expect(button.querySelector(".animate-spin")).toBeInTheDocument();
  });
});

describe("RetryButton", () => {
  it("retries the segment", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    renderWithIntl(<RetryButton retry={retry} />);

    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
