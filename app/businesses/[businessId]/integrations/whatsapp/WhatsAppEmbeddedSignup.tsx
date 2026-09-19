"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    FB?: {
      init: (options: {
        appId: string;
        autoLogAppEvents?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;

      login: (
        callback: (response: {
          authResponse?: {
            code?: string;
          };
        }) => void,
        options: {
          config_id: string;
          response_type: string;
          override_default_response_type: boolean;
          extras: {
            version: string;
          };
        },
      ) => void;
    };

    fbAsyncInit?: () => void;
  }
}

const META_APP_ID = "964357796220280";
const META_CONFIG_ID = "1396463661940578";

type WhatsAppEmbeddedSignupProps = {
  businessId: string;
};

export default function WhatsAppEmbeddedSignup({
  businessId,
}: WhatsAppEmbeddedSignupProps) {
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com") {
        return;
      }

      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (data?.type === "WA_EMBEDDED_SIGNUP") {
          console.log("WhatsApp Embedded Signup:", data);
          console.log("Business ID:", businessId);
        }
      } catch {
        // Ignoramos mensajes que no sean JSON del Embedded Signup.
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [businessId]);

  const initializeFacebookSdk = () => {
    if (!window.FB) {
      return;
    }

    window.FB.init({
      appId: META_APP_ID,
      autoLogAppEvents: true,
      xfbml: true,
      version: "v26.0",
    });

    setSdkReady(true);
  };

  const launchWhatsAppSignup = () => {
    if (!window.FB || !sdkReady) {
      console.error("El SDK de Meta todavía no está listo.");
      return;
    }

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;

        if (!code) {
          console.log(
            "El registro de WhatsApp terminó sin devolver un código.",
          );
          return;
        }

        console.log("Código recibido de Meta:", code);
        console.log("Business ID:", businessId);

        // Siguiente paso:
        // enviar este código al backend de Kodia.
      },
      {
        config_id: META_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          version: "v4",
        },
      },
    );
  };

  return (
    <>
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        onLoad={initializeFacebookSdk}
      />

      <button
        type="button"
        onClick={launchWhatsAppSignup}
        disabled={!sdkReady}
        className="mt-6 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sdkReady ? "Continuar con Meta" : "Cargando Meta..."}
      </button>
    </>
  );
}
