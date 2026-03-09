import { Request, Response } from 'express';
import { query } from '../db';
import { AuthRequest } from '../middleware/authMiddleware';

export const getItems = async (req: AuthRequest, res: Response) => {
    try {
        const result = await query('SELECT * FROM items WHERE shop_id = $1', [req.user?.id]);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createItem = async (req: AuthRequest, res: Response) => {
    const { category_id, name, barcode, current_stock, purchase_price, selling_price, unit } = req.body;
    try {
        const result = await query(
            `INSERT INTO items 
       (shop_id, category_id, name, barcode, current_stock, purchase_price, selling_price, unit) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
            [req.user?.id, category_id, name, barcode, current_stock, purchase_price, selling_price, unit]
        );
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const updateItem = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { category_id, name, barcode, current_stock, purchase_price, selling_price, unit } = req.body;
    try {
        const result = await query(
            `UPDATE items SET 
       category_id = $1, name = $2, barcode = $3, current_stock = $4, 
       purchase_price = $5, selling_price = $6, unit = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND shop_id = $9
       RETURNING *`,
            [category_id, name, barcode, current_stock, purchase_price, selling_price, unit, id, req.user?.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Item not found' });
        res.json(result.rows[0]);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteItem = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        const result = await query('DELETE FROM items WHERE id = $1 AND shop_id = $2 RETURNING *', [id, req.user?.id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Item not found' });
        res.json({ message: 'Item deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
