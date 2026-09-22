"use client";

import { useFormStatus } from "react-dom";

import LoadingOverlay from "./LoadingOverlay";

/**
 * Colócalo dentro de un <form action={serverAction}>: muestra el overlay
 * mientras la acción del servidor se está ejecutando.
 */
export default function FormPendingOverlay() {
  const { pending } = useFormStatus();

  return pending ? <LoadingOverlay /> : null;
}
