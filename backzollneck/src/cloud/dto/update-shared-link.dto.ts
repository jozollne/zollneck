import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MinLength, MaxLength, IsISO8601 } from 'class-validator';

export class UpdateSharedLinkDto {
  @IsOptional()
  @IsIn(['read', 'write'])
  permission?: 'read' | 'write';

  @IsOptional()
  @IsBoolean()
  oneTime?: boolean;

  // null entfernt den Passwortschutz, string setzt/ändert ihn, undefined lässt ihn unverändert
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(200)
  password?: string | null;

  // null entfernt das Ablaufdatum (Link läuft nie ab)
  @IsOptional()
  @IsISO8601()
  expiresAt?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addPaths?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  removePaths?: string[];

  @IsOptional()
  @IsBoolean()
  revoked?: boolean;
}
