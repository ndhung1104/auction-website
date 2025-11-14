// src/app/index.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import routes from '../routes/index.js';
import { notFoundHandler, errorHandler } from '../middlewares/error.js';
import corsConfig from '../config/cors.js';
import passport from '../config/passport.js';

const app = express();
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(passport.initialize());
app.use(helmet());
app.use(cors(corsConfig));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
