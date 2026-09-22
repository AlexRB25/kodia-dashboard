import {
  getAccountAdminContext,
  type AccountContext,
  type AccountContextResult,
} from "@/lib/account/context";

export type BillingContext = AccountContext;
export type BillingContextResult = AccountContextResult;

/** Quién puede pagar: el dueño o un administrador de la CUENTA (la suscripción es de la cuenta). */
export function getBillingContext(businessId: unknown): Promise<BillingContextResult> {
  return getAccountAdminContext(businessId, {
    unavailable: "El pago todavía no está disponible.",
    denied: "Solo el dueño o un administrador de la cuenta puede gestionar pagos.",
  });
}
