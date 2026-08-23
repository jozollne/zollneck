import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('shared_link_access_logs')
export class SharedLinkAccessLog {
  @PrimaryGeneratedColumn()
  log_id: number;

  @Index()
  @Column({ type: 'uuid', nullable: false })
  sharedLinkId: string;

  // 'created' | 'meta_view' | 'unlock_success' | 'unlock_fail' | 'download' | 'upload' |
  // 'expired_attempt' | 'revoked_attempt' | 'locked_attempt' | 'extended' | 'updated' | 'deleted'
  @Column({ type: 'varchar', length: 30, nullable: false })
  action: string;

  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
