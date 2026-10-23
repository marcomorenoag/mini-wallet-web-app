import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

export function ContactAvatar({ name }: { readonly name: string }) {
  return (
    <Avatar aria-hidden className="size-10">
      <AvatarFallback className="bg-secondary text-sm font-semibold text-secondary-foreground">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
