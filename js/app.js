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

// ===================== Практикум 11: маршрут подорожі в локальному сховищі =====================

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

// Ключ, під яким маршрут зберігається в localStorage
const STOPS_STORAGE_KEY = 'tripStops';

const STORAGE_WRITE_ERROR_MESSAGE = 'Не вдалося зберегти зміни маршруту. Спробуйте ще раз.';

// Крок 2: збереження масиву зупинок у localStorage (лише рядки, тому JSON.stringify).
// setItem може кинути QuotaExceededError, коли сховище переповнене.
function saveToLocalStorage(stops) {
    try {
        localStorage.setItem(STOPS_STORAGE_KEY, JSON.stringify(stops));
        return true;
    } catch (error) {
        console.error('Не вдалося записати маршрут у localStorage:', error);
        return false;
    }
}

// Крок 2: читання масиву зупинок; пошкоджені дані не «кладуть» застосунок, а дають порожній список
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

// Порожній стан форми зупинки
const emptyStopForm = () => ({ country: '', city: '', dateFrom: '', dateTo: '', notes: '' });

// 'YYYY-MM-DD' -> 'DD.MM.YYYY' без об'єкта Date, щоб часовий пояс не зсунув день
const formatDate = isoDate => isoDate.split('-').reverse().join('.');

// Сценарій варіанта: маршрут показується відсортованим за dateFrom (за однакових - за dateTo)
const byDateFrom = (a, b) => a.dateFrom.localeCompare(b.dateFrom) || a.dateTo.localeCompare(b.dateTo);

const routeApp = Vue.createApp({
    data() {
        return {
            // Маршрут відновлюється з localStorage одразу під час створення застосунку
            stops: loadFromLocalStorage(),
            form: emptyStopForm(),
            editingId: null,     // id зупинки, яку зараз редагують, або null
            storageReady: true,  // localStorage доступний синхронно
            loading: false,
            saving: false,
            error: ''
        };
    },
    computed: {
        sortedStops() {
            return [...this.stops].sort(byDateFrom);
        },
        isEditing() {
            return this.editingId !== null;
        }
    },
    methods: {
        formatDate,
        // Крок 3: запис поточного стану після кожної зміни
        persist() {
            this.error = saveToLocalStorage(this.stops) ? '' : STORAGE_WRITE_ERROR_MESSAGE;
        },
        // Додавання нової зупинки або збереження змін у редагованій
        submitStop() {
            const stop = {
                id: this.editingId ?? Date.now(),
                country: this.form.country.trim(),
                city: this.form.city.trim(),
                dateFrom: this.form.dateFrom,
                dateTo: this.form.dateTo,
                notes: this.form.notes.trim()
            };

            if (this.isEditing) {
                // Редагування замінює запис з тим самим id, а не створює новий
                this.stops = this.stops.map(item => (item.id === stop.id ? stop : item));
            } else {
                this.stops.push(stop);
            }

            this.persist(); // Крок 3: після додавання чи редагування
            this.resetForm();
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
        removeStop(id) {
            this.stops = this.stops.filter(stop => stop.id !== id);
            if (this.editingId === id) {
                this.resetForm();
            }
            this.persist(); // Крок 3: після видалення
        },
        // Власне повідомлення, якщо в текстовому полі лише пробіли (як у формі практикуму 8)
        checkBlank(event, message) {
            const input = event.target;
            input.setCustomValidity('');
            if (input.validity.patternMismatch) {
                input.setCustomValidity(message);
            }
        }
    }
}).mount('#trip-route');