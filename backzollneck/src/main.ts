import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Request, Response, json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.set('trust proxy', 1);


  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));
  app.use(helmet());
  app.use(rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 Stunden ist ein Login gültig
    max: 500, // Limit auf 500 Anfragen pro IP
  }));

  app.use((req: Request, res: Response, next) => {
    const now = new Date().toISOString();
    res.on('finish', () => {
      console.log("------------------------------")
      console.log(`[${now}] Anfrage von IP: ${req.ip} - Methode: ${req.method} - URL: ${req.originalUrl} - Status: ${res.statusCode} - User-Agent: ${req.get('User-Agent')}`);
      console.log("------------------------------")
    });
    next();
  });


  app.setGlobalPrefix('api');
  app.enableCors({
    origin: ['https://zollneck.de', 'http://85.215.77.161:5173', 'http://85.215.77.161:5174'],
    methods: 'GET,POST,DELETE,PUT,PATCH,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
    exposedHeaders: 'Content-Disposition',
  });


  await app.listen(53790);
}
bootstrap();