import { ArticleEntity } from "src/article/article.entity";

export class UserRO {
    id: number;
    username: string;
    created: Date;
    token?: string;
    articles?: ArticleEntity[];

}