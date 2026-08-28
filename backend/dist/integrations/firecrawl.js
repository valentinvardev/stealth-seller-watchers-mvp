// Firecrawl integration for URL scraping
// API Key: fc-1f1a49f82c3242fba26c235967b6b42a
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || "fc-1f1a49f82c3242fba26c235967b6b42a";
const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v0";
export async function scrapeUrl(url) {
    try {
        const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            },
            body: JSON.stringify({
                url,
                formats: ["markdown", "html"],
                waitFor: 1000,
                timeout: 30000,
            }),
        });
        if (!response.ok) {
            console.error(`Firecrawl error: ${response.status} ${response.statusText}`);
            return {
                success: false,
                error: `HTTP ${response.status}: ${response.statusText}`,
            };
        }
        const data = (await response.json());
        return {
            success: data?.success ?? false,
            data: data?.data,
            error: data?.error,
        };
    }
    catch (error) {
        console.error("Firecrawl scrape error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
export async function extractPriceFromUrl(url) {
    const scraped = await scrapeUrl(url);
    if (!scraped.success || !scraped.data) {
        return { price: null, currency: "USD", rawText: "" };
    }
    const text = scraped.data.markdown || scraped.data.content || "";
    // Try to extract price using common patterns
    // Patterns: $99.99, $99, £99.99, €99.99
    const priceRegex = /[$£€]\s*(\d+(?:\.\d{2})?)/i;
    const match = text.match(priceRegex);
    if (match) {
        const price = parseFloat(match[1]);
        const currency = match[0].charAt(0);
        return {
            price: Math.round(price * 100), // Convert to cents
            currency,
            rawText: text.substring(0, 500),
        };
    }
    return { price: null, currency: "USD", rawText: text.substring(0, 500) };
}
export async function checkStockFromUrl(url) {
    const scraped = await scrapeUrl(url);
    if (!scraped.success || !scraped.data) {
        return { inStock: false, indicators: ["Unable to scrape"] };
    }
    const text = (scraped.data.markdown || scraped.data.content || "").toLowerCase();
    const inStockIndicators = [
        "in stock",
        "add to cart",
        "buy now",
        "available",
        "in stock at",
    ];
    const outOfStockIndicators = [
        "out of stock",
        "sold out",
        "unavailable",
        "currently unavailable",
        "no longer available",
    ];
    const foundInStock = inStockIndicators.filter((ind) => text.includes(ind));
    const foundOutOfStock = outOfStockIndicators.filter((ind) => text.includes(ind));
    const inStock = foundInStock.length > 0 || foundOutOfStock.length === 0;
    return {
        inStock,
        indicators: [...foundInStock, ...foundOutOfStock],
    };
}
//# sourceMappingURL=firecrawl.js.map