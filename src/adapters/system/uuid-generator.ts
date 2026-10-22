import type { IdGenerator } from "@/ports/system";

export const uuidGenerator: IdGenerator = { next: () => crypto.randomUUID() };
