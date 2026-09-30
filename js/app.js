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

// Стрілкова функція для обчислення витрат на день
const costPerDay = trip => Math.round(trip.budget / trip.days);

// Крок 3: Вибір контейнера та підсумкового елемента з DOM
const listContainer = document.querySelector('#trips-list');
const tripsCountElement = document.querySelector('#trips-count');

// Крок 2: Видалення статичної розмітки-заглушки програмно
const placeholder = document.querySelector('.static-placeholder');
if (placeholder) {
    placeholder.remove();
}

// Крок 4: Функція рендеру масиву
function renderTrips(tripsArray) {
    listContainer.innerHTML = ''; // Очищення контейнера

    tripsArray.forEach(trip => {
        // Створення головної картки
        const card = document.createElement('article');
        card.classList.add('card');

        // Крок 6: Додавання атрибута data-cost-per-day
        const dailyCost = costPerDay(trip);
        card.dataset.costPerDay = dailyCost;

        // Крок 6: Умовний клас (budget або expensive)
        if (trip.budget <= 15000) {
            card.classList.add('card--budget');
        } else {
            card.classList.add('card--expensive');
        }

        // Створення зображення
        const img = document.createElement('img');
        img.src = trip.image;
        img.alt = trip.destination;

        // Створення div-обгортки для тексту
        const contentWrapper = document.createElement('div');

        // Створення мітки статусу з 5-го практикуму
        const statusBadge = document.createElement('span');
        statusBadge.classList.add('status', trip.statusClass);
        statusBadge.textContent = trip.statusText;

        // Крок 5: Створення h3 та p з даними
        const title = document.createElement('h3');
        title.textContent = `${trip.destination} (Деталі)`;

        const details = document.createElement('p');
        details.textContent = `${trip.days} днів, ${trip.budget} грн`;

        // Крок 7: Збірка DOM-дерева (вкладання елементів один в одного)
        contentWrapper.append(statusBadge, title, details);
        card.append(img, contentWrapper);

        // Додавання готової картки в контейнер на сторінці
        listContainer.append(card);
    });

    // Крок 9: Оновлення підсумкового елемента поза списком
    if (tripsCountElement) {
        tripsCountElement.textContent = `Загальна кількість подорожей: ${tripsArray.length}`;
    }
}

// Крок 8: Виклик функції рендеру
renderTrips(trips);