import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getRepository, DeleteResult } from 'typeorm';
import { UserEntity } from 'src/user/user.entity';
import { ArticleEntity } from './article.entity';
import { Comment } from './comment.entity';
import { FollowsEntity } from 'src/profile/profile.entity';
import { CreateArticleDto } from './dto';

import { ArticleRO, ArticlesRO, CommentsRO } from './article.interface';
const slug = require('slug')
@Injectable()
export class ArticleService {
    constructor(
        @InjectRepository(ArticleEntity)
        private readonly articleRepository: Repository<ArticleEntity>,
        @InjectRepository(Comment)
        private readonly commentRepository: Repository<Comment>,
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        @InjectRepository(FollowsEntity)
        private readonly followsRepository: Repository<FollowsEntity>
    ) { }
    private toResponseObject(article: ArticleEntity) {
        const responseObject: any = article;
        if (article.author) {
            responseObject.author = article.author.toResponseObject();
        }
        return responseObject;
    }
    private commentResponseObject(comment: Comment) {
        const responseObject: any = comment;
        if (comment.user) {
            responseObject.user = comment.user.toResponseObject();
        }
        return responseObject;
    }
    private ensureOwnership(article: ArticleEntity, userId: number) {
        if (article.author.id !== userId) {
            throw new HttpException('Incorrect user', HttpStatus.UNAUTHORIZED)
        }

    }


    async findAll(query): Promise<ArticlesRO> {
        const qb = await this.articleRepository
            .createQueryBuilder('article')
            .leftJoinAndSelect('article.author', 'author')
            .leftJoinAndSelect('article.comments', 'comment')
            .leftJoinAndSelect('comment.user', 'user')
        if ('tag' in query) {
            qb.andWhere("article.tagList LIKE :tag", { tag: `%${query.tag}%` });
        }

        if ('author' in query) {
            const author = await this.userRepository.findOneBy({ username: query.author });
            qb.andWhere("article.authorId = :id", { id: author.id });
        }

        if ('favorited' in query) {
            const author = await this.userRepository.findOneBy({ username: query.favorited });
            const ids = author.favorites.map(el => el.id);
            qb.andWhere("article.authorId IN (:ids)", { ids });
        }

        qb.orderBy('article.created', 'DESC');

        const articlesCount = await qb.getCount();

        if ('limit' in query) {
            qb.limit(query.limit);
        }

        if ('offset' in query) {
            qb.offset(query.offset);
        }

        const articles = await qb.getMany();
        const new_articles = articles.map(article => this.toResponseObject(article));

        return { articles, articlesCount };
    }
    async findFeed(userId: number, query): Promise<ArticlesRO> {
        const _follows = await this.followsRepository.find({ where: { followerId: userId } });

        if (!(Array.isArray(_follows) && _follows.length > 0)) {
            return { articles: [], articlesCount: 0 };
        }

        const ids = _follows.map(el => el.followingId);

        const qb = await this.articleRepository
            .createQueryBuilder('article')
            .where('article.authorId IN (:ids)', { ids });

        qb.orderBy('article.created', 'DESC');

        const articlesCount = await qb.getCount();

        if ('limit' in query) {
            qb.limit(query.limit);
        }

        if ('offset' in query) {
            qb.offset(query.offset);
        }

        const articles = await qb.getMany();

        return { articles, articlesCount };
    }
    async findOne(where): Promise<ArticleRO> {
        const article = await this.articleRepository.findOneBy(where);
        return { article };
    }

    async addComment(id: number, slug: string, commentData): Promise<ArticleRO> {
        let article = await this.articleRepository.findOne({ where: { slug }, relations: ['comments.user'] });
        const author = await this.userRepository.findOne({ where: { id: id }, relations: ['comments'] });
        if (!article) {
            throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
        }
        const user = await this.userRepository.findOneBy({ id });
        const comment = new Comment();
        comment.body = commentData.body;
        article.comments.push(comment);
        await this.commentRepository.save(comment);
        article = await this.articleRepository.save(article);
        author.comments.push(comment);
        await this.userRepository.save(author);

        return { article }
    }

    async deleteComment(slug: string, id: number): Promise<ArticleRO> {
        let article = await this.articleRepository.findOneBy({ slug });

        const comment = await this.commentRepository.findOneBy({ id });
        const deleteIndex = article.comments.findIndex(_comment => _comment.id === comment.id);

        if (deleteIndex >= 0) {
            const deleteComments = article.comments.splice(deleteIndex, 1);
            await this.commentRepository.delete(deleteComments[0].id);
            article = await this.articleRepository.save(article);
            return { article };
        } else {
            return { article };
        }

    }

    async favorite(id: number, slug: string): Promise<ArticleRO> {
        let article = await this.articleRepository.findOne({ where: { slug } });
        if (!article) {
            throw new HttpException('Not Found Article', HttpStatus.NOT_FOUND);
        }

        const user = await this.userRepository.findOne({ where: { id }, relations: ['favorites'] });
        const isNewFavorite = user.favorites.findIndex(_article => _article.id === article.id) < 0;
        if (isNewFavorite) {
            user.favorites.push(article);
            article.favoriteCount++;

            await this.userRepository.save(user);
            article = await this.articleRepository.save(article);
        }


        return { article };
    }

    async unFavorite(id: number, slug: string): Promise<ArticleRO> {
        let article = await this.articleRepository.findOne({ where: { slug } });
        const user = await this.userRepository.findOne({ where: { id }, relations: ['favorites'] });

        if (!article) {
            throw new HttpException('Not Found Article', HttpStatus.NOT_FOUND);
        }
        const deleteIndex = user.favorites.findIndex(_article => _article.id === article.id);

        if (deleteIndex >= 0) {

            user.favorites.splice(deleteIndex, 1);
            article.favoriteCount--;

            await this.userRepository.save(user);
            article = await this.articleRepository.save(article);
        }

        return { article };
    }

    async findComments(slug: string) {
        const article = await this.articleRepository.findOne({ where: { slug }, relations: ['comments.user'] });
        const new_comment = article.comments.map(comment => this.commentResponseObject(comment));
        return { comments: new_comment };
    }

    async create(userId: number, articleData: CreateArticleDto): Promise<ArticleEntity> {

        let article = new ArticleEntity();
        article.title = articleData.title;
        article.description = articleData.description;
        article.body = articleData.body;
        article.slug = this.slugify(articleData.title);
        article.tagList = articleData.tagList || [];
        article.comments = [];

        const newArticle = await this.articleRepository.save(article);

        const author = await this.userRepository.findOne({ where: { id: userId }, relations: ['articles'] });
        author.articles.push(article);

        await this.userRepository.save(author);

        return newArticle;

    }

    async update(userId:number ,slug: string, articleData: any): Promise<ArticleRO> {
        let toUpdate = await this.articleRepository.findOne({ where: { slug }, relations: ['author'] });
        if (!toUpdate) {
            throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
        }
        this.ensureOwnership(toUpdate, userId);
        let updated = Object.assign(toUpdate, articleData);
        const article = await this.articleRepository.save(updated);
        return { article };
    }

    async delete(userId: number, slug: string): Promise<DeleteResult> {
        let article = await this.articleRepository.findOne({ where: { slug }, relations: ['author'] });
        if (!article) {
            throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
        }
        this.ensureOwnership(article, userId);
        return await this.articleRepository.delete({ slug: slug });
    }

    slugify(title: string) {
        return slug(title, { lower: true }) + '-' + (Math.random() * Math.pow(36, 6) | 0).toString(36)
    }

}
