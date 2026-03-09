import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const scanBill = async (req: AuthRequest, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(req.file.path), {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const response = await axios.post(`${AI_SERVICE_URL}/process-bill`, formData, {
            headers: {
                ...formData.getHeaders(),
            },
        });

        // Clean up temporary file
        fs.unlinkSync(req.file.path);

        res.json(response.data);
    } catch (error: any) {
        // Clean up temporary file on error
        if (req.file) fs.unlinkSync(req.file.path);

        const errorMessage = error.response?.data?.detail || error.message;
        console.error('OCR Proxy Error:', errorMessage);
        res.status(500).json({
            message: 'AI Service Error',
            detail: errorMessage
        });
    }
};
