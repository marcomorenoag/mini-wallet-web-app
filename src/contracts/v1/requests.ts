import type { MoneyDto } from "./dto";

/*
 * v1 request bodies. They are validated on the server by the domain schemas (single source of
 * truth); these types describe the wire format for clients.
 */

export interface LoginRequest {
  readonly identifier: string;
}

export interface CreateContactRequest {
  readonly name: string;
  readonly phone: string;
  readonly isFavorite?: boolean;
}

/** Sent together with an `Idempotency-Key` header (UUID), reused on every retry. */
export interface CreateTransferRequest {
  readonly amount: MoneyDto;
  readonly recipientId: string;
}

export const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";
export const API_V1_BASE_PATH = "/api/v1";
