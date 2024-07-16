import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class PullRequest extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, type: "text" })
  url: string;
}
