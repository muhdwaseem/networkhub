// IndexNow notifications for changes to the public product catalogue.
// The key is public by design, and its matching TXT file lives in /public.
// Never send preview/local URLs or let a search-engine outage break an admin save.
const SITE_ORIGIN = "https://www.networxhub.com";
const INDEXNOW_KEY = "fa6a76ea3c794438af5d214f9c35ba37";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export async function notifyIndexNow(productIds) {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return;
  if (process.env.NODE_ENV !== "production") return;

  const ids = [...new Set(productIds.filter((id) => typeof id === "string" && id.trim()))];
  if (ids.length === 0) return;

  // IndexNow permits up to 10,000 URLs per request. Leave room for future
  // payloads, and bound request time so an outage never blocks the admin UI.
  for (let offset = 0; offset < ids.length; offset += 1000) {
    const urlList = ids.slice(offset, offset + 1000).map(
      (id) => `${SITE_ORIGIN}/products/${encodeURIComponent(id)}`
    );

    try {
      const response = await fetch(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: "www.networxhub.com",
          key: INDEXNOW_KEY,
          keyLocation: `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`,
          urlList,
        }),
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
      });
      if (response.status !== 200 && response.status !== 202) {
        console.warn(`IndexNow submission returned HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn("IndexNow notification failed:", error.message);
    }
  }
}
