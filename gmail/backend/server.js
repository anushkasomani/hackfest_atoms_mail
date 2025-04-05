import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import connectDB from './config/db.js';
import cookieParser from 'cookie-parser';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import userRoutes from './routes/userRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js'; // Import conversation routes

const port = process.env.PORT || 5000;

connectDB();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use((req, res, next) => {
  console.log(`\n--- [SERVER INCOMING REQUEST] ---`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.originalUrl}`);
  console.log(`Headers: ${JSON.stringify(req.headers, null, 2)}`); // Optional: Can be verbose
  // If using body parsing middleware (like express.json), log the body AFTER it runs
  // This log position assumes express.json() ran BEFORE this middleware
  if (req.body && Object.keys(req.body).length > 0) {
     console.log(`Body: ${JSON.stringify(req.body)}`);
  } else {
     console.log(`Body: (empty or not parsed yet)`);
  }
  console.log(`--- End Request Log ---`);
  next(); // Pass control to the next middleware/router
});

app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes); // Use conversation routes

if (process.env.NODE_ENV === 'production') {
  const __dirname = path.resolve();
  app.use(express.static(path.join(__dirname, '/frontend/dist')));

  app.get('*', (req, res) =>
    res.sendFile(path.resolve(__dirname, 'frontend', 'dist', 'index.html'))
  );
} else {
  app.get('/', (req, res) => {
    res.send('API is running....');
  });
}

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => console.log(`Server started on port ${port}`));
