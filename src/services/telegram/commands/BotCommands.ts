import { BotCommand } from 'node-telegram-bot-api';

export const Commands: BotCommand[] = [
  {
    command: 'start',
    description: 'Запустить бота',
  },
  {
    command: 'steps',
    description: 'Записать шаги за текущую неделю',
  },
  {
    command: 'mystats',
    description: 'Просмотр общей статистики',
  },
  {
    command: 'week',
    description: 'Просмотр лидеров текущей недели',
  },
  {
    command: 'help',
    description: 'Доступные команды',
  },
  {
    command: 'cancel',
    description: 'Отменить текущее действие',
  },
];
