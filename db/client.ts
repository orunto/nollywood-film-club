import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

// Validate that DATABASE_URL is defined
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not defined');
}

// Initialize the database connection
export const db = drizzle(process.env.DATABASE_URL, { schema: { ...schema } });

// Export types for use in other files
export type Database = typeof db;