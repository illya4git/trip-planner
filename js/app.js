// ===================== Практикум 10: компонент картки подорожі на Vue 3 =====================

// Крок 1, 10: обрано Vue 3, бо його глобальна CDN-збірка вже містить компілятор шаблонів,
// тож компоненти описуються звичним HTML-шаблоном прямо на сторінці - без Babel, JSX і збірки.

// Мінімальний розумний бюджет на один день подорожі (грн)
const MIN_DAILY_BUDGET = 1000;

// Стрілкова функція для обчислення витрат на день (використовують форма і сторінка подорожі)
const costPerDay = trip => Math.round(trip.budget / trip.days);

// Крок 4: компонент картки подорожі за варіантом 10.
// Отримує всі дані лише через props і не звертається до глобальних змінних.
// Практикум 13: клік по картці більше не обирає подорож на тій самій сторінці, а відкриває
// окрему сторінку #/trip/:id. Для цього назва подорожі стала посиланням data-link, розтягнутим
// стилями на всю картку, тому подію select і проп selected прибрано.
const TripCard = {
    props: {
        id: { type: Number, required: true },
        destination: { type: String, required: true },
        days: { type: Number, required: true },
        budget: { type: Number, required: true },
        image: { type: String, default: '' },
        statusText: { type: String, default: '' },
        statusClass: { type: String, default: '' }
    },
    computed: {
        // Похідне значення варіанта: перераховується автоматично щоразу,
        // коли змінюється budget або days, і ніде окремо не зберігається
        costPerDay() {
            return Math.round(this.budget / this.days);
        },
        // Умовний клас із практикуму 7 (budget або expensive)
        budgetClass() {
            return this.budget <= 15000 ? 'card--budget' : 'card--expensive';
        },
        // Практикум 13: адреса сторінки цієї подорожі
        href() {
            return tripHref(this.id);
        }
    },
    template: `
        <article class="card card--trip"
                 :class="budgetClass"
                 :data-cost-per-day="costPerDay">
            <img v-if="image" :src="image" :alt="destination">
            <div>
                <span class="status" :class="statusClass">{{ statusText }}</span>
                <h3><a class="card__link" :href="href" data-link>{{ destination }}</a></h3>
                <p>{{ days }} днів, {{ budget }} грн</p>
                <p>Бюджет на день: <span class="budget-amount">{{ costPerDay }} грн</span></p>
            </div>
        </article>`
};

// Крок 3: початковий масив подорожей (практикум 6), у якому кожен запис має унікальний id.
// Практикум 13: масив більше не живе в data() Vue-застосунку - під час створення сховища trips
// його записи переносяться в IndexedDB (див. openDB), а сторінки читають подорожі вже звідти.
const DEFAULT_TRIPS = [
    {
        id: 1,
        destination: 'Відень',
        days: 7,
        budget: 23000,
        image: 'assets/img/vienna.jpg',
        statusText: 'Поточна',
        statusClass: 'status--active'
    },
    {
        id: 2,
        destination: 'Будапешт',
        days: 3,
        budget: 5000,
        image: 'assets/img/budapest.jpg',
        statusText: 'Минула',
        statusClass: 'status--past'
    },
    {
        id: 3,
        destination: 'Прага',
        days: 10,
        budget: 15000,
        image: 'assets/img/prague.jpg',
        statusText: 'Заплановано',
        statusClass: 'status--planned'
    }
];

// Універсальна функція рендеру масиву (практикум 7, узагальнена в практикумі 9).
// Після практикуму 10 нею користується лише довідка про країни.
function renderList(container, items, createItem) {
    // Практикум 15, крок 5: очищення через replaceChildren() замість innerHTML = ''.
    // Рядок був безпечним (порожній рядок, без даних), але тепер у застосунку не лишилося
    // жодного запису в innerHTML, тож майбутній пошук «innerHTML» одразу покаже нове вразливе місце
    container.replaceChildren();

    items.forEach((item, index) => {
        container.append(createItem(item, index));
    });
}

// Крок 7: ручний DOM-рендер подорожей видалено - його замінено компонентом TripCard.
// Прибрано функції createTripCard, renderTrips і showTripDetails, програмне видалення
// заглушки .static-placeholder та делегований обробник кліку по #trips-list (практикуми 7-8):
// список і лічильник тепер рендерить Vue з реактивного стану.
// Практикум 13: Vue-застосунок tripsApp розділено на сторінки HomePage і TripPage (див. блок практикуму 13).


// ===================== Практикум 8: форма та події =====================

// Практикум 13: форма тепер входить до сторінки «/», яка створюється заново під час кожного
// переходу на неї. Тому обробники загорнуто у функцію - view головної сторінки викликає її
// для щойно відрендереної форми. onSubmit отримує нову подорож і повертає Promise<boolean>:
// true, якщо подорож збережено (тоді форма очищується).
function setupTripForm(form, onSubmit) {
    // Крок 2: Вибір полів форми (у межах переданої форми, а не всього документа)
    const destinationInput = form.elements.destination;
    const daysInput = form.elements.days;
    const budgetInput = form.elements.budget;
    const costPreview = form.querySelector('#cost-preview');
    const costWarning = form.querySelector('#cost-warning');
    const submitButton = form.querySelector('button[type="submit"]');

    // Повідомлення замість стандартного, якщо в полі напрямку лише пробіли
    destinationInput.addEventListener('input', () => {
        if (destinationInput.validity.patternMismatch) {
            destinationInput.setCustomValidity('Напрямок не може складатися лише з пробілів');
        } else {
            destinationInput.setCustomValidity('');
        }
    });

    // Крок 8: Перерахунок costPerDay «на льоту» та попередження про замалий бюджет
    function updateCostPreview() {
        const days = Number(daysInput.value);
        const budget = Number(budgetInput.value);

        // Поки одне з полів порожнє чи некоректне - розрахунок не показуємо
        if (daysInput.value === '' || budgetInput.value === '' || days < 1 || budget < 0) {
            costPreview.textContent = '—';
            costWarning.textContent = '';
            return;
        }

        const dailyCost = costPerDay({ days, budget });
        costPreview.textContent = `${dailyCost} грн`;

        // Попередження не блокує надсилання форми - це лише підказка користувачу
        if (dailyCost < MIN_DAILY_BUDGET) {
            costWarning.textContent =
                `Увага: ${dailyCost} грн на день - менше за рекомендовані ${MIN_DAILY_BUDGET} грн. ` +
                'Цього може не вистачити на проживання та харчування.';
        } else {
            costWarning.textContent = '';
        }
    }

    // Обидва поля впливають на результат, тому слухаємо input на кожному з них
    daysInput.addEventListener('input', updateCostPreview);
    budgetInput.addEventListener('input', updateCostPreview);

    // Обробник надсилання форми: додає нову подорож без перезавантаження сторінки
    form.addEventListener('submit', async event => {
        // Крок 3: Скасування стандартної поведінки (перезавантаження сторінки)
        event.preventDefault();

        // Крок 4: Зчитування значень полів, числові поля приводимо до Number
        const destination = destinationInput.value.trim();
        const days = Number(daysInput.value);
        const budget = Number(budgetInput.value);

        // Крок 5: Новий об'єкт тієї самої форми, що й записи сховища trips (id видасть IndexedDB)
        const newTrip = {
            destination,
            days,
            budget,
            image: '',
            statusText: 'Заплановано',
            statusClass: 'status--planned'
        };

        // Крок 6: Збереження подорожі. Практикум 13: запис іде в IndexedDB, а список
        // перемальовує сторінка HomePage; поки триває запис, повторне надсилання заблоковане
        submitButton.disabled = true;
        const saved = await onSubmit(newTrip);
        submitButton.disabled = false;

        // Крок 7: Очищення форми та розрахунку лише після успішного збереження
        if (saved) {
            form.reset();
            updateCostPreview();
        }
    });
}

// ===================== Практикум 9: клієнт для API довідки про країни =====================

// Крок 3: базова адреса ендпоінта винесена в константу на початку блоку.
// REST Countries v3.1 з методички більше не працює без ключа (версію виведено з експлуатації),
// тому спершу використовувався відкритий аналог countries.dev з ендпоінтом /name/{name}.
// Практикум 14, крок 9: запит іде на власний локальний сервер (server/server.js) - ендпоінт
// /api/countries з пошуком за назвою в query-параметрі name. Адреса відносна, бо сторінку
// роздає той самий сервер (один origin, без CORS). Решта коду запиту й рендеру - без змін.
const COUNTRIES_API_URL = '/api/countries?name=';
const DEFAULT_COUNTRY = 'Austria';

// Повідомлення для користувача (технічні деталі йдуть лише в консоль)
const COUNTRY_NOT_FOUND_MESSAGE = 'Країну не знайдено, перевірте написання';
const COUNTRY_SERVER_ERROR_MESSAGE = 'Сервіс довідки тимчасово недоступний. Спробуйте пізніше.';
// Практикум 14: дані тепер віддає локальний сервер, тож мережевий збій означає, що він не запущений
const COUNTRY_NETWORK_ERROR_MESSAGE =
    'Не вдалося з\'єднатися з сервером довідки. Переконайтеся, що сервер запущено, і натисніть «Оновити».';

// Останній виконаний запит - його повторює кнопка «Оновити».
// Практикум 13: змінна лишилася поза сторінкою, тож після повернення на #/countries
// показується та сама країна, яку користувач шукав востаннє
let lastCountryQuery = DEFAULT_COUNTRY;

// Крок 6: зіставлення об'єкта відповіді API з формою власного об'єкта застосунку.
// На відміну від REST Countries v3.1, countries.dev повертає «пласку» структуру:
// name і capital - звичайні рядки, а не вкладений об'єкт і масив.
// Практикум 14: локальний сервер віддає записи в тій самій формі, тому функція не змінилася.
const toCountry = apiCountry => ({
    name: apiCountry.name,
    // У деяких територій (напр. Антарктида) столиці немає
    capital: apiCountry.capital || 'немає',
    population: apiCountry.population ?? 0,
    flag: apiCountry.flags?.png || '',
    flagAlt: `Прапор: ${apiCountry.name}`
});

// Створення картки країни - передається у спільну функцію renderList
function createCountryCard(country) {
    const card = document.createElement('article');
    card.classList.add('card', 'card--country');

    const contentWrapper = document.createElement('div');

    const title = document.createElement('h3');
    title.textContent = country.name;

    const capital = document.createElement('p');
    capital.textContent = `Столиця: ${country.capital}`;

    const population = document.createElement('p');
    population.textContent = `Населення: ${country.population.toLocaleString('uk-UA')} осіб`;

    contentWrapper.append(title, capital, population);

    // Прапор додається лише тоді, коли API повернуло посилання на зображення
    if (country.flag) {
        const img = document.createElement('img');
        img.src = country.flag;
        img.alt = country.flagAlt;
        card.append(img);
    }
    card.append(contentWrapper);

    return card;
}

/**
 * Практикум 13: секція довідки рендериться заново під час кожного переходу на #/countries,
 * тому пошук елементів і підключення обробників загорнуто у функцію, яку викликає
 * view-функція сторінки. Логіка запиту, стану завантаження й помилок - без змін.
 */
function setupCountryLookup(section) {
    const countryForm = section.querySelector('#country-form');
    const countryInput = section.querySelector('#country-query');
    const countryRefreshButton = section.querySelector('#country-refresh');
    const countrySubmitButton = countryForm.querySelector('button[type="submit"]');
    const countryLoading = section.querySelector('#country-loading');
    const countryError = section.querySelector('#country-error');
    const countryCount = section.querySelector('#country-count');
    const countryList = section.querySelector('#country-list');

    function renderCountries(countries) {
        renderList(countryList, countries, createCountryCard);
        countryCount.textContent = countries.length > 0 ? `Знайдено країн: ${countries.length}` : '';
    }

    // Крок 7: видима ознака завантаження - текст, aria-busy та заблоковані кнопки
    function showLoading(isLoading) {
        countryLoading.textContent = isLoading ? 'Завантаження…' : '';
        countryList.setAttribute('aria-busy', String(isLoading));
        countrySubmitButton.disabled = isLoading;
        countryRefreshButton.disabled = isLoading;
    }

    function showError(message) {
        countryError.textContent = message;
    }

    /**
     * Кроки 2-8: завантаження даних про країну за назвою.
     * Практикум 14: API - локальний сервер (server/server.js), ендпоінт GET /api/countries?name={name}.
     * Він повторює поведінку countries.dev (https://countries.dev/docs/api/name), що використовувався
     * в практикумі 9: пошук частковий і без урахування регістру (за запитом "ia" - Austria, Czechia,
     * Slovakia, Croatia), а на невідому назву сервер відповідає кодом 404 з JSON { error: "Країну не знайдено" }.
     */
    async function loadCountry(query) {
        lastCountryQuery = query;
        showError('');
        showLoading(true);

        try {
            // Крок 3: запит і очікування відповіді; назву кодуємо, бо в ній можуть бути пробіли
            const response = await fetch(COUNTRIES_API_URL + encodeURIComponent(query));

            // Крок 4: fetch не вважає 404/500 помилкою, тому статус перевіряємо вручну
            if (!response.ok) {
                const error = new Error(`Сервер довідки відповів кодом ${response.status}`);
                error.status = response.status;
                throw error;
            }

            // Крок 5: розбір тіла відповіді як JSON
            const data = await response.json();
            console.log(data);

            // Додатковий захист: порожній масив теж означає «нічого не знайдено»
            if (!Array.isArray(data) || data.length === 0) {
                const error = new Error('Сервер довідки повернув порожній результат');
                error.status = 404;
                throw error;
            }

            // Крок 6: виведення в DOM через спільну функцію рендеру
            renderCountries(data.map(toCountry));
        } catch (error) {
            // Крок 8: зрозуміле повідомлення користувачу + деталі для розробника
            let message;
            if (error.status === 404) {
                message = COUNTRY_NOT_FOUND_MESSAGE;
            } else if (error.status) {
                message = COUNTRY_SERVER_ERROR_MESSAGE;
            } else {
                // fetch відхиляє Promise (TypeError), коли запит не дійшов до сервера
                message = COUNTRY_NETWORK_ERROR_MESSAGE;
            }

            renderCountries([]); // Прибираємо застарілі результати попереднього запиту
            showError(message);
            console.error(error);
        } finally {
            // Крок 7: стан завантаження зникає і за успіху, і за помилки
            showLoading(false);
        }
    }

    // Повідомлення замість стандартного, якщо в полі лише пробіли (як у формі практикуму 8)
    countryInput.addEventListener('input', () => {
        if (countryInput.validity.patternMismatch) {
            countryInput.setCustomValidity('Назва країни не може складатися лише з пробілів');
        } else {
            countryInput.setCustomValidity('');
        }
    });

    // Пошук за назвою, введеною користувачем
    countryForm.addEventListener('submit', event => {
        event.preventDefault();
        loadCountry(countryInput.value.trim());
    });

    // Крок 10: повторний запит після збою без перезавантаження сторінки
    countryRefreshButton.addEventListener('click', () => {
        loadCountry(lastCountryQuery);
    });

    // Перше завантаження при відкритті сторінки - останній запит (спочатку Austria)
    countryInput.value = lastCountryQuery;
    loadCountry(lastCountryQuery);
}

// ===================== Практикум 11: маршрут подорожі в IndexedDB =====================

// Крок 1: модель даних варіанта 10 - пункт маршруту (зупинка):
// {
//     id: number,        // унікальний ідентифікатор, Date.now() у момент створення; далі не змінюється
//     tripId: number,    // практикум 13: id подорожі, до якої належить зупинка
//     country: string,   // країна
//     city: string,      // місто
//     dateFrom: string,  // дата прибуття у форматі 'YYYY-MM-DD' (значення input type="date")
//     dateTo: string,    // дата від'їзду у тому ж форматі
//     notes: string      // необов'язкові нотатки
// }
// Дати зберігаються рядками ISO, тож їх можна порівнювати як звичайні рядки.
//
// Практикум 13: подорож (раніше жила лише в data() Vue-застосунку) теж зберігається в IndexedDB:
// { id, destination, days, budget, image, statusText, statusClass } - як у DEFAULT_TRIPS.

// Ключ, під яким маршрут зберігався в localStorage (кроки 2-4), і прапорець міграції (крок 8).
// Практикум 15, крок 6: після міграції запис tripStops видаляється - див. migrateFromLocalStorage
const STOPS_STORAGE_KEY = 'tripStops';
const MIGRATION_FLAG_KEY = 'tripStopsMigrated';

// Крок 5: схема IndexedDB - одна база, сховище зупинок із ключем id.
// Практикум 13: версію піднято до 2 - додано сховище подорожей trips та індекс зупинок за tripId
const DB_NAME = 'TripPlannerDB';
const DB_VERSION = 2;
const STOPS_STORE = 'tripStops';
const TRIPS_STORE = 'trips';
const STOPS_BY_TRIP_INDEX = 'tripId';

// Практикум 13: зупинки, створені до появи поля tripId, приписуються подорожі «Прага» (id 3) -
// з Праги починається маршрут, складений у практикумах 11-12
const LEGACY_TRIP_ID = 3;

// Повідомлення для користувача (технічні деталі йдуть лише в консоль)
const DB_OPEN_ERROR_MESSAGE =
    'Не вдалося відкрити сховище браузера, тому маршрут не буде збережено. ' +
    'Можливо, увімкнено режим приватного перегляду або збереження даних сайтів заборонене в налаштуваннях.';
const DB_READ_ERROR_MESSAGE = 'Не вдалося прочитати маршрут зі сховища браузера. Перезавантажте сторінку.';
const DB_WRITE_ERROR_MESSAGE = 'Не вдалося зберегти зміни маршруту. Спробуйте ще раз.';
const TRIP_WRITE_ERROR_MESSAGE = 'Не вдалося зберегти подорож. Спробуйте ще раз.';

// Крок 2: читання маршруту, збереженого в localStorage до переходу на IndexedDB.
// Після кроку 9 функція потрібна лише як джерело одноразової міграції (крок 8).
function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem(STOPS_STORAGE_KEY);
        const stops = raw ? JSON.parse(raw) : [];
        return Array.isArray(stops) ? stops : [];
    } catch (error) {
        console.error('Пошкоджені дані маршруту в localStorage:', error);
        return [];
    }
}

// Відкрите з'єднання кешується: база відкривається один раз, а CRUD-функції лише чекають на той самий Promise
let dbPromise = null;

/**
 * Крок 6: відкриття бази TripPlannerDB. Якщо бази ще немає або її версія нижча за DB_VERSION,
 * спершу спрацьовує onupgradeneeded - лише там можна створювати сховища та індекси.
 * Зміни схеми застосовуються по черзі від поточної версії бази до DB_VERSION, тож
 * і нова база, і база з практикуму 11 (версія 1) приходять до однакового стану.
 * Повертає Promise з об'єктом IDBDatabase.
 */
function openDB() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            // Крок 11: у браузері без IndexedDB одразу відхиляємо Promise
            if (!window.indexedDB) {
                reject(new Error('IndexedDB недоступна в цьому браузері'));
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = event => {
                const db = request.result;

                // Версія 1 (практикум 11): сховище зупинок
                if (event.oldVersion < 1) {
                    db.createObjectStore(STOPS_STORE, { keyPath: 'id' });
                }

                // Версія 2 (практикум 13): сторінка #/trip/:id має знаходити подорож за id навіть після
                // перезавантаження, тому подорожі переїхали в окреме сховище. autoIncrement видає id
                // новим подорожам; початкові записи мають власні id 1-3, і лічильник продовжить з 4
                if (event.oldVersion < 2) {
                    const tripsStore = db.createObjectStore(TRIPS_STORE, { keyPath: 'id', autoIncrement: true });
                    DEFAULT_TRIPS.forEach(trip => tripsStore.add(trip));

                    // Індекс за tripId дає змогу вибрати зупинки однієї подорожі без перебору всього сховища
                    const stopsStore = request.transaction.objectStore(STOPS_STORE);
                    stopsStore.createIndex(STOPS_BY_TRIP_INDEX, 'tripId');

                    // Наявні зупинки без tripId отримують LEGACY_TRIP_ID у тій самій транзакції оновлення
                    stopsStore.openCursor().onsuccess = cursorEvent => {
                        const cursor = cursorEvent.target.result;
                        if (!cursor) return;
                        if (cursor.value.tripId === undefined) {
                            cursor.update({ ...cursor.value, tripId: LEGACY_TRIP_ID });
                        }
                        cursor.continue();
                    };
                }
            };

            request.onsuccess = () => {
                const db = request.result;
                // Якщо в іншій вкладці відкрилася новіша версія застосунку, з'єднання закривається,
                // щоб не блокувати її оновлення; наступний виклик openDB відкриє базу заново
                db.onversionchange = () => {
                    db.close();
                    dbPromise = null;
                };
                resolve(db);
            };
            request.onerror = () => reject(request.error);
        });

        // Після невдачі скидаємо кеш, щоб наступний виклик спробував відкрити базу заново
        dbPromise.catch(() => {
            dbPromise = null;
        });
    }
    return dbPromise;
}

/**
 * Практикум 13: спільна обгортка для одного запиту в транзакції. makeRequest отримує
 * об'єктне сховище й повертає IDBRequest; Promise виконується його результатом лише після
 * oncomplete транзакції, тобто коли дані вже точно записані. CRUD-функції практикуму 11
 * переписано через неї, бо такі самі операції знадобилися й для другого сховища - trips.
 */
async function runRequest(storeName, mode, makeRequest) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const request = makeRequest(tx.objectStore(storeName));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error); // напр., QuotaExceededError скасовує транзакцію
    });
}

// Крок 7 (Create): додавання нової зупинки в транзакції readwrite.
// put() створює новий запис або замінює наявний з тим самим id
function addItem(stop) {
    return runRequest(STOPS_STORE, 'readwrite', store => store.put(stop));
}

// Крок 7 (Update): оновлення зупинки - put із тим самим id замінює запис, а не створює дублікат
function updateItem(stop) {
    return runRequest(STOPS_STORE, 'readwrite', store => store.put(stop));
}

// Крок 7 (Read): усі зупинки в транзакції readonly; getAll() повертає їх у порядку ключа id
function getAllItems() {
    return runRequest(STOPS_STORE, 'readonly', store => store.getAll());
}

// Крок 7 (Delete): видалення зупинки за ключем id в транзакції readwrite
function deleteItem(id) {
    return runRequest(STOPS_STORE, 'readwrite', store => store.delete(id));
}

// Практикум 13: зупинки однієї подорожі - вибірка через індекс tripId
function getStopsByTrip(tripId) {
    return runRequest(STOPS_STORE, 'readonly', store => store.index(STOPS_BY_TRIP_INDEX).getAll(tripId));
}

// Практикум 13: операції зі сховищем подорожей
function getAllTrips() {
    return runRequest(TRIPS_STORE, 'readonly', store => store.getAll());
}

// Повертає подорож або undefined, якщо запису з таким id немає
function getTrip(id) {
    return runRequest(TRIPS_STORE, 'readonly', store => store.get(id));
}

// add() без id - IndexedDB сама видає наступний ключ і повертає його
function addTrip(trip) {
    return runRequest(TRIPS_STORE, 'readwrite', store => store.add(trip));
}

function updateTrip(trip) {
    return runRequest(TRIPS_STORE, 'readwrite', store => store.put(trip));
}

/**
 * Крок 8: одноразове перенесення маршруту з localStorage в IndexedDB.
 * Дані переносяться, лише якщо сховище tripStops порожнє, а в localStorage щось є.
 * Після першого запуску ставиться прапорець tripStopsMigrated=true, і перевірка більше не виконується.
 * Повертає кількість перенесених зупинок.
 *
 * Практикум 15, крок 6: у практикумі 11 старий запис tripStops лишався в localStorage
 * «резервною копією». Насправді це була застаріла копія маршруту разом із нотатками: зміни
 * й видалення в застосунку її не торкалися, тож видалена користувачем нотатка (напр., з номером
 * документа) назавжди лишалася у відкритому вигляді, доступному будь-якому скрипту сторінки.
 * Тепер запис видаляється одразу після успішної міграції, а в браузерах, де міграцію вже
 * виконано раніше, - під час наступного запуску.
 */
async function migrateFromLocalStorage() {
    if (localStorage.getItem(MIGRATION_FLAG_KEY) === 'true') {
        localStorage.removeItem(STOPS_STORAGE_KEY);
        return 0;
    }

    const existingStops = await getAllItems();
    const legacyStops = loadFromLocalStorage();
    let migratedCount = 0;

    if (existingStops.length === 0 && legacyStops.length > 0) {
        for (const stop of legacyStops) {
            // Практикум 13: у localStorage зупинки зберігалися без прив'язки до подорожі
            await addItem({ ...stop, tripId: stop.tripId ?? LEGACY_TRIP_ID });
            migratedCount++;
        }
    }

    // Прапорець ставимо лише після успішного перенесення всіх записів; лише тоді ж видаляємо
    // старий запис - якщо перенесення перерветься помилкою, дані в localStorage не загубляться
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    localStorage.removeItem(STOPS_STORAGE_KEY);
    return migratedCount;
}

/**
 * Підготовка сховища під час запуску застосунку: відкриття бази (з оновленням схеми)
 * і міграція з localStorage. Практикум 13: раніше це робив mounted() застосунку маршруту,
 * але тепер маршрут монтується під час кожного відкриття сторінки подорожі, а міграція
 * має виконатися один раз - до першого рендеру будь-якої сторінки.
 * Помилки лише записуються в консоль: сторінки самі покажуть повідомлення, якщо база недоступна.
 */
async function prepareStorage() {
    try {
        await openDB();
    } catch (error) {
        console.error('Помилка відкриття IndexedDB:', error);
        return;
    }

    // Збій міграції (напр., заблокований localStorage) не повинен блокувати роботу з IndexedDB
    try {
        const migratedCount = await migrateFromLocalStorage();
        if (migratedCount > 0) {
            console.info(`Перенесено з localStorage в IndexedDB зупинок: ${migratedCount}`);
        }
    } catch (error) {
        console.error('Міграцію маршруту з localStorage не виконано:', error);
    }
}

// Порожній стан форми зупинки
const emptyStopForm = () => ({ country: '', city: '', dateFrom: '', dateTo: '', notes: '' });

// 'YYYY-MM-DD' -> 'DD.MM.YYYY' без об'єкта Date, щоб часовий пояс не зсунув день
const formatDate = isoDate => isoDate.split('-').reverse().join('.');

// Сценарій варіанта: маршрут показується відсортованим за dateFrom (за однакових - за dateTo)
const byDateFrom = (a, b) => a.dateFrom.localeCompare(b.dateFrom) || a.dateTo.localeCompare(b.dateTo);

// Практикум 13: окремий Vue-застосунок routeApp став компонентом TripRoute. Він показує маршрут
// лише однієї подорожі (проп tripId) і монтується всередині сторінки #/trip/:id
const TripRoute = {
    props: {
        tripId: { type: Number, required: true }
    },
    template: '#trip-route-template',
    data() {
        return {
            // Крок 9: стартує порожнім - дані надходять асинхронно з IndexedDB у mounted()
            stops: [],
            form: emptyStopForm(),
            editingId: null,      // id зупинки, яку зараз редагують, або null
            storageReady: false,  // true після успішного openDB()
            loading: true,
            saving: false,
            error: '',
            mapPlaying: false     // практикум 12: чи відтворюється анімація міні-карти
        };
    },
    computed: {
        // Сортування виконується на клієнті над масивом, отриманим через getStopsByTrip
        sortedStops() {
            return [...this.stops].sort(byDateFrom);
        },
        isEditing() {
            return this.editingId !== null;
        }
    },
    // Практикум 12, крок 6: будь-яка зміна маршруту (додавання, редагування, видалення)
    // одразу передається міні-карті - вона перемальовується з новими даними
    watch: {
        sortedStops(stops) {
            this.routeMap.setStops(stops);
        }
    },
    async mounted() {
        // Практикум 12: Canvas існує лише після того, як Vue відрендерив шаблон, тому карту
        // створюємо тут, через $refs. routeMap не оголошено в data(), щоб Vue не робив його реактивним
        this.routeMap = createRouteMap(this.$refs.routeCanvas);
        this.routeMap.setStops([]);
        this.mapPlaying = this.routeMap.isPlaying();

        // Крок 11: зрозуміле повідомлення, якщо базу не вдалося відкрити
        try {
            await openDB();
            this.storageReady = true;
        } catch (error) {
            this.error = DB_OPEN_ERROR_MESSAGE;
            console.error('Помилка відкриття IndexedDB:', error);
            this.loading = false;
            return;
        }

        // Міграцію з localStorage перенесено в prepareStorage() (практикум 13)
        await this.loadStops();
        this.loading = false;
    },
    methods: {
        formatDate,
        // Практикум 13: адреса сторінки деталей зупинки
        stopLink(stop) {
            return stopHref(this.tripId, stop.id);
        },
        // Крок 9: єдине джерело даних списку - IndexedDB; викликається після кожної CRUD-операції.
        // Практикум 13: читаються лише зупинки поточної подорожі
        async loadStops() {
            try {
                this.stops = await getStopsByTrip(this.tripId);
            } catch (error) {
                this.error = DB_READ_ERROR_MESSAGE;
                console.error(error);
            }
        },
        // Додавання нової зупинки (addItem) або збереження змін у редагованій (updateItem)
        async submitStop() {
            // Звичайний об'єкт, а не реактивний Proxy Vue: IndexedDB не вміє клонувати Proxy
            const stop = {
                id: this.editingId ?? Date.now(),
                tripId: this.tripId, // практикум 13: зупинка належить подорожі, сторінку якої відкрито
                country: this.form.country.trim(),
                city: this.form.city.trim(),
                dateFrom: this.form.dateFrom,
                dateTo: this.form.dateTo,
                notes: this.form.notes.trim()
            };

            this.saving = true;
            this.error = '';
            try {
                if (this.isEditing) {
                    await updateItem(stop);
                } else {
                    await addItem(stop);
                }
                this.resetForm();
                await this.loadStops();
            } catch (error) {
                this.error = DB_WRITE_ERROR_MESSAGE;
                console.error(error);
            } finally {
                this.saving = false;
            }
        },
        // Заповнення форми даними зупинки для редагування
        startEdit(stop) {
            this.editingId = stop.id;
            this.form = {
                country: stop.country,
                city: stop.city,
                dateFrom: stop.dateFrom,
                dateTo: stop.dateTo,
                notes: stop.notes
            };
            this.$refs.stopForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
        // form.reset() додатково знімає з полів стан :user-invalid після успішного надсилання
        resetForm() {
            this.$refs.stopForm.reset();
            this.editingId = null;
            this.form = emptyStopForm();
        },
        async removeStop(id) {
            this.error = '';
            try {
                await deleteItem(id);
                if (this.editingId === id) {
                    this.resetForm();
                }
                await this.loadStops();
            } catch (error) {
                this.error = DB_WRITE_ERROR_MESSAGE;
                console.error(error);
            }
        },
        // Власне повідомлення, якщо в текстовому полі лише пробіли (як у формі практикуму 8)
        checkBlank(event, message) {
            const input = event.target;
            input.setCustomValidity('');
            if (input.validity.patternMismatch) {
                input.setCustomValidity(message);
            }
        },
        // Практикум 12, крок 7: кнопка старт/стоп анімації міні-карти
        toggleMap() {
            if (this.routeMap.isPlaying()) {
                this.routeMap.pause();
            } else {
                this.routeMap.play();
            }
            this.mapPlaying = this.routeMap.isPlaying();
        }
    },
    // Практикум 12, крок 8: коли компонент демонтують, цикл анімації зупиняється.
    // Практикум 13: це відбувається під час кожного переходу зі сторінки подорожі на іншу
    unmounted() {
        this.routeMap.destroy();
    }
};


// ===================== Практикум 12: міні-карта маршруту на Canvas =====================

// Крок 1: за варіантом 10 обрано Canvas - кількість зупинок наперед невідома,
// а лінію маршруту й точки неможливо зібрати з готових DOM-елементів.

// Логічний розмір поверхні малювання - збігається з атрибутами width/height у розмітці
const MAP_WIDTH = 640;
const MAP_HEIGHT = 260;
const MAP_PADDING_X = 60;      // відступ крайніх зупинок від країв полотна
const MAP_ROW_TOP = 100;       // висота «верхніх» зупинок ламаної
const MAP_ROW_BOTTOM = 170;    // висота «нижніх» зупинок ламаної
const ROUTE_DRAW_SPEED = 260;  // швидкість «прокладання» лінії маршруту, px/с
const MARKER_SPEED = 90;       // швидкість маркера-мандрівника, px/с
const MAX_FRAME_TIME = 0.05;   // найбільший крок часу (с), щоб після паузи маркер не «стрибав»
const DAY_MS = 24 * 60 * 60 * 1000;

// Палітра узгоджена з рештою сторінки (style.css)
const MAP_COLORS = {
    grid: 'rgba(38, 70, 83, 0.08)',
    routeGhost: 'rgba(38, 70, 83, 0.25)',
    route: '#1f7a6f',
    point: '#1f7a6f',
    pointPending: '#9bb8b3',
    pointText: '#ffffff',
    label: '#264653',
    dates: '#4a5a60',
    marker: '#e9c46a',
    markerStroke: '#b5462a'
};

// Кількість днів зупинки: дати розбираються як UTC, щоб часовий пояс не зсунув результат
const stayDays = stop => Math.round((Date.parse(stop.dateTo) - Date.parse(stop.dateFrom)) / DAY_MS) + 1;

// Короткий запис дати для підпису на карті: 'YYYY-MM-DD' -> 'DD.MM'
const shortDate = isoDate => isoDate.split('-').reverse().slice(0, 2).join('.');

// «Підпис» маршруту: змінюється лише тоді, коли змінився склад, порядок чи дати зупинок,
// але не тоді, коли відредаговано лише нотатки
const routeSignature = stops =>
    stops.map(stop => `${stop.id}|${stop.city}|${stop.dateFrom}|${stop.dateTo}`).join(';');

/**
 * Крок 4: перетворення масиву зупинок (уже відсортованого за dateFrom) на точки карти.
 * Зупинки розташовуються рівномірно по горизонталі в порядку відвідування, а по вертикалі
 * чергуються, утворюючи ламану. Радіус точки залежить від тривалості зупинки (1-8+ днів).
 */
function toMapPoints(stops) {
    const step = stops.length > 1 ? (MAP_WIDTH - 2 * MAP_PADDING_X) / (stops.length - 1) : 0;

    return stops.map((stop, index) => {
        const isTop = index % 2 === 0;
        return {
            x: stops.length > 1 ? MAP_PADDING_X + index * step : MAP_WIDTH / 2,
            y: stops.length > 1 ? (isTop ? MAP_ROW_TOP : MAP_ROW_BOTTOM) : (MAP_ROW_TOP + MAP_ROW_BOTTOM) / 2,
            radius: 8 + Math.min(stayDays(stop), 8),
            number: index + 1,
            city: stop.city,
            dates: `${shortDate(stop.dateFrom)}–${shortDate(stop.dateTo)}`,
            isTop,
            // Ширина, до якої стискається підпис, щоб він не наліз на сусідній підпис того ж ряду
            labelWidth: stops.length > 1 ? Math.min(150, 2 * step - 10) : 200
        };
    });
}

// Довжини відрізків ламаної та відстань від початку маршруту до кожної точки
function measureRoute(points) {
    const offsets = [0];
    for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;
        offsets.push(offsets[i - 1] + Math.hypot(dx, dy));
    }
    return { offsets, total: offsets[offsets.length - 1] || 0 };
}

// Координати точки на ламаній на відстані distance від першої зупинки
function pointAtDistance(points, offsets, distance) {
    for (let i = 1; i < points.length; i++) {
        if (distance <= offsets[i]) {
            const t = (distance - offsets[i - 1]) / (offsets[i] - offsets[i - 1]);
            return {
                x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
                y: points[i - 1].y + (points[i].y - points[i - 1].y) * t
            };
        }
    }
    return points[points.length - 1];
}

/**
 * Міні-карта маршруту на Canvas.
 * Кроки 3, 5, 7, 8: отримує 2D-контекст, веде цикл requestAnimationFrame
 * (спершу лінія маршруту «прокладається» від першої зупинки до останньої, потім уздовж неї
 * безперервно рухається маркер-мандрівник), дозволяє зупиняти й запускати анімацію
 * і скасовує кадр через cancelAnimationFrame, коли анімація не потрібна.
 * Повертає об'єкт з методами setStops, play, pause, isPlaying, destroy.
 */
function createRouteMap(canvas) {
    // Крок 3: 2D-контекст. Буфер полотна збільшується відповідно до щільності пікселів екрана,
    // а ctx.scale дає змогу й далі малювати в логічних координатах 640×260 - так текст не розмитий
    const ctx = canvas.getContext('2d');
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = MAP_WIDTH * pixelRatio;
    canvas.height = MAP_HEIGHT * pixelRatio;
    ctx.scale(pixelRatio, pixelRatio);

    // Користувачам, які вимкнули анімації в системі, карта показується одразу статичною
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let stops = [];
    let points = [];
    let route = { offsets: [0], total: 0 };
    let signature = '';
    let drawnLength = 0;       // яку частину маршруту вже «прокладено», px
    let markerDistance = 0;    // де зараз маркер-мандрівник, px від першої зупинки
    let wantsToPlay = !reduceMotion; // бажання користувача (кнопка старт/стоп)
    let isVisible = true;      // чи видно полотно на екрані
    let frameId = null;        // id запланованого кадру для cancelAnimationFrame
    let lastTime = null;       // мітка часу попереднього кадру

    // ---------- Крок 4: малювання поточного стану ----------

    // Легка «картографічна» сітка на тлі
    function drawGrid() {
        ctx.strokeStyle = MAP_COLORS.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 20; x < MAP_WIDTH; x += 40) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, MAP_HEIGHT);
        }
        for (let y = 20; y < MAP_HEIGHT; y += 40) {
            ctx.moveTo(0, y);
            ctx.lineTo(MAP_WIDTH, y);
        }
        ctx.stroke();
    }

    // Зведення над картою: кількість зупинок і загальна тривалість подорожі
    function drawSummary() {
        const firstDate = stops[0].dateFrom;
        const lastDate = stops.reduce((max, stop) => (stop.dateTo > max ? stop.dateTo : max), stops[0].dateTo);
        const totalDays = stayDays({ dateFrom: firstDate, dateTo: lastDate });

        ctx.fillStyle = MAP_COLORS.label;
        ctx.font = '600 13px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(`Зупинок: ${stops.length} · Днів у дорозі: ${totalDays}`, 16, 24);
    }

    // Ламана від першої до останньої зупинки; якщо limit задано - лише перші limit px
    function strokeRoute(limit) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            if (route.offsets[i] <= limit) {
                ctx.lineTo(points[i].x, points[i].y);
            } else {
                const end = pointAtDistance(points, route.offsets, limit);
                ctx.lineTo(end.x, end.y);
                break;
            }
        }
        ctx.stroke();
    }

    function drawRoute() {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Увесь маршрут блідим пунктиром - «план» подорожі
        ctx.save();
        ctx.setLineDash([6, 8]);
        ctx.strokeStyle = MAP_COLORS.routeGhost;
        ctx.lineWidth = 2;
        strokeRoute(route.total);
        ctx.restore();

        // Поверх нього - суцільна лінія, яка «прокладається» анімацією
        ctx.strokeStyle = MAP_COLORS.route;
        ctx.lineWidth = 4;
        strokeRoute(drawnLength);
    }

    function drawPoint(point, index) {
        // Зупинка «з'являється», щойно до неї дійшла лінія маршруту
        const reached = route.offsets[index] <= drawnLength;

        ctx.beginPath();
        ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        ctx.fillStyle = reached ? MAP_COLORS.point : MAP_COLORS.pointPending;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Номер зупинки - як у мітці «Зупинка N» на картці під картою
        ctx.fillStyle = MAP_COLORS.pointText;
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(point.number), point.x, point.y + 1);

        // Підпис: над верхніми точками і під нижніми, щоб не перетинати лінію
        const cityY = point.isTop ? point.y - point.radius - 22 : point.y + point.radius + 18;
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = MAP_COLORS.label;
        ctx.font = '600 13px system-ui, sans-serif';
        ctx.fillText(point.city, point.x, cityY, point.labelWidth);
        ctx.fillStyle = MAP_COLORS.dates;
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillText(point.dates, point.x, cityY + 14, point.labelWidth);
    }

    function drawMarker() {
        const position = pointAtDistance(points, route.offsets, markerDistance);
        ctx.beginPath();
        ctx.arc(position.x, position.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = MAP_COLORS.marker;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = MAP_COLORS.markerStroke;
        ctx.stroke();
    }

    function drawEmpty() {
        ctx.fillStyle = MAP_COLORS.dates;
        ctx.font = 'italic 15px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Додайте зупинки, щоб побачити маршрут на карті', MAP_WIDTH / 2, MAP_HEIGHT / 2);
    }

    // Один кадр: очищення полотна і перемальовування всього стану з нуля
    function render() {
        ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
        drawGrid();

        if (points.length === 0) {
            drawEmpty();
            return;
        }

        drawSummary();
        if (points.length > 1) {
            drawRoute();
        }

        // Маркер рушає лише тоді, коли весь маршрут уже прокладено. Його малюємо до точок,
        // тож він «проходить під» зупинками і не закриває їхні номери
        if (points.length > 1 && drawnLength >= route.total) {
            drawMarker();
        }
        points.forEach(drawPoint);
    }

    // ---------- Крок 5: цикл анімації ----------

    // Анімувати є що лише тоді, коли на карті хоча б дві зупинки (є лінія)
    const hasMotion = () => points.length > 1;

    // Оновлення стану на dt секунд
    function update(dt) {
        if (drawnLength < route.total) {
            drawnLength = Math.min(route.total, drawnLength + ROUTE_DRAW_SPEED * dt);
        } else {
            markerDistance = (markerDistance + MARKER_SPEED * dt) % route.total;
        }
    }

    function frame(timestamp) {
        // Час між кадрами обмежено: якщо вкладка була неактивна, маркер не перескочить уперед
        const dt = lastTime === null ? 0 : Math.min((timestamp - lastTime) / 1000, MAX_FRAME_TIME);
        lastTime = timestamp;

        update(dt);   // 1) оновити стан
        render();     // 2) clearRect + перемалювати кадр

        frameId = requestAnimationFrame(frame); // 3) запланувати наступний кадр
    }

    // ---------- Крок 8: запуск і коректне завершення циклу ----------

    // Цикл працює лише тоді, коли користувач його не зупинив, полотно видно і є що анімувати
    function syncLoop() {
        const shouldRun = wantsToPlay && isVisible && hasMotion();

        if (shouldRun && frameId === null) {
            lastTime = null;
            frameId = requestAnimationFrame(frame);
        } else if (!shouldRun && frameId !== null) {
            cancelAnimationFrame(frameId);
            frameId = null;
        }
    }

    // Коли карта прокручена за межі екрана, кадри не малюються взагалі
    const observer = new IntersectionObserver(entries => {
        isVisible = entries[0].isIntersecting;
        syncLoop();
    });
    observer.observe(canvas);

    // Текстовий опис карти для читачів екрана (Canvas сам по собі для них «порожній»)
    function updateLabel() {
        canvas.setAttribute('aria-label', stops.length > 0
            ? `Міні-карта маршруту: ${stops.map(stop => stop.city).join(' → ')}`
            : 'Міні-карта маршруту: зупинок поки немає');
    }

    return {
        // Крок 6: нові дані маршруту. Якщо маршрут справді змінився і анімація відтворюється,
        // лінія прокладається заново, щоб зміну було видно; на паузі карта одразу показується повністю
        setStops(newStops) {
            const newSignature = routeSignature(newStops);
            const routeChanged = newSignature !== signature;

            stops = newStops;
            points = toMapPoints(stops);
            route = measureRoute(points);
            signature = newSignature;

            if (routeChanged) {
                drawnLength = wantsToPlay ? 0 : route.total;
                markerDistance = 0;
            }

            updateLabel();
            render();
            syncLoop();
        },
        // Крок 7: керування анімацією з кнопки
        play() {
            wantsToPlay = true;
            syncLoop();
        },
        pause() {
            wantsToPlay = false;
            syncLoop();
        },
        isPlaying: () => wantsToPlay,
        // Повне завершення: скасувати кадр і перестати стежити за видимістю полотна
        destroy() {
            wantsToPlay = false;
            syncLoop();
            observer.disconnect();
        }
    };
}

// ===================== Практикум 13: SPA та клієнтська маршрутизація =====================

// Крок 1: обрано hash-based роутинг (location.hash + hashchange). Частина адреси після #
// не надсилається на сервер, тож застосунок однаково працює з Live Server, з file:// і на
// статичному хостингу без fallback-налаштування. Крім того, відносні шляхи css/style.css,
// js/app.js та assets/img/... не ламаються на вкладених адресах на кшталт #/trip/3/stop/17,
// а пряме відкриття такої адреси чи F5 на ній завжди повертає той самий index.html.

// Крок 2: спільний контейнер, у який рендеряться всі «сторінки» застосунку
const appContainer = document.querySelector('#app');
const navLinks = document.querySelectorAll('header nav a[data-nav]');
const APP_TITLE = 'Планувальник подорожей';
const PAGE_LOAD_ERROR_MESSAGE =
    'Не вдалося прочитати дані зі сховища браузера. Перезавантажте сторінку або перевірте, ' +
    'чи не заборонено збереження даних сайтів у налаштуваннях браузера.';

// Адреси сторінок формуються лише тут - компоненти не складають рядки шляхів самостійно
function tripHref(tripId) {
    return `#/trip/${tripId}`;
}

function stopHref(tripId, stopId) {
    return `#/trip/${tripId}/stop/${stopId}`;
}

// Параметри маршруту - рядки, а ключі в IndexedDB - цілі числа. Некоректне значення
// (напр. #/trip/abc) перетворюється на null, і view показує «Не знайдено», а не передає
// NaN в IndexedDB, яка на такий ключ кидає DataError
const parseId = value => (/^\d+$/.test(value) ? Number(value) : null);

// ---------- Компоненти сторінок: перевикористовують уже написані компоненти й функції ----------

// Сторінка «/»: колишній tripsApp (практикум 10) - список карток TripCard і форма практикуму 8
const HomePage = {
    components: { TripCard },
    template: '#home-page-template',
    props: {
        initialTrips: { type: Array, required: true }
    },
    data() {
        return {
            trips: this.initialTrips,
            error: ''
        };
    },
    mounted() {
        // Форма вже є в DOM - підключаємо до неї обробники практикуму 8
        setupTripForm(this.$refs.tripForm, this.createTrip);
    },
    methods: {
        // Нова подорож записується в IndexedDB, після чого список перечитується зі сховища
        async createTrip(trip) {
            this.error = '';
            try {
                await addTrip(trip);
                this.trips = await getAllTrips();
                return true;
            } catch (error) {
                this.error = TRIP_WRITE_ERROR_MESSAGE;
                console.error(error);
                return false;
            }
        }
    }
};

// Сторінка «/trip/:id»: секція деталей обраної подорожі (практикум 10) і маршрут (TripRoute)
const TripPage = {
    components: { TripRoute },
    template: '#trip-page-template',
    props: {
        initialTrip: { type: Object, required: true }
    },
    data() {
        return {
            trip: { ...this.initialTrip },
            error: ''
        };
    },
    computed: {
        dailyCost() {
            return costPerDay(this.trip);
        }
    },
    methods: {
        // Зміна тривалості подорожі (практикум 10). Практикум 13: зміна зберігається в IndexedDB,
        // тож нова тривалість видна і в картці на головній сторінці, і після перезавантаження
        async changeDays(delta) {
            const previousDays = this.trip.days;
            this.trip.days = Math.max(1, previousDays + delta);
            this.error = '';
            try {
                await updateTrip({ ...this.trip });
            } catch (error) {
                this.trip.days = previousDays;
                this.error = TRIP_WRITE_ERROR_MESSAGE;
                console.error(error);
            }
        }
    }
};

// Сторінка «/trip/:id/stop/:stopId»: деталі одного пункту маршруту.
// Форматування дат і тривалість зупинки - ті самі функції, що й у списку та міні-карті
const StopPage = {
    template: '#stop-page-template',
    props: {
        trip: { type: Object, required: true },
        stop: { type: Object, required: true },
        position: { type: Number, required: true },
        total: { type: Number, required: true },
        prevStop: { type: Object, default: null },
        nextStop: { type: Object, default: null }
    },
    computed: {
        tripLink() {
            return tripHref(this.trip.id);
        },
        stayDays() {
            return stayDays(this.stop);
        }
    },
    methods: {
        formatDate,
        stopLink(stop) {
            return stopHref(this.trip.id, stop.id);
        }
    }
};

// ---------- Крок 5: рендер сторінки в спільний контейнер ----------

// Vue-застосунок поточної сторінки (null, якщо сторінка відрендерена без Vue)
let currentApp = null;

// «Очищення» контейнера перед рендером нової сторінки. Vue-застосунок попередньої сторінки
// демонтується: так спрацьовують хуки unmounted, зокрема зупинка анімації міні-карти (практикум 12)
function clearView() {
    if (currentApp) {
        currentApp.unmount();
        currentApp = null;
    }
    appContainer.replaceChildren(); // практикум 15: без innerHTML (див. renderList)
}

// Сторінка на Vue: новий застосунок із компонентом сторінки та даними з IndexedDB у props
function mountView(component, props) {
    clearView();
    currentApp = Vue.createApp(component, props);
    currentApp.mount(appContainer);
}

// Сторінка без Vue: копія вмісту <template> зі статичною розміткою
function showTemplate(templateSelector) {
    clearView();
    appContainer.append(document.querySelector(templateSelector).content.cloneNode(true));
}

// ---------- Крок 5, 8, 9: view-функції ----------
// Кожна view отримує { params, path, isCurrent } і повертає заголовок сторінки для document.title.
// Дані читаються до очищення контейнера, тому під час читання на екрані лишається попередня сторінка.
// isCurrent() стає false, якщо поки дані читалися, користувач уже перейшов на іншу адресу -
// тоді застаріла view нічого не рендерить і повертає null.

async function renderHomePage({ isCurrent }) {
    const trips = await getAllTrips();
    if (!isCurrent()) return null;

    mountView(HomePage, { initialTrips: trips });
    return 'Мої подорожі';
}

async function renderTripPage({ params, path, isCurrent }) {
    const tripId = parseId(params.id);
    const trip = tripId === null ? undefined : await getTrip(tripId);
    if (!isCurrent()) return null;

    if (!trip) {
        return renderNotFoundPage({ path });
    }
    mountView(TripPage, { initialTrip: trip });
    return trip.destination;
}

// Крок 8: сторінка деталей знаходить один запис за id і показує лише його
async function renderStopPage({ params, path, isCurrent }) {
    const tripId = parseId(params.id);
    const stopId = parseId(params.stopId);
    if (tripId === null || stopId === null) {
        return renderNotFoundPage({ path });
    }

    // Зупинки подорожі потрібні цілком: з них визначаються номер зупинки та сусідні пункти маршруту
    const [trip, tripStops] = await Promise.all([getTrip(tripId), getStopsByTrip(tripId)]);
    if (!isCurrent()) return null;

    const stops = tripStops.sort(byDateFrom);
    const index = stops.findIndex(stop => stop.id === stopId);

    // Зупинка має не лише існувати, а й належати саме подорожі з адреси
    if (!trip || index === -1) {
        return renderNotFoundPage({ path });
    }

    const stop = stops[index];
    mountView(StopPage, {
        trip,
        stop,
        position: index + 1,
        total: stops.length,
        prevStop: stops[index - 1] ?? null,
        nextStop: stops[index + 1] ?? null
    });
    return `${stop.city}, ${stop.country}`;
}

function renderCountriesPage() {
    showTemplate('#countries-page-template');
    setupCountryLookup(appContainer.querySelector('.country-section'));
    return 'Довідка про країни';
}

// Крок 9: неіснуючий маршрут чи запис - сторінка «Не знайдено» з посиланням на головну
function renderNotFoundPage({ path }) {
    showTemplate('#not-found-page-template');
    // Адреса вставляється як текст, а не через innerHTML, тож розмітка з адресного рядка не виконається
    let readablePath = path;
    try {
        readablePath = decodeURI(path);
    } catch {
        // Некоректне %-кодування - показуємо адресу як є
    }
    appContainer.querySelector('.page-message__path').textContent = `#${readablePath}`;
    return 'Сторінку не знайдено';
}

function renderErrorPage(message) {
    showTemplate('#error-page-template');
    appContainer.querySelector('.load-error').textContent = message;
    return 'Помилка';
}

// ---------- Крок 3, 4: таблиця маршрутів і зіставлення шляху ----------

// Крок 3, 11: таблиця маршрутів (варіант 10). Кожен запис - патерн шляху після #, view-функція,
// що рендерить сторінку в #app, і розділ меню (nav), який підсвічується на цій сторінці.
// Сегменти з двокрапкою - параметри: matchRoute передає їхні значення у view як params.
//   /                        - список поїздок
//   /trip/:id                - пункти маршруту конкретної поїздки
//   /trip/:id/stop/:stopId   - деталі одного пункту (два параметри в одному патерні)
//   /countries               - довідка про країну з API (практикум 9), колишній розділ сторінки
const routes = [
    { path: '/', view: renderHomePage, nav: '/' },
    { path: '/trip/:id', view: renderTripPage, nav: '/' },
    { path: '/trip/:id/stop/:stopId', view: renderStopPage, nav: '/' },
    { path: '/countries', view: renderCountriesPage, nav: '/countries' }
];

// Крок 4: шлях і патерн розбиваються на сегменти по «/». Маршрут підходить, якщо кількість
// сегментів однакова, а кожен сегмент збігається буквально або є параметром (:name).
// Повертає { route, params } або null, якщо жоден маршрут не підійшов
function matchRoute(path) {
    const pathParts = path.split('/').filter(Boolean);

    for (const route of routes) {
        const routeParts = route.path.split('/').filter(Boolean);
        if (routeParts.length !== pathParts.length) continue;

        const params = {};
        const isMatch = routeParts.every((part, i) => {
            if (part.startsWith(':')) {
                params[part.slice(1)] = pathParts[i];
                return true;
            }
            return part === pathParts[i];
        });

        if (isMatch) return { route, params };
    }
    return null; // маршрут не знайдено - сторінка 404
}

// Поточний шлях - частина адреси після #. Порожній хеш відповідає головній сторінці
function getCurrentPath() {
    return location.hash.slice(1) || '/';
}

// ---------- Рендер за поточною адресою ----------

// Номер останнього запущеного рендеру: за ним view-функції розпізнають, що вони застаріли
let renderToken = 0;
let isFirstRender = true;

async function render() {
    const path = getCurrentPath();
    const token = ++renderToken;
    const isCurrent = () => token === renderToken;

    const match = matchRoute(path);
    updateNav(match ? match.route.nav : null);

    let title;
    try {
        title = match
            ? await match.route.view({ params: match.params, path, isCurrent })
            : renderNotFoundPage({ path });
    } catch (error) {
        console.error('Помилка рендеру сторінки:', error);
        if (!isCurrent()) return;
        title = renderErrorPage(PAGE_LOAD_ERROR_MESSAGE);
    }

    if (title === null || !isCurrent()) return;
    afterRender(title);
}

// Підсвічування пункту меню розділу, до якого належить поточна сторінка
function updateNav(activeNav) {
    navLinks.forEach(link => {
        if (link.dataset.nav === activeNav) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

// Те, що браузер робить сам під час звичайного переходу між сторінками: новий заголовок вкладки,
// прокрутка до початку і (крім першого рендеру) фокус на заголовку нової сторінки - так читач
// екрана оголосить її, а клавіатурна навігація почнеться з початку вмісту
function afterRender(title) {
    document.title = `${title} | ${APP_TITLE}`;

    if (isFirstRender) {
        isFirstRender = false;
        return;
    }

    window.scrollTo(0, 0);
    const heading = appContainer.querySelector('h2');
    if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
    }
}

// ---------- Крок 6, 7: навігація ----------

// Крок 6: програмний перехід. Зміна хеша додає запис в історію браузера й породжує hashchange,
// а рендер запускає обробник із кроку 7. Якщо адреса не змінилася (повторний клік на пункт меню
// поточної сторінки), hashchange не настане - тоді сторінку перемальовуємо самі
function navigate(path) {
    if (path === getCurrentPath()) {
        render();
        return;
    }
    location.hash = path;
}

// Крок 6: перехоплення кліків по внутрішніх посиланнях (меню, картки, «назад» до подорожі тощо).
// Делегування на document працює і для посилань, які з'являться після рендеру нових сторінок.
// Клік із Ctrl/Cmd/Shift/Alt лишається за браузером, тож посилання можна відкрити в новій вкладці
document.addEventListener('click', event => {
    const link = event.target.closest('a[data-link]');
    if (!link) return;
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    navigate(link.getAttribute('href').replace(/^#/, ''));
});

// Крок 7: кнопки «назад»/«вперед» браузера змінюють хеш - сторінка перемальовується за новою адресою
window.addEventListener('hashchange', render);

// Запуск: база відкривається (і за потреби оновлюється та мігрує) один раз, після чого
// рендериться сторінка з поточної адреси - зокрема відкритої напряму чи після F5
prepareStorage().then(render);