const game = new Game({
  debug: true
});
game.init();

const current_score = document.getElementsByClassName('current-score')[0];
const mask = document.getElementsByClassName('mask')[0];
const score = mask.getElementsByClassName('score')[0];
const restartBtn = mask.getElementsByClassName('restart')[0];

game.addSuccessFn(function (score) {
  current_score.innerHTML = score;
});
game.addFailedFn(function () {
  mask.style.display = 'flex';
  score.innerText = game.score;
});
restartBtn.addEventListener('click', function () {
  mask.style.display = 'none';
  game._restart();
});