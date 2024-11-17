import { PrismaClient, Prisma } from '@prisma/client';
import {DailyStats, StepEntry, UserStats, WeeklyStats} from '@/types/types';

export class DatabaseService {
  private prisma: PrismaClient;
  private initialized: boolean = false;

  constructor() {
    this.prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.prisma.$connect();
      this.initialized = true;
      console.log('Prisma connected successfully');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async getDailyStats(chatId: bigint, date: string): Promise<DailyStats[]> {
    try {
      const stats = await this.prisma.step.findMany({
        where: {
          chat_id: chatId,
          date,
        },
        select: {
          username: true,
          steps: true,
        },
        orderBy: {
          steps: 'desc',
        },
      });

      return stats.map((stat) => ({
        username: stat.username,
        totalSteps: stat.steps,
      }));
    } catch (error) {
      console.error('Error getting daily stats:', error);
      throw new Error('Failed to get daily statistics');
    }
  }

  async logSteps(entry: StepEntry): Promise<void> {
    try {
      const step = await this.prisma.step.findFirst({
        where: {
          user_id: entry.userId,
          week_number: entry.weekNumber,
          year: entry.year,
          chat_id: entry.chatId,
        },
      });

      if (step) {
        // Update existing entry
        await this.prisma.step.update({
          where: {
            id: step.id,
          },
          data: {
            steps: entry.steps,
            km: entry.km, // Update km field
            username: entry.username,
          },
        });
      } else {
        // Create new entry
        await this.prisma.step.create({
          data: {
            user_id: entry.userId,
            username: entry.username,
            steps: entry.steps,
            km: entry.km, // Set km field
            date: entry.date,
            week_number: entry.weekNumber,
            year: entry.year,
            chat_id: entry.chatId,
          },
        });
      }
    } catch (error) {
      console.error('Error logging steps:', error);
      throw new Error('Failed to log steps');
    }
  }

  async getWeeklyStats(chatId: bigint, weekNumber: number, year: number): Promise<WeeklyStats[]> {
    try {
      const steps = await this.prisma.step.findMany({
        where: {
          chat_id: chatId,
          week_number: weekNumber,
          year: year,
        },
        select: {
          username: true,
          steps: true,
          km: true, // Fetch km field
          week_number: true,
          year: true,
        },
        orderBy: {
          steps: 'desc',
        },
      });

      return steps.map((step) => ({
        username: step.username,
        totalSteps: step.steps,
        totalKm: step.km, // New field for total kilometers
        weekNumber: step.week_number,
        year: step.year,
      }));
    } catch (error) {
      console.error('Error getting weekly stats:', error);
      throw new Error('Failed to get weekly statistics');
    }
  }

  async getUserWeeklyRank(
    userId: bigint,
    chatId: bigint,
    weekNumber: number,
    year: number,
  ): Promise<number> {
    try {
      const rankings = await this.prisma.step.findMany({
        where: {
          chat_id: chatId,
          week_number: weekNumber,
          year: year,
        },
        orderBy: {
          steps: 'desc',
        },
        select: {
          user_id: true,
        },
      });

      const userIndex = rankings.findIndex((rank) => rank.user_id === userId);
      return userIndex === -1 ? -1 : userIndex + 1;
    } catch (error) {
      console.error('Error getting user rank:', error);
      throw new Error('Failed to get user ranking');
    }
  }

  async getWeeklyProgress(
    userId: bigint,
    chatId: bigint,
    weekNumber: number,
    year: number,
  ): Promise<{
    currentWeek: number;
    previousWeek: number;
    change: number;
  }> {
    try {
      const [currentWeek, previousWeek] = await Promise.all([
        this.prisma.step.findFirst({
          where: {
            user_id: userId,
            chat_id: chatId,
            week_number: weekNumber,
            year: year,
          },
          select: { steps: true },
        }),
        this.prisma.step.findFirst({
          where: {
            user_id: userId,
            chat_id: chatId,
            week_number: weekNumber - 1,
            year: weekNumber === 1 ? year - 1 : year,
          },
          select: { steps: true },
        }),
      ]);

      const current = currentWeek?.steps ?? 0;
      const previous = previousWeek?.steps ?? 0;
      const change = previous === 0 ? 0 : ((current - previous) / previous) * 100;

      return {
        currentWeek: current,
        previousWeek: previous,
        change,
      };
    } catch (error) {
      console.error('Error getting weekly progress:', error);
      throw new Error('Failed to get weekly progress');
    }
  }

  async getUserStats(userId: bigint, chatId: bigint): Promise<UserStats> {
    try {
      const basicStats = await this.prisma.step.aggregate({
        where: {
          user_id: userId,
          chat_id: chatId,
        },
        _count: {
          id: true,
        },
        _sum: {
          steps: true,
        },
        _avg: {
          steps: true,
        },
        _max: {
          steps: true,
        },
      });

      const weeklyAvg = await this.prisma.step.groupBy({
        by: ['week_number', 'year'],
        where: {
          user_id: userId,
          chat_id: chatId,
        },
        _sum: {
          steps: true,
        },
      });

      const bestWeek = weeklyAvg.reduce(
        (max, curr) => ((curr._sum.steps || 0) > (max._sum.steps || 0) ? curr : max),
        weeklyAvg[0],
      );

      return {
        totalDays: basicStats._count.id * 7,
        totalSteps: basicStats._sum.steps ?? 0,
        averageSteps: Math.round(basicStats._avg.steps ?? 0),
        bestDay: basicStats._max.steps ?? 0,
        totalKm: Math.round((basicStats._sum.steps ?? 0) * 0.0007),
        totalWeeks: basicStats._count.id,
        averageWeeklySteps: Math.round((basicStats._sum.steps ?? 0) / basicStats._count.id),
        bestWeek: bestWeek?._sum.steps ?? 0,
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw new Error('Failed to get user statistics');
    }
  }

  public async checkConnection(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }
}
