import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';

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

        return this.userRepo.find(options);
    }

    async findOne(id: number) {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user) {
            throw new Error(`User with ID ${id} not found`);
        }
        return user;
    }

    async update(id: number, updateUserDto: UpdateUserDto) {
        const user = await this.findOne(id);
        this.userRepo.merge(user, updateUserDto);
        return this.userRepo.save(user);
    }

    async remove(id: number) {
        const user = await this.findOne(id);
        user.active = false;
        return this.userRepo.save(user);
    }

    async findByEmailWithPassword(email: string) {
        return this.userRepo.findOne({
            where: { email },
            select: ['id', 'email', 'password', 'active'],
        });
    }

    async findByEmail(email: string) {
        return this.userRepo.findOne({
            where: { email },
            select: ['id', 'email', 'active'],
        });
    }

    async findActiveById(id: number) {
        return this.userRepo.findOne({
            where: { id, active: true },
        });
    }
}
