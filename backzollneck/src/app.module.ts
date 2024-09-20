import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from './auth/entities/users.entity';
import { FormatFileModule } from './format-file/fileConvertor.module';
import { YoutubeModule } from './youtube/youtube.module';
import { CloudModule } from './cloud/cloud.module';
import { ContactModule } from './contact/contact.module';
import { Contact } from './contact/entities/contact.entity';
import { ScreenshotModule } from './screenshot/screenshot.module';
import { MinecraftModule } from './minecraft/minecraft.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'jozollne',
      password: process.env.DB_PASSWORD,
      database: 'zollneckdb',
      entities: [Users, Contact],
    }),
    AuthModule,
    FormatFileModule,
    YoutubeModule,
    CloudModule,
    ContactModule,
    ScreenshotModule,
    MinecraftModule,
  ],

})
export class AppModule { }
