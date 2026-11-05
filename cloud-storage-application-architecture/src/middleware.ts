import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.APP_SECRET || "sahaab-dev-secret-change-me-in-production");
const ACCESS_COOKIE = "sa_access";
const REFRESH_COOKIE = "sa_refresh";

/** حماية واجهة التطبيق /app — التحقق الفعلي يتم في كل Route API أيضاً */
export async function middleware(req: NextRequest) {
  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  if (access) {
    try {
      await jwtVerify(access, SECRET);
      return NextResponse.next();
    } catch {
      /* منتهي — سنحاول التجديد عبر /api/auth/me */
    }
  }
  if (refresh) return NextResponse.next();

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/app/:path*"],
};
