function updateShipStatus(ships) {
  ships.forEach(function(ship) {
    const id = ship.id();
    $('#ship_' + id + '_level').html(ship.level());
    $('#ship_' + id + '_name').html(ship.name());

    const hp = ship.hp();
    $('#ship_' + id + '_hp_numerator').html(hp.numerator());
    $('#ship_' + id + '_hp_denominator').html(hp.denominator());
    $('#ship_' + id + '_hp_percentage').css('width', (hp.value() * 100) + '%');
    $('#ship_' + id + '_hp_percentage').css('background-color', barColor(hp));

    const cond = ship.cond();
    $('#ship_' + id + '_cond').html(ship.cond());
    const condIconColor = cond > 49 ? 'yellow' : 'white';
    $('#ship_' + id + '_cond_icon').css('background-color', condIconColor);

    $('#ship_' + id + '_next_exp').html(ship.next_exp());

    const fuel = ship.fuel();
    $('#ship_' + id + '_fuel_percentage').css('width', (fuel.value() * 100) + '%');
    $('#ship_' + id + '_fuel_percentage').css('background-color', barColor(fuel));

    const bull = ship.bull();
    $('#ship_' + id + '_bull_percentage').css('width', (bull.value() * 100) + '%');
    $('#ship_' + id + '_bull_percentage').css('background-color', barColor(bull));

    $('#ship_' + id + '_type').html(ship.type().toString());

    $('#ship_' + id + '_karyoku').html(ship.karyoku().numerator());
    $('#ship_' + id + '_raisou').html(ship.raisou().numerator());
    $('#ship_' + id + '_taiku').html(ship.taiku().numerator());
    $('#ship_' + id + '_soukou').html(ship.soukou().numerator());
    $('#ship_' + id + '_lucky').html(ship.lucky().numerator());
    $('#ship_' + id + '_sakuteki').html(ship.sakuteki().numerator());
    $('#ship_' + id + '_taisen').html(ship.taisen().numerator());

    $('#ship_' + id + '_soku').html(ship.soku().toString());
    const repair_seconds = ship.repair_seconds();
    if (repair_seconds > 0) {
      $('#ship_' + id + '_repair').html(timeLabel(repair_seconds));
    } else {
      $('#ship_' + id + '_repair').html('');
    }
  });
}

function updateSlotitemStatus(slotitems) {
  slotitems.forEach(function(slotitem) {
    const id = slotitem.id();
    const element = $('#slotitem_' + id + '_icon');
    element.attr('title', slotitem.name());
    element.css('background-image', "url('img/" + slotitem.type() + ".svg')");
  });
}

function barColor(rat) {
  return rat.value() >= 0.75 ? '#0f0' : (rat.value() >= 0.5 ? 'yellow' : (rat.value() >= 0.25 ? 'orange' : 'red'));
}

function timeLabel(seconds_) {
  var label = "";
  var seconds = Math.floor(seconds_ / 1000);
  const h = Math.floor(seconds / 3600);
  if (h > 0) {
    label += h + ':';
  }
  seconds -= h * 3600;
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  if (label == '') {
    label += m + ':';
  } else {
    label += sprintf('%02d:', m);
  }
  label += sprintf('%02d', s);
  return label;
}
