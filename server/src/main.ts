import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JSendInterceptor } from './common/interceptors/jsend.interceptor';
import { AllExceptionsFilter } from './common/interceptors/all-exceptions.filter';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(new JSendInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.listen(5000);
}
bootstrap();
