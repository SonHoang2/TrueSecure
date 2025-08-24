// seeds/utils/seed-helper.ts
import * as fs from 'fs';
import * as path from 'path';

export function loadJson(filename: string) {
    const filePath = path.resolve('docs/sample-data', filename);
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
}
