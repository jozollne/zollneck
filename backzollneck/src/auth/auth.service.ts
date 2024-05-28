import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Users } from './entities/users.entity';
import { JwtService } from '@nestjs/jwt';
import { HttpException, HttpStatus } from '@nestjs/common';


@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Users) private usersRepository: Repository<Users>,
    private jwtService: JwtService, 
  ) {}

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  async create(email: string, password: string, username: string, firstName: string, lastName: string): Promise<Users> {
    if (!email || !password || !username) {
      throw new HttpException('E-Mail, Passwort und Benutzername sind erforderlich', HttpStatus.BAD_REQUEST);
    }

    const existingEmail = await this.usersRepository.findOne({ where: { email } });
    if (existingEmail) {
      throw new HttpException('Ein Benutzer mit dieser E-Mail-Adresse existiert bereits', HttpStatus.CONFLICT);
    }
  
    const existingUsername = await this.usersRepository.findOne({ where: { username } });
    if (existingUsername) {
      throw new HttpException('Ein Benutzer mit diesem Benutzernamen existiert bereits', HttpStatus.CONFLICT);
    }    
    
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
        throw new HttpException('Ungültige E-Mail-Adresse', HttpStatus.BAD_REQUEST);
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
        throw new HttpException('Der Benutzername darf nur Buchstaben, Zahlen und Unterstriche enthalten', HttpStatus.BAD_REQUEST);
    }

    const hashedPassword = await this.hashPassword(password);

    if (firstName == '') {
      firstName = null;
    }
    if (lastName == '') {
      lastName = null;
    }
    const user = this.usersRepository.create({
      email, 
      password: hashedPassword, 
      username,
      firstName, 
      lastName,
      role: 'user',
      status: 'down',
      createdAt: new Date()
    });
  
    return this.usersRepository.save(user);
  }
  

  async login(usernameOrEmail: string, plainTextPassword: string): Promise<{ token: string, username: string }> {
    if (!usernameOrEmail || !plainTextPassword) {
      throw new HttpException('E-Mail/Benutzername und Passwort sind erforderlich', HttpStatus.BAD_REQUEST);
    }
    let user;
    if(usernameOrEmail.includes('@')) {
      user = await this.usersRepository.findOne({ where: { email: usernameOrEmail } });
    } else {
      user = await this.usersRepository.findOne({ where: { username: usernameOrEmail } });
    }
  
    if (!user) {
      throw new HttpException('Benutzer nicht gefunden', HttpStatus.NOT_FOUND);
    }
    if(user.status != "up") {
      throw new HttpException('Benutzer noch nicht aktiviert', HttpStatus.UNAUTHORIZED);
    }
    if (!await bcrypt.compare(plainTextPassword, user.password)) {
      throw new HttpException('Ungültiges Passwort', HttpStatus.UNAUTHORIZED);
    }
  
    const payload = { email: user.email, sub: user.user_id };
    const token = this.jwtService.sign(payload);
  
    return { token, username: user.username };
  }  

  async secret() {
    return "10ner Paysave Code: \"0256 4206 2544 4945\""
  }
}