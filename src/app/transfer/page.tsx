import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageShell } from "@/components/layout/page-shell";
import { loadTransferSetup } from "@/features/transfer/data";
import { TransferFlowProvider } from "@/features/transfer/transfer-flow-context";
import { TransferBackLink, TransferWizard } from "@/features/transfer/ui/transfer-wizard";
import { getCurrentUser } from "@/server/current-user";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("transfer");
  return { title: t("metadataTitle") };
}

/** Balance and contacts are loaded on the server; the wizard itself runs on the client. */
export default async function TransferPage() {
  const user = await getCurrentUser();
  const [{ balance, contacts }, t] = await Promise.all([
    loadTransferSetup(user.id),
    getTranslations("transfer"),
  ]);

  return (
    <TransferFlowProvider balance={balance} contacts={contacts}>
      <PageShell
        header={
          <>
            <TransferBackLink />
            <h1 className="font-heading text-lg font-semibold">{t("title")}</h1>
          </>
        }
      >
        <TransferWizard />
      </PageShell>
    </TransferFlowProvider>
  );
}
