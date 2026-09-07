import { NextResponse } from "next/server";

export function proxy(request: Request) {
  const authHeader = request.headers.get("authorization");
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic" && encoded) {
      const [reqUser, reqPassword] = atob(encoded).split(":");
      if (reqUser === user && reqPassword === password) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Autenticación requerida", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Cultum admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
