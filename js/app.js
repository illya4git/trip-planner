// ===================== Практикум 10: список подорожей на Vue 3 =====================

// Крок 1, 10: обрано Vue 3, бо його глобальна CDN-збірка вже містить компілятор шаблонів,
// тож компоненти описуються звичним HTML-шаблоном прямо на сторінці - без Babel, JSX і збірки.

// Мінімальний розумний бюджет на один день подорожі (грн)
const MIN_DAILY_BUDGET = 1000;

// Стрілкова функція для обчислення витрат на день (використовують форма і секція деталей)
const costPerDay = trip => Math.round(trip.budget / trip.days);

// Крок 4: компонент картки подорожі за варіантом 10.
// Отримує всі дані лише через props і не звертається до глобальних змінних.
const TripCard = {
    props: {
        id: { type: Number, required: true },
        destination: { type: String, required: true },
        days: { type: Number, required: true },
        budget: { type: Number, required: true },
        image: { type: String, default: '' },
        statusText: { type: String, default: '' },
        statusClass: { type: String, default: '' },
        selected: { type: Boolean, default: false }
    },
    emits: ['select'],
    computed: {
        // Похідне значення варіанта: перераховується автоматично щоразу,
        // коли змінюється budget або days, і ніде окремо не зберігається
        costPerDay() {
            return Math.round(this.budget / this.days);
        },
        // Умовний клас із практикуму 7 (budget або expensive)
        budgetClass() {
            return this.budget <= 15000 ? 'card--budget' : 'card--expensive';
        }
    },
    // Крок 6: клік по картці лише повідомляє батьківському компоненту id через $emit,
    // а сам стан (яку подорож обрано) змінює батьківський компонент
    template: `
        <article class="card"
                 :class="[budgetClass, { 'card--selected': selected }]"
                 :data-cost-per-day="costPerDay"
                 @click="$emit('select', id)">
            <img v-if="image" :src="image" :alt="destination">
            <div>
                <span class="status" :class="statusClass">{{ statusText }}</span>
                <h3>{{ destination }}</h3>
                <p>{{ days }} днів, {{ budget }} грн</p>
                <p>Бюджет на день: <span class="budget-amount">{{ costPerDay }} грн</span></p>
            </div>
        </article>`
};

const tripsApp = Vue.createApp({
    components: { TripCard },
    data() {
        return {
            // Крок 3: масив подорожей (практикум 6) тепер у реактивному стані, а не в зовнішній змінній.
            // Кожен запис отримав унікальний id - він потрібен для :key і для події select.
            trips: [
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
            ],
            selectedId: null
        };
    },
    computed: {
        // Обрана подорож виводиться з selectedId, тому ніколи не розходиться з масивом
        selectedTrip() {
            return this.trips.find(trip => trip.id === this.selectedId) || null;
        },
        selectedCostPerDay() {
            return this.selectedTrip ? costPerDay(this.selectedTrip) : 0;
        }
    },
    methods: {
        // Крок 6: батьківський компонент оновлює стан у відповідь на подію select картки
        selectTrip(id) {
            this.selectedId = id;
        },
        // Зміна тривалості обраної подорожі - costPerDay у картці перераховується сам
        changeDays(delta) {
            this.selectedTrip.days = Math.max(1, this.selectedTrip.days + delta);
        },
        // Додавання нової подорожі з форми практикуму 8 з новим унікальним id
        addTrip(trip) {
            const nextId = Math.max(0, ...this.trips.map(t => t.id)) + 1;
            this.trips.push({ id: nextId, ...trip });
        }
    }
}).mount('#trips-app');

// Універсальна функція рендеру масиву (практикум 7, узагальнена в практикумі 9).
// Після практикуму 10 нею користується лише довідка про країни.
function renderList(container, items, createItem) {
    container.innerHTML = ''; // Очищення контейнера

    items.forEach((item, index) => {
        container.append(createItem(item, index));
    });
}

// Крок 7: ручний DOM-рендер подорожей видалено - його замінено компонентом TripCard.
// Прибрано функції createTripCard, renderTrips і showTripDetails, програмне видалення
// заглушки .static-placeholder та делегований обробник кліку по #trips-list (практикуми 7-8):
// список, лічильник, підсвічування обраної картки й деталі тепер рендерить Vue з реактивного стану.


// ===================== Практикум 8: форма та події =====================

// Крок 2: Вибір форми та її полів
const form = document.querySelector('#trip-form');
const destinationInput = document.querySelector('#destination');
const daysInput = document.querySelector('#days');
const budgetInput = document.querySelector('#budget');
const costPreview = document.querySelector('#cost-preview');
const costWarning = document.querySelector('#cost-warning');

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
form.addEventListener('submit', event => {
    // Крок 3: Скасування стандартної поведінки (перезавантаження сторінки)
    event.preventDefault();

    // Крок 4: Зчитування значень полів, числові поля приводимо до Number
    const destination = destinationInput.value.trim();
    const days = Number(daysInput.value);
    const budget = Number(budgetInput.value);

    // Крок 5: Новий об'єкт тієї самої форми, що й елементи масиву trips (id додасть Vue-застосунок)
    const newTrip = {
        destination,
        days,
        budget,
        image: '',
        statusText: 'Заплановано',
        statusClass: 'status--planned'
    };

    // Крок 6: Додавання в реактивний стан - список перемальовує Vue (практикум 10),
    // тому ручний виклик рендеру більше не потрібен
    tripsApp.addTrip(newTrip);

    // Крок 7: Очищення форми та розрахунку після успішного додавання
    form.reset();
    updateCostPreview();
});

// ===================== Практикум 9: клієнт для API довідки про країни =====================

// Крок 3: базова адреса ендпоінта винесена в константу на початку блоку.
// REST Countries v3.1 з методички більше не працює без ключа (версію виведено з експлуатації),
// тому використано відкритий аналог countries.dev з тим самим ендпоінтом /name/{name}.
const COUNTRIES_API_URL = 'https://countries.dev/name/';
const DEFAULT_COUNTRY = 'Austria';

// Повідомлення для користувача (технічні деталі йдуть лише в консоль)
const COUNTRY_NOT_FOUND_MESSAGE = 'Країну не знайдено, перевірте написання';
const COUNTRY_SERVER_ERROR_MESSAGE = 'Сервіс довідки тимчасово недоступний. Спробуйте пізніше.';
const COUNTRY_NETWORK_ERROR_MESSAGE =
    'Не вдалося завантажити дані про країну. Перевірте з\'єднання з інтернетом і натисніть «Оновити».';

const countryForm = document.querySelector('#country-form');
const countryInput = document.querySelector('#country-query');
const countryRefreshButton = document.querySelector('#country-refresh');
const countrySubmitButton = countryForm.querySelector('button[type="submit"]');
const countryLoading = document.querySelector('#country-loading');
const countryError = document.querySelector('#country-error');
const countryCount = document.querySelector('#country-count');
const countryList = document.querySelector('#country-list');

// Останній виконаний запит - його повторює кнопка «Оновити»
let lastCountryQuery = DEFAULT_COUNTRY;

// Крок 6: зіставлення об'єкта відповіді API з формою власного об'єкта застосунку.
// На відміну від REST Countries v3.1, countries.dev повертає «пласку» структуру:
// name і capital - звичайні рядки, а не вкладений об'єкт і масив.
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
 * API: countries.dev, ендпоінт /name/{name} (без ключа, з CORS) - https://countries.dev/docs/api/name
 * Відкритий аналог REST Countries (https://restcountries.com/v3.1/name/{name}).
 * Пошук частковий і без урахування регістру: за запитом "ger" повертаються Germany, Algeria, Niger тощо.
 * На невідому назву сервіс відповідає кодом 404 з текстом "Country not found".
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
            const error = new Error(`countries.dev відповів кодом ${response.status}`);
            error.status = response.status;
            throw error;
        }

        // Крок 5: розбір тіла відповіді як JSON
        const data = await response.json();
        console.log(data);

        // Додатковий захист: порожній масив теж означає «нічого не знайдено»
        if (!Array.isArray(data) || data.length === 0) {
            const error = new Error('countries.dev повернув порожній результат');
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

// Перше завантаження при відкритті сторінки
loadCountry(DEFAULT_COUNTRY);

// ===================== Практикум 11: маршрут подорожі в IndexedDB =====================

// Крок 1: модель даних варіанта 10 - пункт маршруту (зупинка):
// {
//     id: number,        // унікальний ідентифікатор, Date.now() у момент створення; далі не змінюється
//     country: string,   // країна
//     city: string,      // місто
//     dateFrom: string,  // дата прибуття у форматі 'YYYY-MM-DD' (значення input type="date")
//     dateTo: string,    // дата від'їзду у тому ж форматі
//     notes: string      // необов'язкові нотатки
// }
// Дати зберігаються рядками ISO, тож їх можна порівнювати як звичайні рядки.

// Ключ, під яким маршрут зберігався в localStorage (кроки 2-4), і прапорець міграції (крок 8)
const STOPS_STORAGE_KEY = 'tripStops';
const MIGRATION_FLAG_KEY = 'tripStopsMigrated';

// Крок 5: схема IndexedDB - одна база, одне об'єктне сховище, ключ - поле id моделі
const DB_NAME = 'TripPlannerDB';
const DB_VERSION = 1;
const STOPS_STORE = 'tripStops';

// Повідомлення для користувача (технічні деталі йдуть лише в консоль)
const DB_OPEN_ERROR_MESSAGE =
    'Не вдалося відкрити сховище браузера, тому маршрут не буде збережено. ' +
    'Можливо, увімкнено режим приватного перегляду або збереження даних сайтів заборонене в налаштуваннях.';
const DB_READ_ERROR_MESSAGE = 'Не вдалося прочитати маршрут зі сховища браузера. Перезавантажте сторінку.';
const DB_WRITE_ERROR_MESSAGE = 'Не вдалося зберегти зміни маршруту. Спробуйте ще раз.';

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
 * спершу спрацьовує onupgradeneeded - лише там можна створити об'єктне сховище.
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

            request.onupgradeneeded = () => {
                const db = request.result;
                // Перевірка не дає створити те саме сховище вдруге
                if (!db.objectStoreNames.contains(STOPS_STORE)) {
                    db.createObjectStore(STOPS_STORE, { keyPath: 'id' });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        // Після невдачі скидаємо кеш, щоб наступний виклик спробував відкрити базу заново
        dbPromise.catch(() => {
            dbPromise = null;
        });
    }
    return dbPromise;
}

// Спільний запис для addItem і updateItem: put() створює новий запис або замінює наявний з тим самим id.
// Promise виконується лише після oncomplete транзакції, тобто коли дані вже точно записані.
async function putItem(stop) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STOPS_STORE, 'readwrite');
        tx.objectStore(STOPS_STORE).put(stop);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error); // напр., QuotaExceededError скасовує транзакцію
    });
}

// Крок 7 (Create): додавання нової зупинки в транзакції readwrite
function addItem(stop) {
    return putItem(stop);
}

// Крок 7 (Update): оновлення зупинки - put із тим самим id замінює запис, а не створює дублікат
function updateItem(stop) {
    return putItem(stop);
}

// Крок 7 (Read): усі зупинки в транзакції readonly; getAll() повертає їх у порядку ключа id
async function getAllItems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STOPS_STORE, 'readonly');
        const request = tx.objectStore(STOPS_STORE).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Крок 7 (Delete): видалення зупинки за ключем id в транзакції readwrite
async function deleteItem(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STOPS_STORE, 'readwrite');
        tx.objectStore(STOPS_STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

/**
 * Крок 8: одноразове перенесення маршруту з localStorage в IndexedDB.
 * Дані переносяться, лише якщо сховище tripStops порожнє, а в localStorage щось є.
 * Після першого запуску ставиться прапорець tripStopsMigrated=true, і перевірка більше не виконується.
 * Старий запис у localStorage не видаляється - він лишається резервною копією.
 * Повертає кількість перенесених зупинок.
 */
async function migrateFromLocalStorage() {
    if (localStorage.getItem(MIGRATION_FLAG_KEY) === 'true') {
        return 0;
    }

    const existingStops = await getAllItems();
    const legacyStops = loadFromLocalStorage();
    let migratedCount = 0;

    if (existingStops.length === 0 && legacyStops.length > 0) {
        for (const stop of legacyStops) {
            await addItem(stop);
            migratedCount++;
        }
    }

    // Прапорець ставимо лише після успішного перенесення всіх записів
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    return migratedCount;
}

// Порожній стан форми зупинки
const emptyStopForm = () => ({ country: '', city: '', dateFrom: '', dateTo: '', notes: '' });

// 'YYYY-MM-DD' -> 'DD.MM.YYYY' без об'єкта Date, щоб часовий пояс не зсунув день
const formatDate = isoDate => isoDate.split('-').reverse().join('.');

// Сценарій варіанта: маршрут показується відсортованим за dateFrom (за однакових - за dateTo)
const byDateFrom = (a, b) => a.dateFrom.localeCompare(b.dateFrom) || a.dateTo.localeCompare(b.dateTo);

const routeApp = Vue.createApp({
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
        // Сортування виконується на клієнті над масивом, отриманим через getAllItems
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

        // Збій міграції (напр., заблокований localStorage) не повинен блокувати роботу з IndexedDB
        try {
            const migratedCount = await migrateFromLocalStorage();
            if (migratedCount > 0) {
                console.info(`Перенесено з localStorage в IndexedDB зупинок: ${migratedCount}`);
            }
        } catch (error) {
            console.error('Міграцію маршруту з localStorage не виконано:', error);
        }

        await this.loadStops();
        this.loading = false;
    },
    methods: {
        formatDate,
        // Крок 9: єдине джерело даних списку - IndexedDB; викликається після кожної CRUD-операції
        async loadStops() {
            try {
                this.stops = await getAllItems();
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
    // Практикум 12, крок 8: якщо застосунок демонтують, цикл анімації зупиняється
    unmounted() {
        this.routeMap.destroy();
    }
});
// Монтування перенесено в кінець файлу (блок практикуму 12): mounted() використовує
// константи міні-карти, які мають бути оголошені до запуску застосунку

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

// Запуск застосунку маршруту (практикум 11) - після оголошення всіх констант міні-карти
routeApp.mount('#trip-route');