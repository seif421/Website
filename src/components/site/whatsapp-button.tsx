import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useSiteData } from "@/hooks/use-site-data";
import { useI18n } from "@/lib/i18n";

// Floating WhatsApp chat button. The number comes from Admin > Website content > Contact;
// clearing the number there hides the button.
export function WhatsAppButton() {
  const { contact } = useSiteData();
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [href, setHref] = useState("");
  const digits = (contact.whatsapp ?? "").replace(/\D/g, "");

  useEffect(() => {
    if (!digits) return;
    const onProduct = pathname.startsWith("/product/");
    const text = onProduct
      ? t("Hello Rivvo, I'm interested in this product: {url}", { url: window.location.href.split("?")[0] })
      : t("Hello Rivvo, I have a question");
    setHref(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`);
  }, [digits, pathname, t]);

  if (!digits || !href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("Chat with us on WhatsApp")}
      className="fixed bottom-5 end-5 z-40 grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
    >
      <svg viewBox="0 0 32 32" className="size-7" fill="currentColor" aria-hidden="true">
        <path d="M16.04 3C9.4 3 4 8.4 4 15.03c0 2.12.55 4.18 1.6 6L4 28l7.17-1.88a12 12 0 0 0 4.87.99h.01C22.68 27.1 28 21.7 28 15.07 28 11.86 26.75 8.84 24.48 6.57A11.94 11.94 0 0 0 16.04 3Zm0 21.97h-.01a9.97 9.97 0 0 1-5.08-1.39l-.36-.22-4.25 1.11 1.13-4.14-.24-.38a9.96 9.96 0 0 1-1.52-5.3c0-5.5 4.48-9.98 9.99-9.98 2.67 0 5.18 1.04 7.06 2.93a9.9 9.9 0 0 1 2.92 7.06c0 5.51-4.48 9.98-9.99 9.98Zm5.48-7.47c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.95 1.18-.18.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.89-.8-1.5-1.78-1.67-2.08-.18-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.63-.93-2.24-.24-.58-.49-.5-.68-.51h-.58c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.11 3.22 5.1 4.5.71.31 1.27.5 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.07-.13-.27-.2-.57-.35Z" />
      </svg>
    </a>
  );
}
