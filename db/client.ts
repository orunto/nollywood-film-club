import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

// Initialize the database connection
export const db = drizzle(process.env.DATABASE_URL!, { schema: { ...schema } });

// Export types for use in other files
export type Database = typeof db;
