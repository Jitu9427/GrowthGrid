import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { z } from 'zod';

const registerSchema = z.object({
    owner_name: z.string().min(2),
    shop_name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
});

export const register = async (req: Request, res: Response) => {
    try {
        const validatedData = registerSchema.parse(req.body);
        const { owner_name, shop_name, email, password } = validatedData;

        // Check if user exists
        const existingUser = await query('SELECT * FROM shops WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await query(
            'INSERT INTO shops (owner_name, shop_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, owner_name, shop_name, email',
            [owner_name, shop_name, email, hashedPassword]
        );

        const user = result.rows[0];
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'supersecretkey',
            { expiresIn: '24h' }
        );

        res.status(201).json({ user, token });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const result = await query('SELECT * FROM shops WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'supersecretkey',
            { expiresIn: '24h' }
        );

        res.json({
            user: {
                id: user.id,
                owner_name: user.owner_name,
                shop_name: user.shop_name,
                email: user.email,
            },
            token
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
