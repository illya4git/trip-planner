// ===================== Практикум 14: локальний сервер планувальника подорожей =====================

// Крок 3: обрано Express, а не чистий модуль http. Він сам розбирає параметри шляху (:code)
// і query-рядок (?name=...), а express.static роздає статичні файли з правильними Content-Type -
// з модулем http усе це, разом із захистом від виходу за межі теки, довелося б писати вручну.
const path = require('path');
const express = require('express');

// Крок 4: спрощена локальна копія кількох країн (заміна REST Countries / countries.dev для
// офлайн-показу). Записи мають ту саму форму, що й відповідь countries.dev у практикумі 9
// (name, capital, population, flags.png), і додаткове поле code - код країни ISO 3166-1 alpha-2.
const countries = require('./data/countries.json');

const PORT = process.env.PORT || 3000;

// Тека клієнтської частини (index.html, css/, js/, assets/) - корінь репозиторію, на рівень вище server/
const CLIENT_DIR = path.join(__dirname, '..');

const app = express();

// ---------- Практикум 15: заголовки безпеки ----------

// Заголовок X-Powered-By: Express лише підказує атакувальнику, яке ПЗ шукати у базах вразливостей
app.disable('x-powered-by');

/**
 * Content Security Policy - другий рубіж захисту від XSS. Навіть якщо в майбутньому хтось
 * вставить дані користувача через innerHTML чи v-html, браузер не виконає вбудовані обробники
 * (onerror="...") та скрипти з чужих доменів - лише файли з цього сервера й Vue з unpkg.
 *   'unsafe-eval' - вимушений виняток: Vue з CDN компілює шаблони з <template> прямо в браузері
 *                   через new Function. Прибрати його можна лише разом із переходом на збірку
 *                   з попередньо скомпільованими шаблонами (Vite + npm).
 *   img-src       - власні зображення та прапори з flagcdn.com (довідка про країни)
 *   connect-src   - fetch лише до власного API
 *   frame-ancestors 'none' - сторінку не можна вбудувати в чужий <iframe> (захист від clickjacking)
 */
const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "script-src 'self' https://unpkg.com 'unsafe-eval'",
    "style-src 'self'",
    "img-src 'self' https://flagcdn.com",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
].join('; ');

app.use((req, res, next) => {
    res.set({
        'Content-Security-Policy': CONTENT_SECURITY_POLICY,
        // Браузер не «вгадує» тип файлу всупереч Content-Type (напр., не виконає JSON як скрипт)
        'X-Content-Type-Options': 'nosniff',
        // Адреса сторінки (з #/trip/...) не передається іншим сайтам, лише origin
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
    next();
});

// ---------- API ----------

/**
 * Крок 5: GET /api/countries - список країн.
 * Необов'язковий query-параметр name - частковий пошук без урахування регістру, як в
 * ендпоінті /name/{name} countries.dev: /api/countries?name=ia поверне Austria, Czechia, Slovakia, Croatia.
 * Завдяки йому пошук на сторінці «Довідка про країни» працює так само, як із зовнішнім API:
 * якщо за назвою нічого не знайдено, сервер, як і countries.dev, відповідає кодом 404.
 */
app.get('/api/countries', (req, res) => {
    const { name } = req.query;

    // Без параметра name - увесь масив
    if (name === undefined) {
        return res.json(countries);
    }

    // ?name= без значення чи повторений параметр (?name=a&name=b стає масивом) - некоректний запит
    if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Параметр name має бути непорожнім рядком' });
    }

    const query = name.trim().toLowerCase();
    const found = countries.filter(country => country.name.toLowerCase().includes(query));

    if (found.length === 0) {
        return res.status(404).json({ error: 'Країну не знайдено' });
    }
    res.json(found);
});

// Крок 6: GET /api/countries/:code - одна країна за кодом (AT, at - регістр не важливий) чи 404
app.get('/api/countries/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const country = countries.find(item => item.code === code);

    if (!country) {
        return res.status(404).json({ error: `Країну з кодом ${code} не знайдено` });
    }
    res.json(country);
});

// Крок 10: будь-який інший шлях під /api (чи інший метод) - JSON-відповідь 404,
// а не стандартна HTML-сторінка Express «Cannot GET ...»
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Ендпоінт не знайдено' });
});

// ---------- Крок 7: статичні файли клієнтської частини ----------

// Роздаються лише теки й файл застосунку, а не весь корінь репозиторію, -
// інакше за адресою /server/server.js браузер отримав би код сервера, а за /.git/... - історію Git.
app.use('/css', express.static(path.join(CLIENT_DIR, 'css')));
app.use('/js', express.static(path.join(CLIENT_DIR, 'js')));
app.use('/assets', express.static(path.join(CLIENT_DIR, 'assets')));

// Головна сторінка. Маршрути SPA (#/trip/3 тощо) живуть після # і на сервер не надсилаються,
// тому для будь-якої сторінки застосунку браузер запитує саме «/»
app.get(['/', '/index.html'], (req, res) => {
    res.sendFile(path.join(CLIENT_DIR, 'index.html'));
});

// Решта адрес поза /api - звичайна текстова відповідь 404
app.use((req, res) => {
    res.status(404).type('text').send('Не знайдено');
});

// Непередбачена помилка в обробнику - 500 без технічних деталей для клієнта, деталі лише в консоль сервера
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
});

// Крок 8: запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущено на http://localhost:${PORT}`);
});