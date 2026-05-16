import express from 'express';
import cors from 'cors';
import adminRoutes from './routes/adminRoutes';
import sellerRoutes from './routes/sellerRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/admins', adminRoutes);
app.use('/api/sellers', sellerRoutes);

export default app;
