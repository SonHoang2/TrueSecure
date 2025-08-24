import { DataSource } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { loadJson } from './utils/seed-helper';

export async function seedUsers(dataSource: DataSource) {
    const repo = dataSource.getRepository(User);
    const users = loadJson('users.json');

    for (const u of users) {
        const exists = await repo.findOne({ where: { username: u.username } });
        if (!exists && u.password) {
            await repo.save(repo.create(u));
        }
    }

    console.log('✅ Users seeded');
}
