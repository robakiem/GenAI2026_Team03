// All user-visible texts. Keys are message identifiers (digest A-15), not the English wording of the scenarios.
export const uk = {
  app: {
    name: "Babki",
    tagline: "Облік спільних витрат для подорожей з друзями",
    screensTitle: "Майбутні екрани",
    home: "На головну",
  },
  screens: {
    signUp: "Реєстрація Координатора",
    signIn: "Вхід",
    ledgers: "Мої поїздки",
    ledgerNew: "Створення поїздки",
    ledger: "Огляд поїздки",
    expenseNew: "Нова витрата",
    expenseEdit: "Редагування витрати",
    transfers: "Перекази та оплата",
    member: "Моя сторінка",
    linkNotFound: "Посилання не знайдено",
  },
  health: {
    checking: "Перевірка з'єднання…",
    ok: "API: ok · DB: ok",
    dbUnavailable: "API: ok · DB: недоступна",
    unreachable: "API: недоступний",
  },
} as const;

export type ScreenKey = keyof typeof uk.screens;
