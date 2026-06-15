import express from 'express';
import cors from 'cors';
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('Hello from the Express backend!');
});

app.get('/login', (req, res) => {
  res.send('Login');
});

app.get('/register',(req,res) => {
    res.send('Register')
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
