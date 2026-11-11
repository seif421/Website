import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/lib/site-config";
import { imageUrl } from "./format";

// Everything the owner can change from Admin > Website content, plus the category list.
// Every field has a default, so the shop still works if nothing has been saved yet.

export type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  parentId: string | null;
  featured: boolean;
};

export type Section = { show: boolean; title: string };
export type WhyItem = { icon: string; title: string; body: string };
export type Faq = { q: string; a: string };
export type Promo = { title: string; text: string; link: string; image: string };

export type HomeContent = {
  hero: { image: string; link: string; alt: string };
  promos: Promo[];
  sections: {
    categories: Section;
    picks: Section;
    deals: Section;
    bestSellers: Section;
    newArrivals: Section;
    whyUs: Section;
    faq: Section;
  };
  whyUs: WhyItem[];
  faq: Faq[];
};
export type GeneralContent = {
  announcement: string;
  searchPlaceholder: string;
  footerTagline: string;
};
export type AboutContent = {
  title: string;
  intro: string;
  image: string;
  sections: { heading: string; body: string }[];
};
export type ContactContent = {
  title: string;
  intro: string;
  email: string;
  whatsapp: string;
  phone: string;
  address: string;
  hours: string;
};

export type BrandContent = {
  name: string;
  logo: string;
  favicon: string;
  instagram: string;
  facebook: string;
  x: string;
  youtube: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
};

export type SiteData = {
  brand: BrandContent;
  categories: MenuCategory[];
  home: HomeContent;
  general: GeneralContent;
  about: AboutContent;
  contact: ContactContent;
};

export const DEFAULT_HOME: HomeContent = {
  hero: { image: "", link: "/shop", alt: "Rivvo. Shop smarter, live better." },
  promos: [
    { title: "New arrivals", text: "See what just landed in the shop.", link: "/shop?sort=newest", image: "" },
    { title: "Lowest prices", text: "Start with the best value.", link: "/shop?sort=price-asc", image: "" },
  ],
  sections: {
    categories: { show: true, title: "Browse by categories" },
    picks: { show: true, title: "Curated picks for you" },
    deals: { show: true, title: "Deals" },
    bestSellers: { show: true, title: "Best sellers" },
    newArrivals: { show: true, title: "New arrivals" },
    whyUs: { show: true, title: "Why shop with us" },
    faq: { show: true, title: "Questions, answered." },
  },
  whyUs: [
    {
      icon: "truck",
      title: "Cash on delivery",
      body: `Pay when it arrives. Usually ${SITE.deliveryDays} business days.`,
    },
    {
      icon: "rotate",
      title: `${SITE.returnDays}-day returns`,
      body: "Return unused items within the return window.",
    },
    {
      icon: "phone",
      title: "Confirmed by phone",
      body: "We call you to confirm every order before it ships.",
    },
    { icon: "headphones", title: "Real people", body: "Message us and a person replies by email." },
  ],
  faq: [
    {
      q: "How long does delivery take?",
      a: `Orders are processed within ${SITE.processingDays} business days and usually arrive ${SITE.deliveryDays} business days after dispatch. Exact shipping costs are shown at checkout.`,
    },
    {
      q: "What is your return policy?",
      a: `You can return an item within ${SITE.returnDays} days of delivery if it is unused and in its original packaging. See the Refund Policy for the full details.`,
    },
    { q: "How do I pay?", a: "You pay in cash when your order is delivered." },
    { q: "How do I contact you?", a: "Use the contact form. A real person will reply by email." },
  ],
};

export const DEFAULT_GENERAL: GeneralContent = {
  announcement: "",
  searchPlaceholder: "Search products…",
  footerTagline: "Shop online in Egypt and pay when your order arrives.",
};

export const DEFAULT_ABOUT: AboutContent = {
  title: "About Rivvo",
  intro: "Rivvo is an online store in Egypt.",
  image: "",
  sections: [
    {
      heading: "What we do",
      body: "We sell everyday products for your home, your family and yourself, at clear prices, delivered to your door anywhere in Egypt.",
    },
    {
      heading: "How we work",
      body: "We confirm every order by phone, ship it to you, and you pay in cash when it arrives. Delivery costs are shown before you order, and you can read how returns work before you buy.",
    },
    {
      heading: "Talk to us",
      body: "Questions about a product or an order? Use the contact page and a real person will reply.",
    },
  ],
};

export const DEFAULT_CONTACT: ContactContent = {
  title: "Contact us",
  intro: "Questions about a product or an order? Send us a message and we will reply by email.",
  email: SITE.supportEmail,
  whatsapp: SITE.whatsapp,
  phone: SITE.phone,
  address: "",
  hours: "",
};

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const str = (v: unknown, d: string) => (typeof v === "string" ? v : d);
const arr = (v: unknown): Obj[] => (Array.isArray(v) ? v.map(obj) : []);

function section(v: unknown, d: Section): Section {
  const o = obj(v);
  return { show: typeof o.show === "boolean" ? o.show : d.show, title: str(o.title, d.title) };
}

export function mergeHome(raw: unknown): HomeContent {
  const o = obj(raw);
  const h = obj(o.hero);
  const s = obj(o.sections);
  const d = DEFAULT_HOME;
  return {
    hero: {
      image: str(h.image, d.hero.image),
      link: str(h.link, d.hero.link) || "/shop",
      alt: str(h.alt, d.hero.alt),
    },
    promos: Array.isArray(o.promos)
      ? arr(o.promos).map((p, i) => ({
          title: str(p.title, d.promos[i]?.title ?? ""),
          text: str(p.text, d.promos[i]?.text ?? ""),
          link: str(p.link, d.promos[i]?.link ?? "/shop") || "/shop",
          image: str(p.image, d.promos[i]?.image ?? ""),
        }))
      : d.promos,
    sections: {
      categories: section(s.categories, d.sections.categories),
      picks: section(s.picks, d.sections.picks),
      deals: section(s.deals, d.sections.deals),
      bestSellers: section(s.bestSellers, d.sections.bestSellers),
      newArrivals: section(s.newArrivals, d.sections.newArrivals),
      whyUs: section(s.whyUs, d.sections.whyUs),
      faq: section(s.faq, d.sections.faq),
    },
    whyUs: Array.isArray(o.whyUs)
      ? arr(o.whyUs).map((w) => ({ icon: str(w.icon, "star"), title: str(w.title, ""), body: str(w.body, "") }))
      : d.whyUs,
    faq: Array.isArray(o.faq)
      ? arr(o.faq).map((f) => ({ q: str(f.q, ""), a: str(f.a, "") }))
      : d.faq,
  };
}

export function mergeGeneral(raw: unknown): GeneralContent {
  const o = obj(raw);
  return {
    announcement: str(o.announcement, DEFAULT_GENERAL.announcement),
    searchPlaceholder: str(o.searchPlaceholder, DEFAULT_GENERAL.searchPlaceholder),
    footerTagline: str(o.footerTagline, DEFAULT_GENERAL.footerTagline),
  };
}

export function mergeAbout(raw: unknown): AboutContent {
  const o = obj(raw);
  return {
    title: str(o.title, DEFAULT_ABOUT.title),
    intro: str(o.intro, DEFAULT_ABOUT.intro),
    image: str(o.image, DEFAULT_ABOUT.image),
    sections: Array.isArray(o.sections)
      ? arr(o.sections).map((s) => ({ heading: str(s.heading, ""), body: str(s.body, "") }))
      : DEFAULT_ABOUT.sections,
  };
}

export function mergeContact(raw: unknown): ContactContent {
  const o = obj(raw);
  const d = DEFAULT_CONTACT;
  return {
    title: str(o.title, d.title),
    intro: str(o.intro, d.intro),
    email: str(o.email, d.email),
    whatsapp: str(o.whatsapp, d.whatsapp),
    phone: str(o.phone, d.phone),
    address: str(o.address, d.address),
    hours: str(o.hours, d.hours),
  };
}

export const DEFAULT_BRAND: BrandContent = {
  name: SITE.name,
  logo: "",
  favicon: "",
  instagram: SITE.social.instagram,
  facebook: SITE.social.facebook,
  x: SITE.social.x,
  youtube: SITE.social.youtube,
  seoTitle: "Rivvo — Shop online in Egypt, pay on delivery",
  seoDescription:
    "Shop online in Egypt. Pay cash on delivery, clear prices, honest delivery times and easy returns.",
  ogImage: "",
};

export function mergeBrand(raw: unknown): BrandContent {
  const o = obj(raw);
  const d = DEFAULT_BRAND;
  return {
    name: str(o.name, d.name).trim() || d.name,
    logo: str(o.logo, d.logo),
    favicon: str(o.favicon, d.favicon),
    instagram: str(o.instagram, d.instagram),
    facebook: str(o.facebook, d.facebook),
    x: str(o.x, d.x),
    youtube: str(o.youtube, d.youtube),
    seoTitle: str(o.seoTitle, d.seoTitle),
    seoDescription: str(o.seoDescription, d.seoDescription),
    ogImage: str(o.ogImage, d.ogImage),
  };
}

export function defaultSiteData(): SiteData {
  return {
    brand: DEFAULT_BRAND,
    categories: [],
    home: DEFAULT_HOME,
    general: DEFAULT_GENERAL,
    about: DEFAULT_ABOUT,
    contact: DEFAULT_CONTACT,
  };
}

/** Loads the category list and the saved website content. Never throws: the shop falls back to defaults. */
export async function fetchSiteData(): Promise<SiteData> {
  try {
    const [cats, content] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name, slug, description, image_url, parent_id, is_featured, sort_order")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true }),
      // The table is new, so the generated types do not list it yet.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("site_content").select("key, value"),
    ]);
    const byKey: Record<string, unknown> = {};
    for (const r of (content.data ?? []) as { key: string; value: unknown }[]) byKey[r.key] = r.value;
    const categories: MenuCategory[] = ((cats.data ?? []) as unknown as Obj[]).map((c) => ({
      id: String(c.id),
      name: String(c.name ?? ""),
      slug: String(c.slug ?? ""),
      description: typeof c.description === "string" ? c.description : "",
      image: imageUrl(c.image_url),
      parentId: (c.parent_id as string | null) ?? null,
      featured: c.is_featured === true,
    }));
    return {
      brand: mergeBrand(byKey.brand),
      categories,
      home: mergeHome(byKey.home),
      general: mergeGeneral(byKey.general),
      about: mergeAbout(byKey.about),
      contact: mergeContact(byKey.contact),
    };
  } catch {
    return defaultSiteData();
  }
}
