import { NextRequest, NextResponse } from "next/server";

/**
 * Efface vraiment la session du navigateur.
 * La déconnexion côté page ne supprime pas toujours l'ancien cookie,
 * et le site renvoie alors vers l'espace client.
 */
export function GET(request: NextRequest) {
  const login = new URL("/login", request.url);
  login.searchParams.set("reset", "1");
  const response = NextResponse.redirect(login);

  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.startsWith("sb-")) continue;
    response.cookies.set(cookie.name, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
      secure: true,
    });
  }

  return response;
}
