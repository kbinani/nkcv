setInterval(function() {
  const gameFrame = $('#game_frame');
  if (gameFrame) {
    $(gameFrame).css('position', 'fixed');
    $(gameFrame).css('left', '0px');
    $(gameFrame).css('top', '-16px');
    $(gameFrame).css('z-index', '1');
    $(document.body).css('margin', '0');
    $(document.body).css('overflow', 'hidden');
  }

  const ntgRecommend = $('#ntg-recommend');
  if (ntgRecommend) {
    $(ntgRecommend).css('display', 'hidden');
  }
}, 1000);
