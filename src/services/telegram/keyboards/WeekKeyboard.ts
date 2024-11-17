import { InlineKeyboardMarkup } from '@/types/types';

export const WeekKeyboard: InlineKeyboardMarkup = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: 'Текущая неделя 📅', callback_data: 'week_current' },
        { text: 'Предыдущая неделя ⏮️', callback_data: 'week_previous' },
      ],
      [
        { text: 'Выбрать другую неделю 📊', callback_data: 'week_custom' },
        { text: '❌ Отменить', callback_data: 'cancel' },
      ],
    ],
  },
};
