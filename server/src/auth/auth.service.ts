import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { User } from 'src/user/entities/user.entity';
import { cleanDto } from 'src/common/utils/cleanDto';

@Injectable()
export class AuthService {
    private readonly jwtConfig: any;
    private readonly env: string;

    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
        private userService: UserService,
        @InjectRedis() private readonly redis: Redis,
    ) {
        this.jwtConfig = this.configService.get('jwt');
        this.env = this.configService.get<string>('env');
    }

    private setCookies(
        res: Response,
        accessToken: string,
        refreshToken: string,
    ) {
        const ATOptions = {
            expires: new Date(
                Date.now() +
                    this.jwtConfig.accessToken.cookieExpiresIn * 60 * 60 * 1000,
            ),
            httpOnly: true,
            secure: this.env === 'production',
            sameSite: 'strict' as const,
        };

        const RTOptions = {
            expires: new Date(
                Date.now() +
                    this.jwtConfig.refreshToken.cookieExpiresIn *
                        24 *
                        60 *
                        60 *
                        1000,
            ),
            httpOnly: true,
            secure: this.env === 'production',
            path: '/api/v1/auth/',
            sameSite: 'strict' as const,
        };

        res.cookie('accessToken', accessToken, ATOptions);
        res.cookie('refreshToken', refreshToken, RTOptions);
    }

    private signToken(id: number, expiresIn: string): string {
        return this.jwtService.sign({ id }, { expiresIn });
    }

    private async createSendToken(user: User, res: Response) {
        console.log(
            this.jwtConfig.accessToken.expiresIn,
            this.jwtConfig.refreshToken.expiresIn,
            this.jwtConfig.refreshToken.cookieExpiresIn,
        );

        const accessToken = this.signToken(
            user.id,
            this.jwtConfig.accessToken.expiresIn,
        );

        const refreshToken = this.signToken(
            user.id,
            this.jwtConfig.refreshToken.expiresIn,
        );

        await this.redis
            .multi()
            .set(
                refreshToken,
                String(user.id),
                'EX',
                this.jwtConfig.refreshToken.cookieExpiresIn * 86400,
            )
            .sadd(`user:${user.id}:tokens`, refreshToken)
            .exec();

        this.setCookies(res, accessToken, refreshToken);

        const filter = cleanDto(user, ['password']);
        return { filter };
    }

    async login(LoginDto: LoginDto, res: Response) {
        const { email, password } = LoginDto;

        const user = await this.userService.findByEmailWithPassword(email);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw new UnauthorizedException('Invalid email or password');
        }
        if (!user.active)
            throw new ForbiddenException('Account is deactivated');

        return this.createSendToken(user, res);
    }

    async signup(SignupDto: SignupDto, res: Response) {
        if (SignupDto.password !== SignupDto.passwordConfirm) {
            throw new BadRequestException('Passwords do not match!');
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordConfirm, ...userDto } = SignupDto;

        const newUser = await this.userService.create(userDto);

        this.createSendToken(newUser, res);
    }
}
