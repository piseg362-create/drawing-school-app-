import re

i18n_path = 'renderer/lib/i18n.js'
with open(i18n_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replacement block
init_code_old = """i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // Default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // React already safes from xss
    }
  });"""

init_code_new = """const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('app_lang') : null;

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage || "en", // Default language from local storage
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // React already safes from xss
    }
  });

if (typeof window !== 'undefined') {
  i18n.on('languageChanged', (lng) => {
    localStorage.setItem('app_lang', lng);
  });
}"""

content = content.replace(init_code_old, init_code_new)

with open(i18n_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("i18n.js updated for localStorage!")
