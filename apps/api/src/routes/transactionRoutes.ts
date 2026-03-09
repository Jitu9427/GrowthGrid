import { Router } from 'express';
import { createSale, createPurchase, getTransactions, getTransactionSummary } from '../controllers/transactionController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/sale', createSale);
router.post('/purchase', createPurchase);
router.get('/summary', getTransactionSummary);
router.get('/', getTransactions);

export default router;
