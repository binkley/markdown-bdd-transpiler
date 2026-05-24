import { zodToJsonSchema } from 'zod-to-json-schema';
import { transpilerConfigSchema } from '../src/cli/schema.ts'; // Let's use TSX for this to avoid build order issues
import fs from 'fs';

const jsonSchema = zodToJsonSchema(transpilerConfigSchema, 'BddConfig');
fs.writeFileSync('schema.json', JSON.stringify(jsonSchema, null, 2));
console.log('✅ Generated schema.json');
