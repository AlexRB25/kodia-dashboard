"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function updateBusiness(formData: FormData) {
  const supabase = await createClient();

  // 1. Obtener usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Obtener datos del formulario
  const businessId = String(formData.get("businessId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  // 3. Validaciones básicas
  if (!businessId) {
    throw new Error("Business ID requerido.");
  }

  if (!name) {
    throw new Error("El nombre del negocio es requerido.");
  }

  // 4. Actualizar negocio
  const { error } = await supabase
    .from("businesses")
    .update({
      name,
    })
    .eq("id", businessId);

  if (error) {
    console.error("Error updating business:", error);
    throw new Error("No se pudo actualizar el negocio.");
  }

  // 5. Actualizar las páginas que muestran este negocio
  revalidatePath(`/businesses/${businessId}`);
  revalidatePath(`/businesses/${businessId}/information`);
  revalidatePath("/businesses");

  // 6. Regresar a Información
  redirect(`/businesses/${businessId}/information`);
}