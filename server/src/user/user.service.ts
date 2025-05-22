import { Injectable } from '@nestjs/common';
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
            throw new Error(`User with ID ${id} not found`);
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
        await this.userRepo.update(userId, { publicKey });
        return { success: true };
    }

    async getPublicKeyById(userId: number) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            select: ['publicKey'],
        });

        if (!user) {
            throw new Error(`User with ID ${userId} not found`);
        }

        return { publicKey: user.publicKey };
    }

    async searchUsersByName(name: string, currentUserId: number) {
        // Handle search for full name (first + last)
        const nameParts = name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts[1] : '';

        const queryBuilder = this.userRepo.createQueryBuilder('user');

        queryBuilder
            .where('user.id != :currentUserId', { currentUserId })
            .andWhere(
                '(user.firstName LIKE :firstNameTerm OR ' +
                    'user.lastName LIKE :lastNameTerm' +
                    (lastName
                        ? ' OR (user.firstName LIKE :firstName AND user.lastName LIKE :lastName)'
                        : '') +
                    ')',
                {
                    firstNameTerm: `%${name}%`,
                    lastNameTerm: `%${name}%`,
                    firstName: firstName ? `%${firstName}%` : '',
                    lastName: lastName ? `%${lastName}%` : '',
                },
            )
            .select([
                'user.id',
                'user.firstName',
                'user.lastName',
                'user.avatar',
            ]);

        return {
            users: await queryBuilder.getMany(),
        };
    }
}
