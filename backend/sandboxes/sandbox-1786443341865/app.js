import express from 'express';
import loginRouter from './routes/login';

const app = express();
const port = 3000;

app.use('/login', loginRouter);

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});