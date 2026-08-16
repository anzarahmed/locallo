import 'reflect-metadata';
import 'dotenv/config';
import app from './app';
import sequelize from './config/database';
import { startOfferNotificationCron } from './jobs/offerNotificationJob';

const PORT = process.env.PORT ?? 3000;

async function bootstrap() {
  await sequelize.authenticate();
  console.log('Database connected');

  startOfferNotificationCron();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

bootstrap().catch(console.error);
