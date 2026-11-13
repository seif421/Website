import { createIsomorphicFn, createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { LANG_COOKIE, type Lang } from "./index";

function parse(cookie: string | null | undefined): Lang {
  const m = (cookie ?? "").match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=(ar|en)`));
  return m?.[1] === "ar" ? "ar" : "en";
}

const readOnServer = createServerFn({ method: "GET" }).handler(async () =>
  parse(getRequest().headers.get("cookie")),
);

/** The visitor's chosen language: read from the request on the server and from the browser afterwards. */
export const getLang = createIsomorphicFn()
  .server(async (): Promise<Lang> => readOnServer())
  .client(async (): Promise<Lang> => parse(document.cookie));
