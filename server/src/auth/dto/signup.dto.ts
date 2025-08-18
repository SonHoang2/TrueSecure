import {
    IsDefined,
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    Length,
    Matches,
} from 'class-validator';

export class SignupDto {
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @IsDefined()
    @IsString()
    @IsNotEmpty()
    lastName: string;

    @IsNotEmpty()
    @IsString()
    @Length(3, 20)
    @Matches(/^[a-zA-Z0-9_]+$/, {
        message: 'Username must be alphanumeric and can include underscores',
    })
    username: string;

    @IsDefined()
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsDefined()
    @IsNotEmpty()
    @Length(12, 20)
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,20}$/,
        {
            message:
                'Password must be 12-20 characters long and include uppercase, lowercase, number, and one special character @$!%*?&',
        },
    )
    password: string;

    @IsDefined()
    @IsNotEmpty()
    passwordConfirm: string;

    @IsOptional()
    @IsString()
    deviceUuid?: string;

    @IsString()
    @IsNotEmpty()
    publicKey: string;
}
