import { Request, Response } from 'express';
import { query } from '../db';
import { AuthRequest } from '../middleware/authMiddleware';

export const getCategories = async (req: AuthRequest, res: Response) => {
    try {
        const result = await query('SELECT * FROM categories WHERE shop_id = $1', [req.user?.id]);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
    const { name, description } = req.body;
    try {
        const result = await query(
            'INSERT INTO categories (shop_id, name, description) VALUES ($1, $2, $3) RETURNING *',
            [req.user?.id, name, description]
        );
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const updateCategory = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, description } = req.body;
    try {
        const result = await query(
            'UPDATE categories SET name = $1, description = $2 WHERE id = $3 AND shop_id = $4 RETURNING *',
            [name, description, id, req.user?.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Category not found' });
        res.json(result.rows[0]);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        const result = await query('DELETE FROM categories WHERE id = $1 AND shop_id = $2 RETURNING *', [id, req.user?.id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Category not found' });
        res.json({ message: 'Category deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
