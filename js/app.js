console.log('app.js підключено');

// Крок 4: Оголошення даних. Масив об'єктів подорожей
const trips = [
    { destination: 'Відень', days: 7, budget: 23000 },
    { destination: 'Братислава', days: 3, budget: 5000 },
    { destination: 'Прага', days: 10, budget: 15000 }
];

// Крок 7: Стрілкова функція, яка розраховує витрати на один день подорожі
// Приймає об'єкт trip та повертає числове значення, округлене до цілого
const costPerDay = trip => Math.round(trip.budget / trip.days);

// Крок 5 та 6: Обробка даних циклом та умовна класифікація
// Перебираємо масив подорожей циклом for...of
for (const trip of trips) {
    // Викликаємо функцію для обчислення вартості одного дня
    const dailyCost = costPerDay(trip);
    let classification = '';

    // Класифікуємо подорож за загальним бюджетом за допомогою if/else
    if (trip.budget <= 15000) {
        classification = 'бюджетна';
    } else {
        classification = 'дорога';
    }

    // Виводимо підсумкову інформацію в консоль, використовуючи рядкові шаблони
    console.log(`Подорож до міста ${trip.destination}:`);
    console.log(`- Тривалість: ${trip.days} днів`);
    console.log(`- Загальний бюджет: ${trip.budget} грн (${classification} подорож)`);
    console.log(`- Витрати на день: ${dailyCost} грн`);
    console.log('---------------------------');
}