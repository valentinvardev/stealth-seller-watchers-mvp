export type FirecrawlScrapedData = {
    success: boolean;
    data?: {
        title?: string;
        description?: string;
        content?: string;
        metadata?: {
            image?: string;
            ogImage?: string;
            price?: string;
        };
        markdown?: string;
        html?: string;
    };
    error?: string;
};
export declare function scrapeUrl(url: string): Promise<FirecrawlScrapedData>;
export declare function extractPriceFromUrl(url: string): Promise<{
    price: number | null;
    currency: string;
    rawText: string;
}>;
export declare function checkStockFromUrl(url: string): Promise<{
    inStock: boolean;
    indicators: string[];
}>;
//# sourceMappingURL=firecrawl.d.ts.map