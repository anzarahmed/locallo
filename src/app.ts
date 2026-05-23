import express from 'express';
import cors from 'cors';
import path from 'path';
import adminRoutes from './routes/admin/index';
import sellerRoutes from './routes/seller/index';
import customerRoutes from './routes/customer/index';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/admins', adminRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/customers', customerRoutes);

export default app;
