import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JSendInterceptor } from './common/interceptors/jsend.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as bodyParser from 'body-parser';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    app.setGlobalPrefix('api/v1');
    app.use(bodyParser.json({ limit: '5mb' }));
    app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new JSendInterceptor());

    // Enable WebSockets with Socket.io
    app.useWebSocketAdapter(new IoAdapter(app));

    const corsOrigins = configService
        .get<string>('CORS_ORIGINS')
        ?.split(',')
        .map((origin) => origin.trim());

    app.enableCors({
        origin: corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-device-uuid'],
    });

    const port = configService.get<number>('port') || 5000;
    await app.listen(port);
    console.log(`Application is running on port: ${port}`);
}
bootstrap();
