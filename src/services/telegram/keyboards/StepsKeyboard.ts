import { InlineKeyboardMarkup } from '@/types/types';

export const WeeklyStepsKeyboard: InlineKeyboardMarkup = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '25,000 шагов', callback_data: 'steps_25000' },
        { text: '35,000 шагов', callback_data: 'steps_35000' },
        { text: '50,000 шагов', callback_data: 'steps_50000' },
      ],
      [
        { text: '75,000 шагов', callback_data: 'steps_75000' },
        { text: '100,000 шагов', callback_data: 'steps_100000' },
        { text: '❌ Отменить', callback_data: 'cancel' },
      ],
    ],
  },
};
