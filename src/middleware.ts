import { clerkMiddleware } from "@clerk/nextjs/server";

// Use the default Clerk middleware
export default clerkMiddleware();

export const config = {
  matcher: [
    // Include all routes except Next.js internals and static files
    "/((?!_next|trpc|api-test|test-upload|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Include API routes that need authentication
    "/api/chat/:path*",
  ],
};
