import { useEffect, useRef, type ReactNode } from "react";
import { useLanguage, translateStoreText } from "@/lib/i18n";
import { Header } from "./header";
import { Footer } from "./footer";

export function SiteLayout({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);
  const textState = useRef(new WeakMap<Text, { source: string; rendered: string }>());
  const attrState = useRef(new WeakMap<Element, Map<string, { source: string; rendered: string }>>());

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const translate = () => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node as Text;
        const current = text.nodeValue ?? "";
        const previous = textState.current.get(text);
        const source = previous && current === previous.rendered ? previous.source : current;
        const rendered = translateStoreText(source, language);
        if (current !== rendered) text.nodeValue = rendered;
        textState.current.set(text, { source, rendered });
      }

      const attrs = ["placeholder", "aria-label", "title"];
      root.querySelectorAll("*").forEach((element) => {
        let states = attrState.current.get(element);
        if (!states) {
          states = new Map();
          attrState.current.set(element, states);
        }
        for (const attr of attrs) {
          const current = element.getAttribute(attr);
          if (current === null) continue;
          const previous = states.get(attr);
          const source = previous && current === previous.rendered ? previous.source : current;
          const rendered = translateStoreText(source, language);
          if (current !== rendered) element.setAttribute(attr, rendered);
          states.set(attr, { source, rendered });
        }
      });
    };

    translate();
    const observer = new MutationObserver(() => translate());
    observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "aria-label", "title"] });
    return () => observer.disconnect();
  }, [language]);

  return (
    <div ref={rootRef} lang={language} dir={language === "ar" ? "rtl" : "ltr"} className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
