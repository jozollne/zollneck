import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { UploadtestService } from './uploadtest.service';
import { UploadtestController } from './uploadtest.controller';
import { JwtStrategy } from '../auth/jwt.strategy'; // Pfad zur JwtStrategy

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Ihr JWT Secret, aus einer Umgebungsvariable
      signOptions: { expiresIn: '10m' }, // Token-Expire-Zeit
    }),
    // Andere benötigte Module können hier ebenfalls importiert werden
  ],
  controllers: [UploadtestController],
  providers: [UploadtestService, JwtStrategy], // Fügen Sie JwtStrategy zu den Providern hinzu
})
export class UploadtestModule {}
