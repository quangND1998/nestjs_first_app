import { UserEntity } from 'src/user/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { ArticleEntity } from './article.entity';

@Entity()
export class Comment {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    body: string;

    @ManyToOne(type => ArticleEntity, article => article.comments)
    article: ArticleEntity;

    @ManyToOne(() => UserEntity, user => user.comments)
    user: UserEntity;


}