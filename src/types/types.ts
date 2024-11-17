export interface Config {
  port: number;
  telegramToken: string;
  dbPath: string;
}

export interface StepEntry {
  userId: bigint;
  username: string;
  steps: number;
  date: string;
  weekNumber: number;
  year: number;
  chatId: bigint;
}

export interface WeeklyStats {
  username: string;
  totalSteps: number;
  weekNumber: number;
  year: number;
}

export interface UserStats {
  totalDays: number;
  totalSteps: number;
  averageSteps: number;
  bestDay: number;
  totalWeeks: number;
  averageWeeklySteps: number;
  bestWeek: number;
}

export interface StepEntry {
  userId: bigint;
  username: string;
  steps: number;
  date: string;
  weekNumber: number;
  year: number;
  chatId: bigint;
}

export interface DailyStats {
  username: string;
  totalSteps: number;
}

export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

export interface InlineKeyboardMarkup {
  reply_markup: {
    inline_keyboard: InlineKeyboardButton[][];
  };
}