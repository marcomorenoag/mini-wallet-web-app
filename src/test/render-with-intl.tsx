import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";

import { DEFAULT_LOCALE, TIME_ZONE } from "@/i18n/config";
import messages from "../../messages/es-MX.json";

function IntlWrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale={DEFAULT_LOCALE} timeZone={TIME_ZONE} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

/** Renders a component with the real es-MX dictionary, as the root layout provides it. */
export const renderWithIntl = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
  render(ui, { wrapper: IntlWrapper, ...options });
