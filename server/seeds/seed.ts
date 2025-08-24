// seeds/seed.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

import { seedUsers } from './users.seed';

async function run() {
    const args = process.argv.slice(2);

    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    try {
        if (args.includes('users')) await seedUsers(dataSource);

        if (args.includes('all') || args.length === 0) {
            await seedUsers(dataSource);
        }

        console.log('✅ Seeding complete');
    } catch (err) {
        console.error('❌ Seeding error:', err);
    } finally {
        await app.close();
        process.exit(0);
    }
}

run();
