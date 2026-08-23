import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('shared_links')
export class SharedLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 30, nullable: false })
  ownerUsername: string;

  // Absolute, validated filesystem paths (files or folders) included in this share
  @Column({ type: 'text', array: true, nullable: false })
  paths: string[];

  // 'read' = nur ansehen/downloaden, 'write' = zusätzlich hochladen erlaubt (nur bei genau einem Ordner)
  @Column({ type: 'varchar', length: 10, default: 'read' })
  permission: 'read' | 'write';

  // Link wird nach dem ersten erfolgreichen Download ungültig
  @Column({ type: 'boolean', default: false })
  oneTime: boolean;

  @Column({ type: 'boolean', default: false })
  used: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ type: 'int', default: 0 })
  passwordFailCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'boolean', default: false })
  revoked: boolean;

  @Column({ type: 'int', default: 0 })
  accessCount: number;

  @Column({ type: 'int', default: 0 })
  downloadCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastAccessedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
