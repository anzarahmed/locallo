import { Sequelize } from 'sequelize-typescript';
import path from 'path';

const sequelize = new Sequelize(process.env.DATABASE_URL as string, {
  dialect: 'postgres',
  models: [path.join(__dirname, '../models')],
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

export default sequelize;
