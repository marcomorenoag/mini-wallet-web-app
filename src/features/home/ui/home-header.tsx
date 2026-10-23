import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

import { SubmitButton } from "@/components/feedback/submit-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { logoutAction } from "../actions";

/** Top bar of Home: greeting, theme toggle and logout (a plain form, so it works without JS). */
export function HomeHeader({ userName }: { readonly userName: string }) {
  const t = useTranslations("home");
  const firstName = userName.split(" ")[0] ?? userName;

  return (
    <>
      <Avatar aria-hidden>
        <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
          {firstName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <h1 className="flex-1 truncate font-heading text-lg font-semibold">
        {t("greeting", { name: firstName })}
      </h1>
      <ThemeToggle />
      <form action={logoutAction}>
        <SubmitButton variant="ghost" size="sm" icon={<LogOut aria-hidden />}>
          {t("logout")}
        </SubmitButton>
      </form>
    </>
  );
}
