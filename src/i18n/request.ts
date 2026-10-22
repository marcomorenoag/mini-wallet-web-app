import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, TIME_ZONE } from "./config";

/**
 * Request-scoped i18n configuration, picked up by the next-intl plugin. A single locale is served
 * without locale routing; negotiation (cookie or `Accept-Language`) would be added here.
 */
export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;

  return {
    locale,
    timeZone: TIME_ZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
