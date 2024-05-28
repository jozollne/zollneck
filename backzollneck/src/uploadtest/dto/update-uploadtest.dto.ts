import { PartialType } from '@nestjs/mapped-types';
import { CreateUploadtestDto } from './create-uploadtest.dto';

export class UpdateUploadtestDto extends PartialType(CreateUploadtestDto) {}
