import { openapi } from "@/server/openapi";
export const GET = () =>
  Response.json(openapi, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
