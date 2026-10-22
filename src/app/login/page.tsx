import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageShell } from "@/components/layout/page-shell";
import { LoginForm } from "@/features/login/ui/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login");
  return { title: t("metadataTitle") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [{ next }, t] = await Promise.all([searchParams, getTranslations("login")]);

  return (
    <PageShell className="justify-center">
      {/* A CSS entrance animation, so the form stays visible when JavaScript is unavailable. */}
      <div className="flex flex-col gap-8 animate-in duration-300 fade-in slide-in-from-bottom-2 motion-reduce:animate-none">
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            aria-hidden
            className="flex size-14 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground"
          >
            MW
          </div>
          <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </div>
    </PageShell>
  );
}
