function updateShipStatus(ships) {
  ships.forEach(function(ship) {
    const id = ship.id();
    $('.ship_' + id + '_level').html(ship.level());
    $('.ship_' + id + '_name').html(ship.name());

    const hp = ship.hp();
    $('.ship_' + id + '_hp_numerator').html(hp.numerator());
    $('.ship_' + id + '_hp_denominator').html(hp.denominator());
    $('.ship_' + id + '_hp_percentage').css('width', (hp.value() * 100) + '%');
    $('.ship_' + id + '_hp_percentage').css('background-color', barColor(hp));

    const cond = ship.cond();
    $('.ship_' + id + '_cond').html(ship.cond());
    const condIconColor = cond > 49 ? 'yellow' : 'white';
    $('.ship_' + id + '_cond_icon').css('background-color', condIconColor);

    $('.ship_' + id + '_next_exp').html(ship.next_exp());

    const fuel = ship.fuel();
    $('.ship_' + id + '_fuel_percentage').css('width', (fuel.value() * 100) + '%');
    $('.ship_' + id + '_fuel_percentage').css('background-color', barColor(fuel));

    const bull = ship.bull();
    $('.ship_' + id + '_bull_percentage').css('width', (bull.value() * 100) + '%');
    $('.ship_' + id + '_bull_percentage').css('background-color', barColor(bull));

    $('.ship_' + id + '_type').html(ship.type().toString());

    $('.ship_' + id + '_karyoku').html(ship.karyoku().numerator());
    $('.ship_' + id + '_raisou').html(ship.raisou().numerator());
    $('.ship_' + id + '_taiku').html(ship.taiku().numerator());
    $('.ship_' + id + '_soukou').html(ship.soukou().numerator());
    $('.ship_' + id + '_lucky').html(ship.lucky().numerator());
    $('.ship_' + id + '_sakuteki').html(ship.sakuteki().numerator());
    $('.ship_' + id + '_taisen').html(ship.taisen().numerator());

    $('.ship_' + id + '_soku').html(ship.soku().toString());
    const repair_seconds = ship.repair_seconds();
    if (repair_seconds > 0) {
      $('.ship_' + id + '_repair').html(timeLabel(repair_seconds));
    } else {
      $('.ship_' + id + '_repair').html('');
    }
  });
}

function shipToString(ship) {
  const json = {
    // 'id': ship.id(),
    'level': ship.level(),
    // 'name': ship.name(),
    'hp': ship.hp().toString(),
    'cond': ship.cond(),
    'next_exp': ship.next_exp(),
    'fuel': ship.fuel().toString(),
    'bull': ship.bull().toString(),
    // 'type': ship.type().value(),
    'karyoku': ship.karyoku().toString(),
    'raisou': ship.raisou().toString(),
    'taiku': ship.taiku().toString(),
    'soukou': ship.soukou().toString(),
    'lucky': ship.lucky().toString(),
    'sakuteki': ship.sakuteki().toString(),
    'taisen': ship.taisen().toString(),
    'soku': ship.soku().value(),
    'repair': ship.repair_seconds(),
    'slotitems': ship.slotitems().map((slotitem) => slotitem.id()).join(','),
    'locked': ship.locked(),
  };
  return JSON.stringify(json);
};

function updateSlotitemStatus(slotitems) {
  slotitems.forEach(function(slotitem) {
    const id = slotitem.id();
    const element = $('.slotitem_' + id + '_icon');
    element.css('background-image', "url('img/" + slotitem.type() + ".svg')");

    var title = slotitem.name();

    const level = slotitem.level();
    var level_label = '';
    var level_background = level > 0 ? 'rgba(0, 0, 0, 0.3)' : 'transparent';
    if (level == 10) {
      level_label = '★max';
    } else if (level > 0) {
      level_label = '★' + level;
    }
    if (level_label != '') {
      title += ' ' + level_label;
    }
    const $level_element = $('.slotitem_' + id + '_level');
    $level_element.html(level_label);
    $level_element.css('background-color', level_background);

    const $proficiency_element = $('.slotitem_' + id + '_proficiency');
    const proficiency = slotitem.proficiency();
    var proficiency_label = '';
    var proficiency_color = '';
    if (proficiency > 0) {
      proficiency_label = '+' + proficiency;
      if (proficiency > 3) {
        proficiency_color = 'rgb(212, 156, 15)';
      } else {
        proficiency_color = 'rgb(152, 179, 206)';
      }
      $proficiency_element.css('background-color', 'rgba(0, 0, 0, 0.3)');
    } else {
      $proficiency_element.css('background-color', 'transparent');
    }
    $proficiency_element.html(proficiency_label);
    $proficiency_element.css('color', proficiency_color);
    if (proficiency_label != '') {
      title += ' (' + proficiency_label + ')';
    }

    element.attr('title', title);
  });
}

function barColor(rat) {
  return rat.value() > 0.75 ? '#0f0' : (rat.value() > 0.5 ? 'yellow' : (rat.value() > 0.25 ? 'orange' : 'red'));
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
