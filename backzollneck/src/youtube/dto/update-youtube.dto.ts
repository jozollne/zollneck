import { PartialType } from '@nestjs/mapped-types';
import { CreateYoutubeDto } from './create-youtube.dto';

export class UpdateYoutubeDto extends PartialType(CreateYoutubeDto) {}
