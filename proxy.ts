// Next.js 16 renamed the middleware.js convention to proxy.js (same runtime
// behavior, new file/export name). See node_modules/next/dist/docs/.../proxy.md.
export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: ["/((?!api|login|_next/static|_next/image|favicon.ico).*)"],
};
