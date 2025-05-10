import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { Res } from '@nestjs/common';
import { GoogleLoginDto } from './dto/googleLogin.dto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtGuard } from './jwt/jwt.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    login(
        @Body() loginDto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        return this.authService.login(loginDto, res);
    }

    @Post('signup')
    signup(
        @Body() signupDto: SignupDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        return this.authService.signup(signupDto, res);
    }

    @Post('login/google')
    googleLogin(
        @Body() googleLoginDto: GoogleLoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        return this.authService.googleLogin(googleLoginDto, res);
    }

    @UseGuards(JwtGuard)
    @Get('logout')
    logout(@Res({ passthrough: true }) res: Response, @Req() req: Request) {
        return this.authService.logout(req, res);
    }

    @UseGuards(JwtGuard)
    @Get('refresh')
    refreshToken(
        @Res({ passthrough: true }) res: Response,
        @Req() req: Request,
    ) {
        return this.authService.refreshToken(req, res);
    }
}
