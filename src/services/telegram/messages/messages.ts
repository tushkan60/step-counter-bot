export const Messages = {
  userIdentificationError: '❌ Не удалось идентифицировать пользователя!',
  weekNumberMessage: 'Введите номер недели в формате /[номер недели]-[год]\nНапример: /46-2024',
  defaultErrorMessage: '❌ Произошла ошибка. Попробуйте снова.',
  cancelStatsMessage: '❌ Просмотр статистики отменен',
  cancelStepsMessage: '❌ Запись шагов отменена',
  invalidStepsMessage: '❌ Введите корректное количество шагов (например /8000)',
  invalidCancelMessage: '❓ Нечего отменять. Используйте /help для просмотра команд.',
  unknownCommandMessage: '❓ Неизвестная команда. Используйте /help чтобы получить справку.',
  errorProcessingMessage: '❌ Ошибка обработки сообщения. Попробуйте ещё раз.',
  invalidWeekNumberMessage:
    '❌ Неверный формат. Используйте формат /[номер недели]-[год], например: /46-2024',
  invalidWeekNumberError: '❌ Неверный номер недели. Номер недели должен быть от 1 до 53.',
  stepsLimitError: '❌ Ну ну, кого ты пытаешься наебать? Максимум 500,000.',
  stepsSaveError: '❌ Ошибка при сохранении шагов. Пожалуйста, попробуйте снова.',
  statsError: '❌ Ошибка при получении статистики. Пожалуйста, попробуйте снова.',

  yearError(currentYear: number): string {
    return `❌ Год должен быть между ${currentYear - 1} и ${currentYear + 1}`;
  },

  welcomeMessage(username: string | undefined): string {
    return `
Привет ${username}! 👋

Я ваш бот для отслеживания шагов за неделю и сравнения с другими участниками!

Доступные команды:
/steps - Запись шагов за неделю
/week - Просмотр лидеров текущей недели
/mystats - Просмотр вашей статистики
/help - Просмотр справки

Чтобы начать использовать бота, используйте /steps для записи первых шагов!
  `;
  },

  stepsMessage(week: number, dateRange: string): string {
    return `
🏃‍♂️ Сколько шагов вы сделали за ${week}-ю неделю (${dateRange})?

Выберите один из предложенных вариантов, или просто введите количество (например, /35000). 
Используйте /cancel для отмены.`;
  },

  weekStatsMessage(currentWeek: number, currentYear: number, currentDateRange: string): string {
    return `
📊 Просмотр статистики по неделям

Выберите опцию или введите номер недели:

• Текущая неделя (${currentWeek}-${currentYear}): ${currentDateRange}
• Используйте формат /[номер недели]-[год]
  Например: /46-2024

• /cancel для отмены

Подсказка: В году 52 недели
`;
  },

  noStepsMessage(username: string): string {
    return `📊 Привет, ${username}!\n\nВы еще не начали отслеживать шаги.\nИспользуйте /steps чтобы начать записывать свои достижения!`;
  },

  helpMessage(): string {
    return `
🤖 Помощь по использованию Step Tracker Bot

Доступные команды:

📝 /steps - Запись шагов за неделю
- Выберите из быстрых вариантов или введите число
- Используйте /cancel для отмены записи

📊 /week - Рейтинг текущей недели
- Просмотр шагов всех участников
- Общая статистика группы

📈 /mystats - Ваша статистика
- Общее количество шагов
- Среднее количество в неделю
- Ваш лучший результат

❓ /help - Показать это сообщение

Подсказки:
- Можно обновлять количество шагов несколько раз за неделю
- Используйте /cancel для отмены во время записи
- Максимум 500,000 шагов в неделю

Нужна помощь? Пишите: @Muerted
   `;
  },

  noWeekStepsMessage(weekNumber: number, year: number, dateRange: string): string {
    return `🦶 На неделе ${weekNumber}-${year} (${dateRange}) нет записанных шагов!`;
  },
};
