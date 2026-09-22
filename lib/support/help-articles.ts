/**
 * Base de ayuda que consulta el agente de soporte.
 *
 * Reglas para editarla:
 *  - Solo describe lo que el producto hace HOY. Si algo aún no existe, dilo
 *    explícitamente ("todavía no está disponible"): el agente repite lo que
 *    lee aquí como si fuera verdad.
 *  - No incluyas precios ni fechas que puedan cambiar.
 */

export type HelpArticle = {
  slug: string;
  title: string;
  tags: string[];
  body: string;
};

export const helpArticles: HelpArticle[] = [
  {
    slug: "personalizar-dashboard",
    title: "Mostrar u ocultar widgets del dashboard",
    tags: ["dashboard", "widgets", "personalizar", "ocultar", "mostrar", "switch"],
    body: [
      "Para elegir qué información ves al entrar a tu negocio:",
      "1. Abre el Dashboard del negocio y pulsa «Personalizar dashboard».",
      "2. Activa o desactiva cada widget con su interruptor.",
      "3. Pulsa «Guardar cambios». Te devuelve al dashboard con la nueva vista.",
      "La configuración es personal: se guarda por usuario y por negocio, así que otro colaborador puede tener una vista distinta.",
      "Si desactivas todos los widgets, el dashboard te lo indica y te ofrece un botón para volver a activarlos.",
      "Si al guardar aparece «No se pudieron guardar los cambios», es un problema del servicio y no de tu configuración: crea un ticket.",
    ].join("\n"),
  },
  {
    slug: "integraciones-disponibles",
    title: "Qué integraciones puedo conectar hoy",
    tags: [
      "integraciones",
      "whatsapp",
      "tiktok",
      "mercado libre",
      "shopify",
      "amazon",
      "conectar",
      "canales",
    ],
    body: [
      "En la sección Integraciones cada canal muestra su estado: Conectado, Pendiente, Error o No conectado.",
      "Hoy se pueden conectar WhatsApp y TikTok Shop. Mercado Libre, Shopify y Amazon aparecen como «Próximamente»: se irán habilitando por etapas y no hay una fecha confirmada.",
      "TikTok Shop: pulsa «Conectar tienda», inicia sesión en TikTok Shop y autoriza a Kodia. Se conectan todas las tiendas que autorices. Puedes conectar varias tiendas, dentro del límite de tu plan, y desconectarlas desde la misma tarjeta. Solo el dueño o un administrador de la cuenta puede conectar o desconectar tiendas.",
      "Si al conectar TikTok Shop aparece que tu plan no permite más tiendas, mejora tu plan en «Plan y créditos». Si aparece que la tienda ya está conectada a otra cuenta de Kodia, una tienda solo puede estar en un negocio a la vez: abre un ticket de integraciones.",
      "Si TikTok Shop aparece con estado «Error», la autorización venció: pulsa «Conectar otra tienda» y vuelve a autorizar la misma tienda para renovarla.",
      "Si tu WhatsApp aparece en «Pendiente» o «Error», o el proceso de conexión se interrumpe, revisa que estés usando una cuenta de WhatsApp Business habilitada para conectarse y vuelve a intentarlo. Si sigue igual, crea un ticket indicando el paso en el que se detiene.",
      "No puedes conectar un canal que aparece como «Próximamente»; para pedir prioridad sobre uno, abre un ticket de tipo solicitud de función.",
    ].join("\n"),
  },
  {
    slug: "pedidos-y-ventas",
    title: "Pedidos y ventas en el dashboard",
    tags: [
      "pedidos",
      "ventas",
      "dashboard",
      "sincronizar",
      "actualizar",
      "tiktok",
      "ticket promedio",
      "no aparecen",
      "cero",
      "moneda",
    ],
    body: [
      "Las tarjetas de Ventas, Pedidos y Ticket promedio, la gráfica de 7 días y Ventas por canal se calculan con los pedidos de tus tiendas de TikTok Shop conectadas.",
      "Los pedidos se traen automáticamente al conectar la tienda (los de los últimos 30 días) y cada vez que pulsas «Sincronizar pedidos» en el dashboard, junto a «Personalizar dashboard». Ese botón muestra cuándo fue la última actualización. La actualización automática periódica todavía no está activa.",
      "Solo cuentan como venta los pedidos pagados: en preparación, enviados o entregados. Los pedidos sin pagar y los cancelados no suman.",
      "«Hoy» usa la zona horaria de tu negocio, así que un pedido de las 11 pm cuenta en el día en que lo hiciste. Los importes se muestran en la moneda de tu negocio; si vendes en otra moneda, se ve aparte porque todavía no se convierten entre monedas.",
      "Si el dashboard muestra ceros: comprueba que la tienda aparezca como «Conectado» en Integraciones y pulsa «Sincronizar pedidos». Si el botón avisa de un error, crea un ticket de integraciones con el mensaje exacto.",
      "Si no aparece el botón «Sincronizar pedidos», es que el negocio aún no tiene ninguna tienda de TikTok Shop conectada.",
    ].join("\n"),
  },
  {
    slug: "planes-y-limite-de-tiendas",
    title: "Planes y límite de tiendas conectadas",
    tags: [
      "plan",
      "planes",
      "suscripcion",
      "limite",
      "tiendas",
      "free",
      "bronce",
      "plata",
      "oro",
      "upgrade",
      "mejorar",
    ],
    body: [
      "Cada cuenta tiene un plan que define cuántas tiendas de marketplace puedes tener conectadas: Free permite 1, Bronce 5, Plata 10 y Oro es ilimitado (sujeto a uso justo).",
      "El límite es por cuenta: cuenta las tiendas conectadas en todos tus negocios juntos. Solo cuentan TikTok Shop, Mercado Libre, Shopify y Amazon; WhatsApp y otros canales de mensajería no cuentan como tienda.",
      "Si intentas conectar una tienda y ya alcanzaste el límite, la conexión se bloquea con el aviso «STORE_LIMIT_REACHED». No se borra ni se desconecta nada de lo que ya tenías.",
      "Puedes ver tu plan actual, cuántas tiendas llevas usadas y el resto de planes en la sección «Plan y créditos» del menú.",
      "Los planes de pago todavía no están disponibles para contratar desde la plataforma: en esa pantalla aparecen como «Próximamente». Si necesitas más tiendas ahora, crea un ticket de facturación explicando cuántas necesitas: requiere revisión del equipo.",
    ].join("\n"),
  },
  {
    slug: "creditos",
    title: "Créditos: qué son y cómo se gastan",
    tags: ["creditos", "saldo", "ia", "chat", "regalo", "bienvenida", "comprar", "vencen"],
    body: [
      "Los créditos se usan para las funciones de IA y chat de Kodia.",
      "Toda cuenta nueva recibe 1,000 créditos de bienvenida, una sola vez. Esos créditos no vencen.",
      "Hay dos tipos: los del plan (se renuevan cada periodo y los sobrantes se pierden al renovar) y los permanentes (bienvenida y compras, no vencen). Al usar créditos se gastan primero los del plan.",
      "Puedes ver tu saldo, y cuánto es del plan y cuánto permanente, en la sección «Plan y créditos» del menú, y también en la etiqueta junto a «Personalizar dashboard» del dashboard.",
      "En esa misma pantalla aparecen los paquetes de créditos, pero la compra y los planes de pago todavía no están disponibles: los botones dicen «Próximamente». Si necesitas créditos ahora, crea un ticket de créditos: requiere revisión del equipo.",
      "El asistente de soporte no consume tus créditos.",
      "Si crees que tu saldo es incorrecto, crea un ticket de créditos: el equipo revisa el historial de movimientos de tu cuenta.",
    ].join("\n"),
  },
  {
    slug: "crear-negocio",
    title: "Crear un negocio nuevo",
    tags: ["negocio", "crear", "nuevo", "cuenta", "tipo de negocio", "primer negocio"],
    body: [
      "En «Mis negocios» pulsa el botón para crear un negocio, escribe su nombre y elige el tipo (restaurante, tienda, e-commerce, servicios, híbrido u otro).",
      "Un mismo usuario puede tener varios negocios dentro de su cuenta.",
      "Si es tu primer negocio, Kodia crea tu cuenta automáticamente junto con él, con el plan Free y tus 1,000 créditos de bienvenida; no tienes que hacer nada más.",
      "Si al crear un negocio aparece un error, anota el mensaje exacto y crea un ticket de cuenta.",
    ].join("\n"),
  },
  {
    slug: "colaboradores-y-roles",
    title: "Colaboradores y roles",
    tags: ["colaboradores", "equipo", "invitar", "roles", "permisos", "miembros", "usuarios"],
    body: [
      "Cada negocio maneja roles (Owner, Admin, Manager, Support, Cashier y Staff) con permisos distintos. Quien crea el negocio es Owner.",
      "Todavía no existe la opción de invitar colaboradores desde la plataforma. Si necesitas agregar a alguien, crea un ticket describiendo a quién y con qué rol: requiere aprobación y trabajo del equipo.",
    ].join("\n"),
  },
  {
    slug: "como-funcionan-los-tickets",
    title: "Cómo funcionan los tickets de soporte",
    tags: ["ticket", "tickets", "soporte", "ayuda", "problema", "reportar"],
    body: [
      "El asistente intenta resolver tu problema primero. Si no puede, o si tu caso requiere revisión o aprobación del equipo (cambios de plan, límites, permisos, errores del servicio), crea un ticket con el resumen y el estado de tu negocio, para que no tengas que repetirlo.",
      "Cada ticket trata un solo tema. Si tienes otro problema distinto, se atiende por separado o se abre otro ticket.",
      "Puedes ver tus tickets y su estado en la parte inferior de la pantalla de Soporte.",
    ].join("\n"),
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
}

/**
 * Búsqueda simple por palabras clave (título y etiquetas pesan más que el
 * cuerpo). Devuelve como máximo `limit` artículos con puntaje > 0.
 */
export function searchHelpArticles(query: string, limit = 3): HelpArticle[] {
  const words = [...new Set(tokenize(query))];

  if (words.length === 0) {
    return [];
  }

  return helpArticles
    .map((article) => {
      const title = normalize(article.title);
      const tags = normalize(article.tags.join(" "));
      const body = normalize(article.body);

      let score = 0;

      for (const word of words) {
        if (title.includes(word)) score += 4;
        if (tags.includes(word)) score += 3;
        if (body.includes(word)) score += 1;
      }

      return { article, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.article);
}
