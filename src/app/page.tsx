import { redirect } from "next/navigation";

/** The root is routed by the proxy; this redirect is a fallback when the proxy is bypassed. */
export default function RootPage() {
  redirect("/login");
}
