// Дані з практикуму 6 + нові
const trips = [
    {
        destination: 'Відень',
        days: 7,
        budget: 23000,
        image: 'assets/img/vienna.jpg',
        statusText: 'Поточна',
        statusClass: 'status--active'
    },
    {
        destination: 'Будапешт',
        days: 3,
        budget: 5000,
        image: 'assets/img/budapest.jpg',
        statusText: 'Минула',
        statusClass: 'status--past'
    },
    {
        destination: 'Прага',
        days: 10,
        budget: 15000,
        image: 'assets/img/prague.jpg',
        statusText: 'Заплановано',
        statusClass: 'status--planned'
    }
];

// Мінімальний розумний бюджет на один день подорожі (грн)
const MIN_DAILY_BUDGET = 1000;

// Стрілкова функція для обчислення витрат на день
const costPerDay = trip => Math.round(trip.budget / trip.days);

// Вибір контейнера та підсумкового елемента з DOM
const listContainer = document.querySelector('#trips-list');
const tripsCountElement = document.querySelector('#trips-count');
const detailsContent = document.querySelector('#trip-details-content');

// Видалення статичної розмітки-заглушки програмно
const placeholder = document.querySelector('.static-placeholder');
if (placeholder) {
    placeholder.remove();
}

// Універсальна функція рендеру масиву (практикум 7, узагальнена в практикумі 9):
// очищає контейнер і додає в нього елемент, створений функцією createItem для кожного запису.
// Так одна й та сама логіка рендеру працює і для подорожей, і для країн з API.
function renderList(container, items, createItem) {
    container.innerHTML = ''; // Очищення контейнера

    items.forEach((item, index) => {
        container.append(createItem(item, index));
    });
}

// Створення картки подорожі (практикум 7)
function createTripCard(trip, index) {
    // Створення головної картки
    const card = document.createElement('article');
    card.classList.add('card');

    // Індекс запису в масиві - потрібен для делегування кліку (практикум 8)
    card.dataset.index = index;

    // Атрибут data-cost-per-day
    const dailyCost = costPerDay(trip);
    card.dataset.costPerDay = dailyCost;

    // Умовний клас (budget або expensive)
    if (trip.budget <= 15000) {
        card.classList.add('card--budget');
    } else {
        card.classList.add('card--expensive');
    }

    // Створення div-обгортки для тексту
    const contentWrapper = document.createElement('div');

    // Створення мітки статусу з 5-го практикуму
    const statusBadge = document.createElement('span');
    statusBadge.classList.add('status', trip.statusClass);
    statusBadge.textContent = trip.statusText;

    // Створення h3 та p з даними
    const title = document.createElement('h3');
    title.textContent = `${trip.destination}`;

    const details = document.createElement('p');
    details.textContent = `${trip.days} днів, ${trip.budget} грн`;

    // Збірка DOM-дерева (вкладання елементів один в одного)
    contentWrapper.append(statusBadge, title, details);

    // Зображення додається лише тоді, коли воно є (у нових подорожей з форми його немає)
    if (trip.image) {
        const img = document.createElement('img');
        img.src = trip.image;
        img.alt = trip.destination;
        card.append(img);
    }
    card.append(contentWrapper);

    return card;
}

// Рендер списку подорожей та оновлення підсумкового елемента поза списком
function renderTrips(tripsArray) {
    renderList(listContainer, tripsArray, createTripCard);

    if (tripsCountElement) {
        tripsCountElement.textContent = `Загальна кількість подорожей: ${tripsArray.length}`;
    }
}

// Виклик функції рендеру при завантаженні сторінки
renderTrips(trips);


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

    // Крок 5: Новий об'єкт тієї самої форми, що й елементи масиву trips
    const newTrip = {
        destination,
        days,
        budget,
        image: '',
        statusText: 'Заплановано',
        statusClass: 'status--planned'
    };
    trips.push(newTrip);

    // Крок 6: Повторний рендер списку з оновленим масивом
    renderTrips(trips);

    // Крок 7: Очищення форми та розрахунку після успішного додавання
    form.reset();
    updateCostPreview();
});

// Виведення деталей обраної подорожі в секцію #trip-details
function showTripDetails(trip) {
    detailsContent.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = trip.destination;

    const statusBadge = document.createElement('span');
    statusBadge.classList.add('status', trip.statusClass);
    statusBadge.textContent = trip.statusText;

    const list = document.createElement('ul');
    list.classList.add('details-list');

    const rows = [
        ['Тривалість', `${trip.days} днів`],
        ['Бюджет', `${trip.budget} грн`],
        ['Бюджет на день', `${costPerDay(trip)} грн`]
    ];

    rows.forEach(([label, value]) => {
        const item = document.createElement('li');
        const labelSpan = document.createElement('span');
        labelSpan.textContent = `${label}:`;
        const valueSpan = document.createElement('span');
        valueSpan.classList.add('budget-amount');
        valueSpan.textContent = value;
        item.append(labelSpan, valueSpan);
        list.append(item);
    });

    detailsContent.append(statusBadge, title, list);
}

// Крок 9: Друга подія варіанта - клік по картці через делегування.
// Обробник один на весь контейнер, тому працює і для карток, створених після рендеру.
listContainer.addEventListener('click', event => {
    const card = event.target.closest('.card');
    if (!card) return; // Клік по порожньому місцю контейнера

    const trip = trips[Number(card.dataset.index)];

    // Підсвічування обраної картки
    listContainer.querySelectorAll('.card--selected')
        .forEach(selected => selected.classList.remove('card--selected'));
    card.classList.add('card--selected');

    showTripDetails(trip);
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