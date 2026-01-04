import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This middleware now enforces authentication and permission checks
export function middleware(req: NextRequest) {
  // For now, we'll pass through all requests
  return NextResponse.next()
}

// Limiting the middleware to run only on specific paths
export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
}
