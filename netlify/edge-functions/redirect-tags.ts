export default async (request: Request) => {
    const url = new URL(request.url);
    if (url.pathname === "/tags" && url.searchParams.has("tags")) {
        // Decode the 'tags' parameter to handle '+' as spaces
        const decodedTags = decodeURIComponent(url.searchParams.get("tags"));
        // Replace spaces with hyphens
        const updatedTags2 = decodedTags.replace(/\s+/g, '-');
        // Redirect to the new URL
        return Response.redirect(`${url.origin}/tag/${updatedTags2}`, 301);      

    }
    return fetch(request);
  };
  

