import { createApp } from './app.ts';

const PORT = process.env['PORT'] || 3000;
const app = await createApp();

app.get('/', (_, res) => {
  res.send('Hello from API!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
