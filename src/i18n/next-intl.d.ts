import type messages from "../../messages/es-MX.json";

import type { Locale } from "./config";

// Message keys are typed from the es-MX dictionary, so a missing key fails the typecheck.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
