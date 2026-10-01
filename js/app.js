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

// Функція рендеру масиву (практикум 7)
function renderTrips(tripsArray) {
    listContainer.innerHTML = ''; // Очищення контейнера

    tripsArray.forEach((trip, index) => {
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

        // Додавання готової картки в контейнер на сторінці
        listContainer.append(card);
    });

    // Оновлення підсумкового елемента поза списком
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