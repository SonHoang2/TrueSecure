import { IsJWT, IsNotEmpty, IsString } from 'class-validator';

export class SocketAuthDto {
    @IsJWT()
    @IsString()
    @IsNotEmpty()
    token: string;
}
