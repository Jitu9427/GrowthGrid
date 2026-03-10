import { Router } from 'express';
import { createSale, createPurchase, getTransactions, getTransactionSummary, getDailyStats, getTopItems, getItemForecast } from '../controllers/transactionController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/sale', createSale);
router.post('/purchase', createPurchase);
router.get('/summary', getTransactionSummary);
router.get('/stats/daily', getDailyStats);
router.get('/stats/top-items', getTopItems);
router.get('/forecast/:itemId', getItemForecast);
router.get('/', getTransactions);

export default router;
