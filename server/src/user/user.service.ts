import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class UserService {
    constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

    async create(createUserDto: CreateUserDto) {
        const user = this.userRepo.create(createUserDto);
        return this.userRepo.save(user);
    }

    async findAll(query?: {
        page?: number;
        limit?: number;
        sort?: any;
        fields?: string[];
    }) {
        const page = query?.page || 1;
        const limit = query?.limit || 10;

        const options: any = {
            skip: (page - 1) * limit,
            take: limit,
        };

        if (query?.sort) {
            options.order = query.sort;
        }

        if (query?.fields) {
            options.select = query.fields;
        }

        return {
            users: await this.userRepo.find(options),
        };
    }

    async findOne(id: number) {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return {
            user,
        };
    }

    async findByEmailWithPassword(email: string) {
        return this.userRepo.findOne({
            where: { email },
            select: [
                'id',
                'email',
                'username',
                'password',
                'active',
                'firstName',
                'lastName',
                'avatar',
                'role',
            ],
        });
    }

    async findByUserNameWithPassword(username: string) {
        return this.userRepo.findOne({
            where: { username },
            select: [
                'id',
                'email',
                'username',
                'password',
                'active',
                'firstName',
                'lastName',
                'avatar',
                'role',
            ],
        });
    }

    async findByEmail(email: string) {
        const user = await this.userRepo.findOne({
            where: { email },
            select: ['id', 'email', 'active'],
        });

        return user;
    }

    async findActiveById(id: number) {
        const user = await this.userRepo.findOne({
            where: { id, active: true },
        });

        return user;
    }

    async findUsersByIds(users: number[]) {
        const existUsers = await this.userRepo.find({
            where: { id: In(users) },
        });
        return existUsers;
    }

    async updatePublicKey(userId: number, publicKey: string) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }
        await this.userRepo.update(userId, { publicKey });
        return { success: true };
    }

    async getPublicKeyById(userId: number) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            select: ['id', 'publicKey'],
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        if (!user.publicKey) {
            throw new NotFoundException(
                `Public key not found for user with ID ${userId}. User needs to complete security setup.`,
            );
        }

        return { publicKey: user.publicKey };
    }

    async searchUsername(username: string, currentUserId: number) {
        const queryBuilder = this.userRepo.createQueryBuilder('user');

        queryBuilder
            .where('user.id != :currentUserId', { currentUserId })
            .andWhere('user.username LIKE :username', {
                username: `%${username}%`,
            })
            .select(['user.id', 'user.username', 'user.avatar']);

        return {
            users: await queryBuilder.getMany(),
        };
    }
}
