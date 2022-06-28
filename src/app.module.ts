import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { ArticleModule } from './article/article.module';
import { ProfileModule } from './profile/profile.module';
import { TagModule } from './tag/tag.module';
@Module({
  imports: [TypeOrmModule.forRoot(
    {
      "type": "mysql",
      "host": "localhost",
      "port": 3306,
      "username": "root",
      "password": "",
      "database": "nestjsrealworld",
      "entities": ["dist/**/*.entity{.ts,.js}", "./src/**/*.enity.ts"],
      "synchronize": true,
      "logging": true
    }
  ), UserModule, ArticleModule, ProfileModule,
    TagModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
