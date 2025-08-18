import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Query,
    Req,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('me')
    getMe(@Req() req: RequestWithUser) {
        return this.userService.findOne(req.user.id);
    }

    @Post('public-key')
    createPublicKey(
        @Req() req: RequestWithUser,
        @Body('publicKey') publicKey: string,
    ) {
        return this.userService.updatePublicKey(req.user.id, publicKey);
    }

    @Get(':userId/public-key')
    getPublicKey(@Param('userId') userId: string) {
        return this.userService.getPublicKeyById(+userId);
    }

    @Get('search')
    searchUsers(
        @Query('username') username: string,
        @Req() req: RequestWithUser,
    ) {
        return this.userService.searchUsername(username, req.user.id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Get('admin/users')
    getAllUsers() {
        return this.userService.findAll();
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Post('admin/users')
    createUser(@Body() createUserDto: CreateUserDto) {
        return this.userService.create(createUserDto);
    }

    @Post()
    create(@Body() createUserDto: CreateUserDto) {
        return this.userService.create(createUserDto);
    }

    @Get()
    findAll() {
        return this.userService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.userService.findOne(+id);
    }
}
