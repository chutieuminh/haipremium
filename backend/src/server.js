import { createServer } from 'node:http';
import app from './app.js';
import { env, sequelize } from './config.js';
import './models.js';

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('Da ket noi MySQL');
    const server = createServer(app);

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${env.port} dang duoc su dung. Hay tat backend dang chay hoac doi PORT trong backend/.env.`);
      } else {
        console.error('Khong the khoi dong backend:', error.message);
      }
      process.exit(1);
    });

    server.listen(env.port, () => {
      console.log(`Hai Premium API: http://localhost:${env.port}/api/v1`);
    });
  } catch (error) {
    console.error('Khong the khoi dong backend:', error.message);
    process.exit(1);
  }
};

start();
