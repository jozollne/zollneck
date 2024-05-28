import { IsDate, IsEmail, Length } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @Length(8, 100)
  password: string;

  @Length(1, 15)
  username: string;

  @Length(1, 15)
  firstName: string;

  @Length(1, 15)
  lastName: string;

  @IsDate()
  createdAt: Date;

  @Length(2, 4)
  status: string;

  @Length(1, 10)
  role: string;
}
