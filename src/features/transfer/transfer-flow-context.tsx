"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useReducer,
  useState,
} from "react";

import type { ContactDto } from "@/contracts/v1/dto";
import type { Money } from "@/domain/money/money";
import { randomUUID } from "@/lib/random-uuid";

import {
  createDraft,
  type TransferAction,
  type TransferDraft,
  transferFlowReducer,
} from "./model/transfer-flow";

interface TransferFlowValue {
  readonly draft: TransferDraft;
  readonly dispatch: Dispatch<TransferAction>;
  /** Balance read when the flow was opened; the server re-checks it on confirmation. */
  readonly balance: Money;
  /** Replaces the balance when the server reports that it changed (e.g. spent elsewhere). */
  readonly updateBalance: (balance: Money) => void;
}

const TransferFlowContext = createContext<TransferFlowValue | null>(null);

/** Client state of the transfer flow, scoped to the transfer route only. */
export function TransferFlowProvider({
  balance: initialBalance,
  contacts,
  children,
}: {
  readonly balance: Money;
  readonly contacts: readonly ContactDto[];
  readonly children: ReactNode;
}) {
  const [draft, dispatch] = useReducer(transferFlowReducer, contacts, (initial) =>
    createDraft(initial, randomUUID()),
  );
  const [balance, updateBalance] = useState(initialBalance);

  return (
    <TransferFlowContext.Provider value={{ draft, dispatch, balance, updateBalance }}>
      {children}
    </TransferFlowContext.Provider>
  );
}

export const useTransferFlow = (): TransferFlowValue => {
  const value = useContext(TransferFlowContext);
  if (!value) throw new Error("useTransferFlow must be used within a TransferFlowProvider");
  return value;
};
