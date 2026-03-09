import { Request, Response } from 'express';
import pool, { query } from '../db';
import { AuthRequest } from '../middleware/authMiddleware';

export const createSale = async (req: AuthRequest, res: Response) => {
    const { items, total_amount, notes } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const txResult = await client.query(
            'INSERT INTO transactions (shop_id, type, total_amount, notes) VALUES ($1, $2, $3, $4) RETURNING id',
            [req.user?.id, 'SALE', total_amount, notes]
        );
        const transactionId = txResult.rows[0].id;
        for (const item of items) {
            await client.query(
                'INSERT INTO transaction_items (transaction_id, item_id, quantity, price_per_unit, subtotal) VALUES ($1, $2, $3, $4, $5)',
                [transactionId, item.id, item.quantity, item.price_per_unit, item.quantity * item.price_per_unit]
            );
            await client.query(
                'UPDATE items SET current_stock = current_stock - $1 WHERE id = $2 AND shop_id = $3',
                [item.quantity, item.id, req.user?.id]
            );
        }
        await client.query('COMMIT');
        res.status(201).json({ message: 'Sale recorded successfully' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(400).json({ message: error.message });
    } finally { client.release(); }
};

export const createPurchase = async (req: AuthRequest, res: Response) => {
    const { items, total_amount, notes } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const txResult = await client.query(
            'INSERT INTO transactions (shop_id, type, total_amount, notes) VALUES ($1, $2, $3, $4) RETURNING id',
            [req.user?.id, 'PURCHASE', total_amount, notes]
        );
        const transactionId = txResult.rows[0].id;
        for (const item of items) {
            await client.query(
                'INSERT INTO transaction_items (transaction_id, item_id, quantity, price_per_unit, subtotal) VALUES ($1, $2, $3, $4, $5)',
                [transactionId, item.id, item.quantity, item.price_per_unit, item.quantity * item.price_per_unit]
            );
            await client.query(
                'UPDATE items SET current_stock = current_stock + $1 WHERE id = $2 AND shop_id = $3',
                [item.quantity, item.id, req.user?.id]
            );
        }
        await client.query('COMMIT');
        res.status(201).json({ message: 'Purchase recorded successfully' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(400).json({ message: error.message });
    } finally { client.release(); }
};

export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const result = await query(
            'SELECT * FROM transactions WHERE shop_id = $1 ORDER BY transaction_date DESC LIMIT 50',
            [req.user?.id]
        );
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTransactionSummary = async (req: AuthRequest, res: Response) => {
    try {
        const salesResult = await query(
            "SELECT SUM(total_amount) as total FROM transactions WHERE shop_id = $1 AND type = 'SALE' AND transaction_date >= CURRENT_DATE",
            [req.user?.id]
        );
        const purchaseResult = await query(
            "SELECT SUM(total_amount) as total FROM transactions WHERE shop_id = $1 AND type = 'PURCHASE' AND transaction_date >= CURRENT_DATE",
            [req.user?.id]
        );
        const lowStockResult = await query(
            "SELECT COUNT(*) as count FROM items WHERE shop_id = $1 AND current_stock <= min_stock_threshold",
            [req.user?.id]
        );

        res.json({
            todaySales: salesResult.rows[0].total || 0,
            todayPurchases: purchaseResult.rows[0].total || 0,
            lowStockCount: lowStockResult.rows[0].count || 0
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
