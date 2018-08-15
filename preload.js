setInterval(function() {
  const gameFrame = document.getElementById("game_frame");
  if (gameFrame) {
    $(gameFrame).css('position', 'fixed');
    $(gameFrame).css('left', '50%');
    $(gameFrame).css('top', '-16px');
    $(gameFrame).css('margin-left', '-450px');
    $(gameFrame).css('z-index', '1');
    $(document.body).css('margin', '0');
    $(document.body).css('overflow', 'hidden');
  }
}, 1000);
