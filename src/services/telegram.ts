import TelegramBot from 'node-telegram-bot-api';
import config from '../config/config';
import { DatabaseService } from './database';
import { WeeklyStepsKeyboard, WeekKeyboard } from './telegram/keyboards';
import { Commands } from './telegram/commands';
import { Messages } from './telegram/messages';
import { FormatDateRange, GetWeekNumber } from './telegram/utils';

export class TelegramService {
  private bot: TelegramBot;
  private readonly db: DatabaseService;
  private usersAwaitingSteps: Set<number> = new Set();
  private usersAwaitingWeekChoice: Set<number> = new Set();
  private botUsername: string = '';

  private readonly weeklyStepsKeyboard = WeeklyStepsKeyboard;

  private readonly weekKeyboard = WeekKeyboard;

  private readonly commands = Commands;

  constructor(dbService: DatabaseService) {
    if (!dbService) {
      throw new Error('DatabaseService is required');
    }

    if (!config.telegramToken) {
      throw new Error('Telegram token is not configured');
    }

    this.db = dbService;
    this.bot = new TelegramBot(config.telegramToken, { polling: true });
    void this.initializeBot();
  }

  private async initializeBot(): Promise<void> {
    try {
      const botInfo = await this.bot.getMe();
      this.botUsername = botInfo.username || '';
      await this.bot.setMyCommands(this.commands);
      this.initializeHandlers();
      console.log(`Telegram bot initialized with username: ${this.botUsername}`);
    } catch (error) {
      console.error('Error initializing bot:', error);
      throw error;
    }
  }

  private initializeHandlers(): void {
    // Error handlers
    this.bot.on('polling_error', (error) => {
      console.error('Telegram bot polling error:', error);
    });

    this.bot.on('error', (error) => {
      console.error('Telegram bot error:', error);
    });

    // Message handler
    this.bot.on('message', (msg) => {
      if (msg.text) {
        void this.handleIncomingMessage(msg);
      }
    });

    // Initialize callback queries handler
    this.handleCallbackQueries();
  }

  // Add callback query handling for inline keyboard
  private handleCallbackQueries(): void {
    this.bot.on('callback_query', async (query) => {
      if (!query.message || !query.data) return;

      const chatId = BigInt(query.message.chat.id);
      const userId = query.from.id;
      const isGroup =
        query.message.chat.type === 'group' || query.message.chat.type === 'supergroup';

      try {
        console.log('Callback data:', query.data); // Debug log

        // Handle cancel button for both steps and week
        if (query.data === 'cancel') {
          // Clean up states
          this.usersAwaitingSteps.delete(userId);
          this.usersAwaitingWeekChoice.delete(userId);

          // Edit message to show cancellation
          await this.bot.editMessageText('❌ Действие отменено', {
            chat_id: Number(chatId),
            message_id: query.message.message_id,
          });

          await this.bot.answerCallbackQuery(query.id);
          return;
        }

        // Handle steps callbacks
        if (query.data.startsWith('steps_')) {
          const steps = query.data.split('_')[1];

          // Process the steps
          await this.processSteps(
            {
              ...query.message,
              from: query.from,
              chat: query.message.chat,
              message_id: query.message.message_id,
            },
            steps,
          );

          this.usersAwaitingSteps.delete(userId);

          // Remove the inline keyboard after processing
          try {
            await this.bot.editMessageReplyMarkup(
              { inline_keyboard: [] },
              {
                chat_id: Number(chatId),
                message_id: query.message.message_id,
              },
            );
          } catch (editError) {
            console.error('Error removing keyboard:', editError);
          }
        }
        // Handle week callbacks
        else if (query.data.startsWith('week_')) {
          const action = query.data.split('_')[1];
          const currentDate = new Date();
          const { week, year } = GetWeekNumber(currentDate);

          switch (action) {
            case 'current':
              await this.showWeekStats(query.message, week, year);
              break;
            case 'previous':
              const prevWeek = week === 1 ? 52 : week - 1;
              const prevYear = week === 1 ? year - 1 : year;
              await this.showWeekStats(query.message, prevWeek, prevYear);
              break;
            case 'custom':
              await this.bot.sendMessage(Number(chatId), Messages.weekNumberMessage);
              break;
          }

          this.usersAwaitingWeekChoice.delete(userId);

          // Remove the inline keyboard after processing
          try {
            await this.bot.editMessageReplyMarkup(
              { inline_keyboard: [] },
              {
                chat_id: Number(chatId),
                message_id: query.message.message_id,
              },
            );
          } catch (editError) {
            console.error('Error removing keyboard:', editError);
          }
        }

        // Always answer callback query
        await this.bot.answerCallbackQuery(query.id);
      } catch (error) {
        console.error('Error handling callback query:', error);
        await this.bot.answerCallbackQuery(query.id, {
          text: Messages.defaultErrorMessage,
          show_alert: true,
        });

        // Clean up states on error
        this.usersAwaitingSteps.delete(userId);
        this.usersAwaitingWeekChoice.delete(userId);

        // Notify user in chat
        await this.bot.sendMessage(Number(chatId), Messages.defaultErrorMessage, {
          reply_to_message_id: isGroup ? query.message.message_id : undefined,
        });
      }
    });
  }

  private cleanCommand(text: string): string {
    const commandPattern = /^\/([^@\s]+)(?:@\S+)?\s*(.*)/;
    const match = text.match(commandPattern);

    if (match) {
      const command = match[1].toLowerCase();
      const args = match[2];
      return args ? `/${command} ${args}` : `/${command}`;
    }

    return text;
  }

  private isCommand(text: string): boolean {
    return text.startsWith('/');
  }

  private async handleIncomingMessage(msg: TelegramBot.Message): Promise<void> {
    if (!msg.text) return;

    const userId = msg.from?.id;
    const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
    const chatId = BigInt(msg.chat.id);

    try {
      // Clean and check if it's a command
      const isCmd = this.isCommand(msg.text);
      const cleanText = this.cleanCommand(msg.text);
      console.log('Processing message:', { userId, text: msg.text, isCmd, cleanText }); // Debug log

      // Handle week selection state
      if (userId && this.usersAwaitingWeekChoice.has(userId)) {
        console.log('User awaiting week choice:', userId); // Debug log

        if (msg.text === '/cancel') {
          this.usersAwaitingWeekChoice.delete(userId);
          await this.bot.sendMessage(Number(chatId), Messages.cancelStatsMessage, {
            reply_to_message_id: isGroup ? msg.message_id : undefined,
          });
          return;
        }

        const weekYearPattern = /^\/(\d{1,2})-(\d{4})$/;
        const weekMatch = msg.text.match(weekYearPattern);
        if (weekMatch) {
          console.log('Week pattern matched:', weekMatch); // Debug log
          await this.handleWeekInput(msg, msg.text);
          this.usersAwaitingWeekChoice.delete(userId);
          return;
        }
      }

      // Handle steps input state
      if (userId && this.usersAwaitingSteps.has(userId)) {
        console.log('User awaiting steps:', userId); // Debug log

        if (msg.text === '/cancel') {
          this.usersAwaitingSteps.delete(userId);
          await this.bot.sendMessage(Number(chatId), Messages.cancelStepsMessage, {
            reply_to_message_id: isGroup ? msg.message_id : undefined,
          });
          return;
        }

        const numberMatch = msg.text.match(/^\/?\s*(\d+)\s*$/);
        if (numberMatch) {
          console.log('Number pattern matched:', numberMatch[1]); // Debug log
          await this.processSteps(msg, numberMatch[1]);
          this.usersAwaitingSteps.delete(userId);
          return;
        } else {
          await this.bot.sendMessage(Number(chatId), Messages.invalidStepsMessage, {
            reply_to_message_id: isGroup ? msg.message_id : undefined,
          });
          return;
        }
      }

      // Handle commands
      if (isCmd) {
        const command = cleanText.split(' ')[0].toLowerCase();
        console.log('Processing command:', command); // Debug log

        switch (command) {
          case '/start':
            await this.handleStartCommand(msg);
            break;
          case '/steps':
            await this.handleStepsCommand(msg);
            break;
          case '/week':
            await this.handleWeekCommand(msg);
            break;
          case '/mystats':
            await this.handleMyStatsCommand(msg);
            break;
          case '/help':
            await this.handleHelpCommand(msg);
            break;
          case '/cancel':
            if (
              !this.usersAwaitingSteps.has(userId!) &&
              !this.usersAwaitingWeekChoice.has(userId!)
            ) {
              await this.bot.sendMessage(Number(chatId), Messages.invalidCancelMessage, {
                reply_to_message_id: isGroup ? msg.message_id : undefined,
              });
            }
            break;
          default:
            // Only show unknown command message if not in a waiting state
            if (
              !this.usersAwaitingSteps.has(userId!) &&
              !this.usersAwaitingWeekChoice.has(userId!)
            ) {
              await this.bot.sendMessage(Number(chatId), Messages.unknownCommandMessage, {
                reply_to_message_id: isGroup ? msg.message_id : undefined,
              });
            }
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
      await this.bot.sendMessage(Number(chatId), Messages.errorProcessingMessage, {
        reply_to_message_id: isGroup ? msg.message_id : undefined,
      });

      // Clean up waiting states on error
      if (userId) {
        this.usersAwaitingSteps.delete(userId);
        this.usersAwaitingWeekChoice.delete(userId);
      }
    }
  }

  private async handleWeekInput(msg: TelegramBot.Message, text: string): Promise<void> {
    const weekYearPattern = /^\/(\d{1,2})-(\d{4})$/;
    const match = text.match(weekYearPattern);

    if (!match) {
      await this.bot.sendMessage(Number(msg.chat.id), Messages.invalidWeekNumberMessage);
      return;
    }

    const weekNum = parseInt(match[1]);
    const year = parseInt(match[2]);

    // Validate week number
    if (weekNum < 1 || weekNum > 53) {
      await this.bot.sendMessage(Number(msg.chat.id), Messages.invalidWeekNumberError);
      return;
    }

    // Validate year (for example, allow only last 2 years)
    const currentYear = new Date().getFullYear();
    if (year < currentYear - 1 || year > currentYear + 1) {
      await this.bot.sendMessage(Number(msg.chat.id), Messages.yearError(currentYear));
      return;
    }

    await this.showWeekStats(msg, weekNum, year);
  }

  private async handleStartCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = BigInt(msg.chat.id);
    const username = msg.from?.first_name;
    await this.bot.sendMessage(Number(chatId), Messages.welcomeMessage(username));
  }

  private async handleStepsCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = BigInt(msg.chat.id);
    const userId = msg.from?.id;
    const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';

    if (!userId) {
      await this.bot.sendMessage(Number(chatId), Messages.userIdentificationError);
      return;
    }

    // Get current week number and year
    const currentDate = new Date();
    const { week, year } = GetWeekNumber(currentDate);
    const dateRange = FormatDateRange(week, year);

    this.usersAwaitingSteps.add(userId);

    const promptMessage = Messages.stepsMessage(week, dateRange);

    const mentionUser = isGroup ? `@${msg.from?.username || msg.from?.first_name}, ` : '';
    const finalMessage = isGroup ? mentionUser + promptMessage : promptMessage;

    await this.bot.sendMessage(Number(chatId), finalMessage, {
      reply_to_message_id: isGroup ? msg.message_id : undefined,
      ...this.weeklyStepsKeyboard,
    });
  }

  // Update processSteps to handle weekly data
  private async processSteps(msg: TelegramBot.Message, stepsText: string): Promise<void> {
    const chatId = BigInt(msg.chat.id);
    const userId = msg.from?.id ? BigInt(msg.from.id) : null;
    const username = msg.from?.first_name || 'User';
    const steps = parseInt(stepsText.trim());
    const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';

    if (!userId) {
      await this.bot.sendMessage(Number(chatId), Messages.userIdentificationError);
      return;
    }

    if (isNaN(steps) || steps < 0) {
      await this.bot.sendMessage(Number(chatId), Messages.invalidStepsMessage, {
        reply_to_message_id: isGroup ? msg.message_id : undefined,
      });
      return;
    }

    // Increased maximum for weekly steps
    if (steps > 500000) {
      await this.bot.sendMessage(Number(chatId), Messages.stepsLimitError, {
        reply_to_message_id: isGroup ? msg.message_id : undefined,
      });
      return;
    }

    try {
      const currentDate = new Date();
      const { week, year } = GetWeekNumber(currentDate);
      const dateRange = FormatDateRange(week, year);

      await this.db.logSteps({
        userId,
        username,
        steps,
        date: currentDate.toISOString().split('T')[0],
        weekNumber: week,
        year,
        chatId,
      });

      const stats = await this.db.getWeeklyStats(chatId, week, year);
      let message = `✅ Записано ${steps.toLocaleString()} шагов для ${
        isGroup ? '@' + msg.from?.username || username : username
      }!\n\nЗа неделю ${week} (${dateRange})\nОтличная работа, продолжай поддерживать активность! 🎉\n`;

      if (stats.length > 1) {
        message += '\n📊 Лидеры недели:\n';
        stats.forEach((stat, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👟';
          message += `${medal} ${stat.username}: ${stat.totalSteps.toLocaleString()} шагов\n`;
        });
      }

      await this.bot.sendMessage(Number(chatId), message, {
        reply_to_message_id: isGroup ? msg.message_id : undefined,
      });
    } catch (error) {
      console.error('Error logging steps:', error);
      await this.bot.sendMessage(Number(chatId), Messages.stepsSaveError, {
        reply_to_message_id: isGroup ? msg.message_id : undefined,
      });
    }
  }

  private async handleWeekCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = BigInt(msg.chat.id);
    const userId = msg.from?.id;
    const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';

    if (!userId) {
      await this.bot.sendMessage(Number(chatId), Messages.userIdentificationError, {
        reply_to_message_id: isGroup ? msg.message_id : undefined,
      });
      return;
    }

    // Get current week info
    const currentDate = new Date();
    const { week: currentWeek, year: currentYear } = GetWeekNumber(currentDate);
    const currentDateRange = FormatDateRange(currentWeek, currentYear);

    const helpMessage = Messages.weekStatsMessage(currentWeek, currentYear, currentDateRange);

    this.usersAwaitingWeekChoice.add(userId);

    await this.bot.sendMessage(Number(chatId), helpMessage, {
      reply_to_message_id: isGroup ? msg.message_id : undefined,
      ...this.weekKeyboard,
    });
  }

  private async handleMyStatsCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = BigInt(msg.chat.id);
    const userId = msg.from?.id ? BigInt(msg.from.id) : null;
    const username = msg.from?.first_name || 'User';
    const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';

    if (!userId) {
      await this.bot.sendMessage(Number(chatId), Messages.userIdentificationError, {
        reply_to_message_id: isGroup ? msg.message_id : undefined,
      });
      return;
    }

    try {
      const stats = await this.db.getUserStats(userId, chatId);
      const currentDate = new Date();
      const { week: currentWeek, year: currentYear } = GetWeekNumber(currentDate);

      // Get current week's ranking
      const currentRank = await this.db.getUserWeeklyRank(userId, chatId, currentWeek, currentYear);

      // Get progress compared to previous week
      const progress = await this.db.getWeeklyProgress(userId, chatId, currentWeek, currentYear);

      if (stats.totalWeeks === 0) {
        await this.bot.sendMessage(Number(chatId), Messages.noStepsMessage(username), {
          reply_to_message_id: isGroup ? msg.message_id : undefined,
        });
        return;
      }

      // Format progress indicator
      let progressIndicator = '';
      if (progress.previousWeek > 0) {
        const changePercent = Math.abs(progress.change);
        if (progress.change > 0) {
          progressIndicator = `📈 +${changePercent.toFixed(1)}% к прошлой неделе`;
        } else if (progress.change < 0) {
          progressIndicator = `📉 -${changePercent.toFixed(1)}% к прошлой неделе`;
        } else {
          progressIndicator = '➡️ Как в прошлой неделе';
        }
      }

      // Calculate weekly average excluding current week if it's just started
      const dayOfWeek = currentDate.getDay();
      const completedWeeks = dayOfWeek <= 3 ? stats.totalWeeks - 1 : stats.totalWeeks;
      const weeklyAverage =
        completedWeeks > 0 ? Math.round(stats.totalSteps / completedWeeks) : stats.totalSteps;

      let message = `📊 Статистика ${username}:\n\n`;

      // Current week status
      if (progress.currentWeek > 0) {
        message += `🎯 Текущая неделя (${currentWeek}):\n`;
        message += `• ${progress.currentWeek.toLocaleString()} шагов\n`;
        if (currentRank > 0) {
          message += `• ${currentRank}-е место в рейтинге\n`;
        }
        if (progressIndicator) {
          message += `• ${progressIndicator}\n`;
        }
        message += '\n';
      }

      // Overall statistics
      message += `📈 Общая статистика:\n`;
      message += `• Всего шагов: ${stats.totalSteps.toLocaleString()}\n`;
      message += `• Недель записано: ${completedWeeks}\n`;
      message += `• В среднем за неделю: ${weeklyAverage.toLocaleString()}\n`;
      message += `• Лучший результат: ${stats.bestWeek.toLocaleString()} шагов\n`;

      // Add achievements
      let achievements = '\n🏆 Достижения:\n';
      if (stats.totalWeeks >= 4) {
        achievements += '• Месяц активности ⭐\n';
      }
      if (stats.bestWeek >= 100000) {
        achievements += '• Супер ходок 🦿\n';
      }
      if (stats.totalSteps >= 1000000) {
        achievements += '• Миллионер 💫\n';
      }

      // Only add achievements section if there are any
      if (achievements !== '\n🏆 Достижения:\n') {
        message += achievements;
      }

      // Add weekly comparison if available
      if (progress.previousWeek > 0) {
        message += `\n📅 Сравнение с прошлой неделей:\n`;
        message += `• Прошлая: ${progress.previousWeek.toLocaleString()} шагов\n`;
        message += `• Текущая: ${progress.currentWeek.toLocaleString()} шагов\n`;
      }

      // Add motivation
      message += '\n💪 Так держать! Продолжайте двигаться к новым целям!';

      await this.bot.sendMessage(Number(chatId), message, {
        reply_to_message_id: isGroup ? msg.message_id : undefined,
        parse_mode: 'HTML',
      });
    } catch (error) {
      console.error('Error getting user stats:', error);
      await this.bot.sendMessage(Number(chatId), Messages.statsError, {
        reply_to_message_id: isGroup ? msg.message_id : undefined,
      });
    }
  }

  private async handleHelpCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = BigInt(msg.chat.id);

    await this.bot.sendMessage(Number(chatId), Messages.helpMessage());
  }

  // Move the stats display logic to a separate method
  private async showWeekStats(
    msg: TelegramBot.Message,
    weekNumber: number,
    year: number,
  ): Promise<void> {
    const chatId = BigInt(msg.chat.id);
    const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
    const dateRange = FormatDateRange(weekNumber, year);

    try {
      const stats = await this.db.getWeeklyStats(chatId, weekNumber, year);

      if (!stats || stats.length === 0) {
        await this.bot.sendMessage(
          Number(chatId),
          Messages.noWeekStepsMessage(weekNumber, year, dateRange),
          {
            reply_to_message_id: isGroup ? msg.message_id : undefined,
          },
        );
        return;
      }

      // Rest of your existing stats display code...
      // Calculate statistics
      const totalSteps = stats.reduce((sum, stat) => sum + stat.totalSteps, 0);
      const avgSteps = Math.round(totalSteps / stats.length);

      // Sort by steps in descending order
      const sortedStats = [...stats].sort((a, b) => b.totalSteps - a.totalSteps);

      let message = `📊 Статистика за ${weekNumber}-ю неделю ${year}\n`;
      message += `${dateRange}\n`;
      message += `(участников: ${stats.length}):\n\n`;

      sortedStats.forEach((stat, index) => {
        const medal =
          index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        message += `${medal} ${stat.username}: ${stat.totalSteps.toLocaleString()} шагов\n`;
      });

      message += `\n📈 Общая статистика:\n`;
      message += `👥 Всего участников: ${stats.length}\n`;
      message += `🎯 Общее количество шагов: ${totalSteps.toLocaleString()}\n`;
      message += `📊 В среднем: ${avgSteps.toLocaleString()} шагов/человек\n`;

      await this.bot.sendMessage(Number(chatId), message, {
        reply_to_message_id: isGroup ? msg.message_id : undefined,
      });
    } catch (error) {
      console.error('Error showing week stats:', error);
      await this.bot.sendMessage(Number(chatId), Messages.statsError, {
        reply_to_message_id: isGroup ? msg.message_id : undefined,
      });
    }
  }
}
