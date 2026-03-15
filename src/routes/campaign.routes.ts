import { Router, Request, Response } from 'express';
// In a real app, this would proxy to data-service
const router = Router();

// GET /campaigns
router.get('/', (req: Request, res: Response) => {
    res.json([
        { id: '1', title: 'Summer Campaign', brand: 'Brand A' }
    ]);
});

// POST /campaigns/:id/bid
router.post('/:id/bid', (req: Request, res: Response) => {
    const { bidAmount, creatorId } = req.body;

    // Respond with the created bid object
    // The transparency middleware should intercept this and add breakdown
    res.json({
        id: 'bid-123',
        campaignId: req.params.id,
        creatorId,
        bidAmount: Number(bidAmount),
        status: 'PENDING'
    });
});

export default router;
