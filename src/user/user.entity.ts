import { AfterInsert, BeforeInsert, Column, CreateDateColumn, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { IsEmail } from 'class-validator';
import * as argon2 from 'argon2'
import { ArticleEntity } from '../article/article.entity';
import { ArticleRO } from "src/article/article.interface";
import { UserRO } from "./user.dto";
import { Comment } from "src/article/comment.entity";

@Entity('user')
export class UserEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    username: string;

    @Column()
    @IsEmail()
    email: string;

    @Column({ default: '' })
    bio: string;

    @Column({ default: '' })
    image: string;

    @Column()
    password: string;

    @BeforeInsert()
    async hashPassword() {
        this.password = await argon2.hash(this.password);
    }
    @CreateDateColumn() created: Date;

    toResponseObject(): UserRO {
        const { id, username, created } = this;
        const responseObject: any = { id, username, created };

        if (this.articles) {
            responseObject.articles = this.articles
        }
        return responseObject;
    }

    @ManyToMany(() => ArticleEntity, article => article.users)
    @JoinTable()
    favorites: ArticleEntity[];

    @OneToMany(type => ArticleEntity, article => article.author)
    articles: ArticleEntity[];

    @OneToMany(type => Comment, comment => comment.user)
    comments: Comment[];
}
