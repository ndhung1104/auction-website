// src/app/index.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import routes from '../routes/index.js';
import { notFoundHandler, errorHandler } from '../middlewares/error.js';
import corsConfig from '../config/cors.js';
import passport from '../config/passport.js';

const app = express();

app.use(passport.initialize());
app.use(helmet());
app.use(cors(corsConfig));
app.use(express.json());

app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;