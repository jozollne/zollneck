import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Request, Response, json, urlencoded } from 'express';
import { Reader } from '@maxmind/geoip2-node';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.set('trust proxy', 1);

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));
  app.use(helmet());
  app.use(rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 500,
  }));

  const reader = await Reader.open('/opt/zollneck/backzollneck/GeoLite2-City.mmdb');

  app.use((req: Request, res: Response, next) => {
    const now = new Date().toISOString();
    res.on('finish', async () => {
      let ip = req.ip;
      if (ip.startsWith('::ffff:')) {
        ip = ip.replace('::ffff:', '');
      }

      let locationInfo = 'Standort nicht ermittelbar';
      try {
        const cityData = await reader.city(ip);
        const city = cityData.city?.names?.de || cityData.city?.names?.en || 'Unbekannt';
        const country = cityData.country?.isoCode || 'Unbekannt';
        locationInfo = `${city}, ${country}`;
      } catch (error) {
        console.error(`GeoIP-Abfrage fehlgeschlagen für IP ${ip}: ${error}`);
      }

      console.log("------------------------------");
      console.log(`[${now}] Anfrage von IP: ${ip} (${locationInfo}) - Methode: ${req.method} - URL: ${req.originalUrl} - Status: ${res.statusCode} - User-Agent: ${req.get('User-Agent')}`);
      console.log("------------------------------");
    });
    next();
  });

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: ['https://zollneck.de', 'http://85.215.77.161:5173', 'http://85.215.77.161:5174'],
    methods: 'GET,POST,DELETE,PUT,PATCH,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,dir',
    exposedHeaders: 'Content-Disposition',
  });

  await app.listen(53790);
}
bootstrap();
