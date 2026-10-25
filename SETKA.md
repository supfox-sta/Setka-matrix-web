# Setka Web (Element Web fork)

Локальная разработка под homeserver `matrix.setka-matrix.ru`.

## Сборка production (Windows)

Требования: **Node.js ≥ 22.18**, **pnpm**, **Git for Windows** (нужен `sh` для CSS).

```powershell
cd C:\Users\cekin\Desktop\element-web-develop
pnpm install

cd apps\web
# PowerShell не находит sh — добавьте Git в PATH на время сборки:
$env:PATH = "C:\Program Files\Git\bin;" + $env:PATH
pnpm build
```

Результат — папка **`apps\web\webapp\`** (статический сайт).

Перед выкладкой положите конфиг Setka **внутрь webapp**:

```powershell
copy config.setka.json webapp\config.json
```

Дальше содержимое `webapp\` отдаётся любым веб-сервером (Nginx, Caddy, IIS и т.д.) по HTTPS.

> На Windows **`pnpm dist`** (tar.gz) не работает — используйте **`pnpm build`**.

## Вход (SSO / OAuth)

Setka использует **Matrix Authentication Service** — `https://auth.setka-matrix.ru/`.

Legacy Synapse `/login/sso/redirect` **не работает** (отдаёт JSON). Кнопка «Продолжить» / SSO в клиенте должна вести на **OAuth** (`auth.setka-matrix.ru/authorize`).

### Web — два окружения

| Домен | Config | OIDC client_id |
|-------|--------|----------------|
| `web.setka-matrix.ru` | `config.setka.json` | `01KZ9XW3DNR98E76P4JFMMFCCD` |
| `web-beta.setka-matrix.ru` | `config.setka-beta.json` | `01KZ9Y4SM45GW3GQ9BNC1R5N20` |

Redirect URI в MAS **строго привязан к домену**. Нельзя использовать prod client_id на beta-домене.

Перед деплоем:

```powershell
copy config.setka-beta.json webapp\config.json   # для beta
# или
copy config.setka.json webapp\config.json        # для prod
```

### MAS (если нужен новый клиент)

```bash
# Пример регистрации web-клиента
curl -X POST https://auth.setka-matrix.ru/oauth2/registration \
  -H "Content-Type: application/json" \
  -d '{"client_name":"Setka Web","application_type":"web","redirect_uris":["https://web.setka-matrix.ru/?no_universal_links=true"],"token_endpoint_auth_method":"none","grant_types":["authorization_code","refresh_token"],"response_types":["code"],"client_uri":"https://web.setka-matrix.ru"}'
```

Redirect URI для Element Web: `https://web.setka-matrix.ru/?no_universal_links=true`

### Локальная разработка

MAS **не принимает localhost** для OAuth. Dev — через пароль или деплой на staging-домен.

## Быстрый старт (dev)

```powershell
cd C:\Users\cekin\Desktop\element-web-develop
pnpm install

cd apps\web
copy config.setka.json config.json
pnpm start
```

Открыть http://127.0.0.1:8080 → войти на Setka → **Настройки → Аккаунт** → блок **«Профиль Setka»**.

## Конфиг

| Файл | Назначение |
|------|------------|
| `config.setka.json` | Шаблон для Setka (в git) |
| `config.json` | Локальный конфиг dev-сервера (gitignore) |

Ключевые опции: `disable_custom_urls`, `brand: "Setka"`, закреплённый HS `matrix.setka-matrix.ru`.

## Setka-специфичный код

- `src/setka/SetkaConfig.ts` — определение Setka homeserver
- `src/setka/SetkaProfileApi.ts` — `GET/PUT /user/{id}/setka_profile`
- `src/setka/SetkaProfileSettings.tsx` — UI профиля (био, цвет, MXC эмодзи)
- Подключение в `UserProfileSettings.tsx` при `isSetkaHomeserver(client)`

## Проверка типов (после install)

```powershell
cd apps\web
pnpm lint:types
```

## Деплой (prod)

1. `pnpm build` в корне или `apps/web`
2. Разложить `webapp/` на хостинг
3. Положить рядом `config.json` из `config.setka.json`

## Дальше (не сделано)

- Брендинг (лого, welcome)
- Пicker эмодзи из Setka Plus (как в Android)
- Вкладка каналов / публичный поиск
- `web.setka-matrix.ru`
