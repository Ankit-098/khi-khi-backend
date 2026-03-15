import { Request, Response, NextFunction } from 'express';

// Define the split rates
const AGENCY_COMMISSION_RATE = 0.10; // 10%
const CREATOR_RATE = 0.90; // 90%

export const transparencyMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function (body: any): Response {
        // Helper to process a single item
        const enrichItem = (item: any) => {
            if (item && typeof item === 'object' && 'bidAmount' in item) {
                const bidAmount = Number(item.bidAmount);
                if (!isNaN(bidAmount)) {
                    return {
                        ...item,
                        transparency: {
                            totalBid: bidAmount,
                            agencyFee: Math.round(bidAmount * AGENCY_COMMISSION_RATE * 100) / 100,
                            creatorNet: Math.round(bidAmount * CREATOR_RATE * 100) / 100,
                            split: `Agency: ${AGENCY_COMMISSION_RATE * 100}%, Creator: ${CREATOR_RATE * 100}%`
                        }
                    };
                }
            }
            return item;
        };

        // Handle array or single object
        let enrichedBody = body;
        if (Array.isArray(body)) {
            enrichedBody = body.map(enrichItem);
        } else {
            enrichedBody = enrichItem(body);
        }

        // Call the original json method with enriched data
        return originalJson.call(this, enrichedBody);
    };

    next();
};
