const socket = io();

const container = document.querySelector('.host-container');
const hostBtn = document.querySelector('.host');

const categoryInput = document.querySelector('.custom-category');
const categoryBtn = document.querySelector('.add-category');
const categoriesContainer = document.querySelector('.categories');

const playersNumber = document.querySelector('.players-number');
const roundsNumber = document.querySelector('.round-input');
const roundTime = document.querySelector('.round-time');
const playersContainer = document.querySelector('.players');

categoryBtn.addEventListener('click', () => {
  categoriesContainer.insertAdjacentHTML(
    'beforeend',
    `<input type="checkbox" id="${categoryInput.value}" class="checkbox" />
  <label class="checkbox-label" for="${categoryInput.value}"> ${categoryInput.value} </label>`,
  );

  categoryInput.value = '';
});

hostBtn.addEventListener('click', () => {
  const checkboxes = document.querySelectorAll('.checkbox');

  let categories = [];

  checkboxes.forEach((checkbox) => {
    checkbox.checked ? categories.push(checkbox.id) : null;
  });

  if (categories.length < 2 || roundsNumber.value < 1 || roundsNumber.value > 10) {
    info.textContent = 'Select at least 2 categories and enter number of rounds between 1 and 10!';
    info.classList.remove('inactive');
    categories = [];
  } else {
    info.textContent = 'Wait for other players...';
    container.classList.add('inactive');
    timerContainer.classList.remove('inactive');
    timerContainer.classList.remove('inactive');
    socket.emit('host', { categories: categories, playersNumber: playersNumber.value, rounds: roundsNumber.value, time: roundTime.value });
  }
});

socket.on('setcode', ({ code, id }) => {
  if (id === socket.id) {
    history.pushState('', '', `/${code}`);
    playersContainer.classList.remove('inactive');
    joinAddress.innerText = `Join address: ${window.location.href}`;
  }
});
