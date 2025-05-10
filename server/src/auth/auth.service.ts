import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Response, Request } from 'express';
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
import { GoogleLoginDto } from './dto/googleLogin.dto';

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

    async logout(req: Request, res: Response) {
        const refreshToken = req.cookies.refreshToken;

        const userId = await this.redis.get(refreshToken);
        if (userId) {
            await this.redis.del(refreshToken);
            await this.redis.srem(`user:${userId}:tokens`, refreshToken);
        }

        const ATOptions = {
            httpOnly: true,
            secure: this.env === 'production',
            sameSite: 'strict' as const,
        };

        const RTOptions = {
            httpOnly: true,
            secure: this.env === 'production',
            path: '/api/v1/auth/',
            sameSite: 'strict' as const,
        };

        res.clearCookie('accessToken', ATOptions);
        res.clearCookie('refreshToken', RTOptions);

        return { status: 'success' };
    }

    async refreshToken(req: Request, res: Response) {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            throw new UnauthorizedException(
                'You are not logged in! Please log in to get access',
            );
        }

        const userId = await this.redis.get(refreshToken);
        if (!userId) {
            try {
                const decoded = this.jwtService.verify(refreshToken);

                // Refresh token reuse detected!
                console.log(
                    'Refresh token reuse detected for user:',
                    decoded.id,
                );

                // Invalidate all tokens for the user
                const userTokensKey = `user:${decoded.id}:tokens`;
                const tokens = await this.redis.smembers(userTokensKey);
                if (tokens.length > 0) {
                    await Promise.all(
                        tokens.map((token) => this.redis.del(token)),
                    );
                    await this.redis.del(userTokensKey);
                }

                throw new ForbiddenException(
                    'Security alert: Session compromised!',
                );
            } catch (error) {
                throw new ForbiddenException('Invalid token');
            }
        }

        // Delete the old token
        await this.redis.del(refreshToken);
        await this.redis.srem(`user:${userId}:tokens`, refreshToken);

        // Generate new tokens
        const accessToken = this.signToken(
            parseInt(userId),
            this.jwtConfig.accessToken.expiresIn,
        );

        const newRefreshToken = this.signToken(
            parseInt(userId),
            this.jwtConfig.refreshToken.expiresIn,
        );

        // Store new refresh token and track it
        await this.redis
            .multi()
            .set(
                newRefreshToken,
                userId,
                'EX',
                this.jwtConfig.refreshToken.cookieExpiresIn * 86400,
            )
            .sadd(`user:${userId}:tokens`, newRefreshToken)
            .exec();

        this.setCookies(res, accessToken, newRefreshToken);

        return { status: 'success' };
    }

    async googleLogin(googleLoginDto: GoogleLoginDto, res: Response) {
        const clientId = this.configService.get('googleClientId');
        const clientSecret = this.configService.get('googleClientSecret');
        const grantType = 'authorization_code';
        const url = 'https://oauth2.googleapis.com/token';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: googleLoginDto.redirectUri,
                code: googleLoginDto.code,
                grant_type: grantType,
            }),
        });

        const data = await response.json();
        if (!data.id_token) {
            throw new BadRequestException('Failed to authenticate with Google');
        }

        const decodedToken = this.jwtService.decode(data.id_token);
        if (!decodedToken) {
            throw new BadRequestException(
                'Invalid token: Token could not be decoded',
            );
        }

        const { email, given_name, family_name } = decodedToken as any;

        let user = await this.userService.findByEmail(email);
        if (!user) {
            const password =
                Math.random().toString(36).slice(-12) +
                Math.random().toString(36).slice(-12);

            user = await this.userService.create({
                email,
                firstName: given_name,
                lastName: family_name,
                password,
                googleAccount: true,
            });
        }

        return this.createSendToken(user, res);
    }
}
