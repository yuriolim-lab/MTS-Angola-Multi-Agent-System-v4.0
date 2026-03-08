import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        // Initialize database tables here
        try {
            // Your database initialization logic
            res.status(200).json({ message: 'Database tables initialized successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to initialize database tables' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}