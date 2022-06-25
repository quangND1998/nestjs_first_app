import { Get, Controller } from '@nestjs/common';
import { TagEntity } from './tag.entity';
import { TagService } from './tag.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('tags')
@Controller('tags')
export class TagController {
    constructor(private readonly tageService: TagService) { }

    @Get()
    async findAll(): Promise<TagEntity[]> {
        return await this.tageService.findAll();
    }




}
