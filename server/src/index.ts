import express from 'express';
import { Request, Response } from 'express';
import dataRoutes from './routes/data.routes'; // Import data routes
import db from './services/db.service'; // Import db service to ensure it's initialized

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Tablers Backend is running!');
});

// Register data routes
app.use('/api', dataRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});