import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JSendInterceptor } from './common/interceptors/jsend.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
    // Create a temporary module to access config before app creation
    const configApp = await NestFactory.createApplicationContext(AppModule);
    const configService = configApp.get(ConfigService);

    const sslKey = configService.get<string>('sslKey');
    const sslCert = configService.get<string>('sslCert');
    const httpsOptions = {
        key: fs.readFileSync(sslKey),
        cert: fs.readFileSync(sslCert),
    };

    // Now create the app with HTTPS
    const app = await NestFactory.create(AppModule, { httpsOptions });

    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new JSendInterceptor());

    const clientUrl = configService.get<string>('client');

    app.enableCors({
        origin: clientUrl,
        credentials: true,
    });

    const port = configService.get<number>('port') || 5000;
    await app.listen(port);
    console.log(`Application is running on port: ${port}`);
}
bootstrap();
