import { home } from "./home";
import { shop } from "./shop";
import { account } from "./account";
import { pages } from "./pages";
import { more } from "./more";
import { pages2 } from "./pages2";

/** English sentence -> Arabic. Each file belongs to one part of the site. */
export const ar: Record<string, string> = { ...home, ...shop, ...account, ...pages, ...more, ...pages2 };
