import { eq } from "drizzle-orm";
import { type User, type InsertUser, users } from "@shared/schema";
import { db } from "./db";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updatePortfolioData(userId: string, data: unknown): Promise<void>;
  getPortfolioData(userId: string): Promise<unknown | null>;
  updatePassword(userId: string, hashedPassword: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, email: insertUser.email.toLowerCase() })
      .returning();
    return user;
  }

  async updatePortfolioData(userId: string, data: unknown): Promise<void> {
    await db
      .update(users)
      .set({ portfolioData: data })
      .where(eq(users.id, userId));
  }

  async getPortfolioData(userId: string): Promise<unknown | null> {
    const [user] = await db
      .select({ portfolioData: users.portfolioData })
      .from(users)
      .where(eq(users.id, userId));
    return user?.portfolioData ?? null;
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ hashedPassword })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
