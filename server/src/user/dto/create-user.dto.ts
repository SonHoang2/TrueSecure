import {
    IsString,
    IsEmail,
    IsOptional,
    IsBoolean,
    MinLength,
} from 'class-validator';

export class CreateUserDto {
    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsString()
    username: string;

    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsOptional()
    @IsString()
    avatar?: string;

    @IsOptional()
    @IsBoolean()
    googleAccount?: boolean;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}
