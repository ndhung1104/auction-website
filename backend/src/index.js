import 'dotenv/config';
import app from './app/index.js';

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));