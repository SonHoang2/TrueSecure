import {
    IsEmail,
    IsString,
    IsNotEmpty,
    Matches,
    Length,
} from 'class-validator';

export class LoginDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    @Length(12, 20)
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,20}$/,
        {
            message:
                'Password must be 12-20 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character @$!%*?&',
        },
    )
    password: string;
}
