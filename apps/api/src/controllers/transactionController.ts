import { Request, Response } from 'express';
import pool, { query } from '../db';
import { AuthRequest } from '../middleware/authMiddleware';
import axios from 'axios';

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
            [req.user?.id, 'PURCHASE', total_amount, notes || 'OCR Scan']
        );
        const transactionId = txResult.rows[0].id;

        for (const item of items) {
            let itemId = item.id;
            const cleanName = item.name ? item.name.trim() : 'Unknown Item';

            // 1. Try to find the item ID if not provided
            if (!itemId) {
                const itemLookup = await client.query(
                    'SELECT id FROM items WHERE shop_id = $1 AND (LOWER(name) = LOWER($2) OR normalized_name = LOWER($2))',
                    [req.user?.id, cleanName]
                );

                if (itemLookup.rows.length > 0) {
                    itemId = itemLookup.rows[0].id;
                } else {
                    // 2. AUTO-CREATE: If item doesn't exist, create it!
                    console.log(`Creating new item from scan: ${cleanName}`);
                    const newItem = await client.query(
                        'INSERT INTO items (shop_id, name, normalized_name, purchase_price, selling_price, current_stock) VALUES ($1, $2, $3, $4, $4, 0) RETURNING id',
                        [req.user?.id, cleanName, cleanName.toLowerCase(), item.price]
                    );
                    itemId = newItem.rows[0].id;
                }
            }

            // 3. Add to transaction and update stock
            if (itemId) {
                const qty = Math.round(parseFloat(item.quantity) || 0);
                const price = parseFloat(item.price) || 0;

                await client.query(
                    'INSERT INTO transaction_items (transaction_id, item_id, quantity, price_per_unit, subtotal) VALUES ($1, $2, $3, $4, $5)',
                    [transactionId, itemId, qty, price, qty * price]
                );

                await client.query(
                    'UPDATE items SET current_stock = current_stock + $1 WHERE id = $2 AND shop_id = $3',
                    [qty, itemId, req.user?.id]
                );
                console.log(`Success: Added ${qty} to ${cleanName}`);
            }
        }
        await client.query('COMMIT');
        res.status(201).json({ message: 'Purchase recorded successfully' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Purchase Error:', error.message);
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

export const getDailyStats = async (req: AuthRequest, res: Response) => {
    try {
        const result = await query(
            `SELECT 
                DATE_TRUNC('day', transaction_date) as date,
                SUM(CASE WHEN type = 'SALE' THEN total_amount ELSE 0 END) as sales,
                SUM(CASE WHEN type = 'PURCHASE' THEN total_amount ELSE 0 END) as purchases
            FROM transactions 
            WHERE shop_id = $1 AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY date 
            ORDER BY date ASC`,
            [req.user?.id]
        );
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTopItems = async (req: AuthRequest, res: Response) => {
    try {
        const result = await query(
            `SELECT 
                i.name,
                SUM(ti.quantity) as total_quantity,
                SUM(ti.subtotal) as total_revenue
            FROM transaction_items ti
            JOIN items i ON ti.item_id = i.id
            JOIN transactions t ON ti.transaction_id = t.id
            WHERE t.shop_id = $1 AND t.type = 'SALE'
            GROUP BY i.name
            ORDER BY total_quantity DESC
            LIMIT 5`,
            [req.user?.id]
        );
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
export const getItemForecast = async (req: AuthRequest, res: Response) => {
    const { itemId } = req.params;
    try {
        // 1. Get daily sales quantity for the last 30 days
        const result = await query(
            `SELECT 
                DATE_TRUNC('day', t.transaction_date) as date,
                SUM(ti.quantity) as total_qty
            FROM transaction_items ti
            JOIN transactions t ON ti.transaction_id = t.id
            WHERE t.shop_id = $1 AND ti.item_id = $2 AND t.type = 'SALE'
              AND t.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY date
            ORDER BY date ASC`,
            [req.user?.id, itemId]
        );

        // 2. Prepare history array (pad with zeros for days with no sales)
        const historyMap: Record<string, number> = {};
        result.rows.forEach(row => {
            const dateStr = new Date(row.date).toISOString().split('T')[0];
            historyMap[dateStr] = Number(row.total_qty);
        });

        const history: number[] = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            history.push(historyMap[dateStr] || 0);
        }

        // 3. Call AI Service
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const aiResponse = await axios.post(`${aiServiceUrl}/forecast`, {
            history: history
        });

        res.json(aiResponse.data);
    } catch (error: any) {
        console.error('Forecast Error:', error.message);
        res.status(500).json({ message: error.message });
    }
};
