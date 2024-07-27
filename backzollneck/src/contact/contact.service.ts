import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { Contact } from './entities/contact.entity'
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact) private ContactRepository: Repository<Contact>,
  ) {}
  
  create(email: string, subject: string, message: string) {
    if (!email || !subject || !message) {
      throw new HttpException('E-Mail, Passwort und Benutzername sind erforderlich', HttpStatus.BAD_REQUEST);
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
        throw new HttpException('Ungültige E-Mail-Adresse', HttpStatus.BAD_REQUEST);
    }

    const contact = this.ContactRepository.create({
      email,
      subject,
      message
    });

    return this.ContactRepository.save(contact);
  }

  findAll() {
    return `This action returns all contact`;
  }
}
