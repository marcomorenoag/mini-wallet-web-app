import "server-only";

import type { NextRequest } from "next/server";

import { err, ok, type Result } from "@/domain/shared/result";

/** Parses the JSON body; malformed JSON is reported as BAD_REQUEST by the caller. */
export const readJson = async (request: NextRequest): Promise<Result<unknown, "BAD_REQUEST">> => {
  try {
    return ok(await request.json());
  } catch {
    return err("BAD_REQUEST");
  }
};
