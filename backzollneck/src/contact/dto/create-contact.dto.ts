import { IsEmail, Length } from 'class-validator';

export class CreateContactDto {
  @IsEmail()
  email: string;

  @Length(1, 100)
  subject: string;

  @Length(1, 5000)
  message: string;
}
