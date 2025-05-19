export default async (request, context) => {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const lowercasePath = pathname.toLowerCase();
  
    // Skip lowercase enforcement for static assets
    const isStaticAsset = pathname.match(/\.(css|js|mjs|ico|png|jpe?g|webp|svg|woff2?|ttf|eot)$/i)
      || pathname.startsWith("/_astro/");
  
    if (!isStaticAsset && pathname !== lowercasePath) {
      url.pathname = lowercasePath;
      return Response.redirect(url.toString(), 301); // Permanent redirect
    }
  
    return context.next();
  };
  
  export const config = {
    path: "/*", // Apply to all paths
  };
  