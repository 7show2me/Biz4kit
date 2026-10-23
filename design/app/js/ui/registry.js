/* All screens, in viewer order. Screen files call register() from js/main.js. */
export const SCREENS = [];
export const register = (list) => {
  for (const sc of list) {
    if (SCREENS.some((x) => x.id === sc.id))
      throw new Error(`Duplicate screen id ${sc.id}`);
    SCREENS.push(sc);
  }
};
export const screenById = (id) => SCREENS.find((s) => s.id === id);
