import { Length } from 'class-validator';

export class CreateCommandLogDto {
  @Length(0, 30)
  username: string;

  @Length(0, 100)
  command: string;

  @Length(1, 1000)
  response: string;
}
