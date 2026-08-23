import { IsArray, IsBoolean, IsIn, IsOptional, IsString, ArrayNotEmpty, MinLength, MaxLength, IsISO8601 } from 'class-validator';

export class CreateSharedLinkDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  paths: string[];

  @IsOptional()
  @IsIn(['read', 'write'])
  permission?: 'read' | 'write';

  @IsOptional()
  @IsBoolean()
  oneTime?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(200)
  password?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
