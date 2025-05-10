import { IsString, IsNotEmpty } from 'class-validator';

export class GoogleLoginDto {
    @IsString()
    @IsNotEmpty()
    code: string;

    @IsString()
    @IsNotEmpty()
    redirectUri: string;
}
