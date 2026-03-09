import { Router } from 'express';
import { scanBill } from '../controllers/ocrController';
import { authMiddleware } from '../middleware/authMiddleware';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.use(authMiddleware);

router.post('/scan', upload.single('bill'), scanBill);

export default router;
