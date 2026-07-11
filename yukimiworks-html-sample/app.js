(() => {
  'use strict';

  const root = document.documentElement;
  const siteRoot = document.querySelector('#siteRoot');
  const tagline = document.querySelector('#tagline');
  const characterButton = document.querySelector('#characterButton');
  const characterImage = document.querySelector('#characterImage');
  const bubble = document.querySelector('#characterBubble');
  const themeSelect = document.querySelector('#themeSelect');
  const eventSelect = document.querySelector('#eventSelect');
  const debugPanel = document.querySelector('#debugPanel');

  const DEFAULT_TAGLINE = '小さなアイデアを形にする';
  const welcomeMessages = [
    'いらっしゃいませ',
    '今日も開発中です',
    '新しい作品が追加されました',
    'ゆっくり見ていってください',
  ];

  const iconFolders = {
    none: 'default',
    lunch: 'food',
    snack: 'sweets',
    'sleep-warning': 'default',
  };

  let regularTimer = null;
  let bubbleTimer = null;
  let pokeTimer = null;
  let clickMotionTimer = null;
  let lastMessageIndex = -1;
  let specialMessageActive = false;
  let forcedTheme = 'auto';
  let forcedEvent = 'auto';

  function getTokyoParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).reduce((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});
    return {
      dateKey: `${parts.year}-${parts.month}-${parts.day}`,
      hour: Number(parts.hour),
      minute: Number(parts.minute),
    };
  }

  function resolveTheme(hour) {
    if (hour >= 5 && hour < 7) return 'early-morning';
    if (hour >= 7 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 17) return 'day';
    if (hour >= 17 && hour < 19) return 'evening';
    if (hour >= 19) return 'night';
    return 'late-night';
  }

  function inRange(hour, minute, startHour, endMinute) {
    return hour === startHour && minute <= endMinute;
  }

  function drawStoredEvent(dateKey, eventName, probability) {
    const key = `yukimi-event:${dateKey}:${eventName}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored === 'active' || stored === 'inactive') return stored === 'active';
      const active = Math.random() < probability;
      localStorage.setItem(key, active ? 'active' : 'inactive');
      return active;
    } catch {
      return Math.random() < probability;
    }
  }

  function resolveEvent(parts) {
    if (inRange(parts.hour, parts.minute, 2, 30) && drawStoredEvent(parts.dateKey, 'sleep-warning', 0.01)) {
      return 'sleep-warning';
    }
    if (inRange(parts.hour, parts.minute, 15, 30) && drawStoredEvent(parts.dateKey, 'snack', 0.05)) {
      return 'snack';
    }
    if (inRange(parts.hour, parts.minute, 12, 30) && drawStoredEvent(parts.dateKey, 'lunch', 0.05)) {
      return 'lunch';
    }
    return 'none';
  }

  function updateIcons(eventName) {
    const folder = iconFolders[eventName] || 'default';
    document.querySelectorAll('[data-icon]').forEach((img) => {
      const iconName = img.dataset.icon;
      img.src = `./assets/icons/${folder}/${iconName}.png`;
    });
  }

  function applyTheme() {
    const parts = getTokyoParts();
    const theme = forcedTheme === 'auto' ? resolveTheme(parts.hour) : forcedTheme;
    const eventName = forcedEvent === 'auto' ? resolveEvent(parts) : forcedEvent;

    root.dataset.theme = theme;
    root.dataset.event = eventName;
    siteRoot.dataset.theme = theme;
    siteRoot.dataset.event = eventName;

    if (eventName === 'sleep-warning') tagline.textContent = 'はやく寝ろ';
    else if (eventName === 'lunch') tagline.textContent = 'おいしいごはんをいただきます';
    else tagline.textContent = DEFAULT_TAGLINE;

    updateIcons(eventName);
  }

  function showBubble(message, duration = 4000, isSpecial = false) {
    clearTimeout(bubbleTimer);
    bubble.textContent = message;
    bubble.hidden = false;
    requestAnimationFrame(() => bubble.classList.add('is-visible'));

    bubbleTimer = window.setTimeout(() => {
      bubble.classList.remove('is-visible');
      window.setTimeout(() => { bubble.hidden = true; }, 240);
      if (isSpecial) {
        specialMessageActive = false;
        scheduleRegularMessage(randomBetween(10000, 18000));
      }
    }, duration);
  }

  function chooseRegularMessage() {
    let index = Math.floor(Math.random() * welcomeMessages.length);
    if (welcomeMessages.length > 1 && index === lastMessageIndex) {
      index = (index + 1 + Math.floor(Math.random() * (welcomeMessages.length - 1))) % welcomeMessages.length;
    }
    lastMessageIndex = index;
    return welcomeMessages[index];
  }

  function randomBetween(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  function scheduleRegularMessage(delay = 5000) {
    clearTimeout(regularTimer);
    regularTimer = window.setTimeout(() => {
      if (document.hidden || specialMessageActive) {
        scheduleRegularMessage(2000);
        return;
      }
      showBubble(chooseRegularMessage(), 4000, false);
      scheduleRegularMessage(4000 + randomBetween(10000, 18000));
    }, delay);
  }

  function drawClickMessage() {
    const roll = Math.random() * 100;
    if (roll < 2) return '暇ですね';
    if (roll < 12) return '怒りますよ';
    if (roll < 22) return 'あまりつつかないでください';
    return null;
  }

  function handleCharacterClick() {
    characterImage.src = './assets/character-poked-placeholder.png';

    // 位置移動はクリック直後の約120msだけ。表情変更時間とは分離する。
    clearTimeout(clickMotionTimer);
    characterButton.classList.remove('is-clicked');
    void characterButton.offsetWidth;
    characterButton.classList.add('is-clicked');
    clickMotionTimer = window.setTimeout(() => {
      characterButton.classList.remove('is-clicked');
    }, 140);

    clearTimeout(pokeTimer);
    pokeTimer = window.setTimeout(() => {
      characterImage.src = './assets/character-default.png';
    }, 2500);

    const special = drawClickMessage();
    if (special) {
      specialMessageActive = true;
      clearTimeout(regularTimer);
      showBubble(special, 3000, true);
    }
  }

  const params = new URLSearchParams(location.search);
  if (params.get('debug') === '1') debugPanel.dataset.visible = 'true';
  if (params.has('theme')) forcedTheme = params.get('theme');
  if (params.has('event')) forcedEvent = params.get('event');
  themeSelect.value = forcedTheme;
  eventSelect.value = forcedEvent;

  themeSelect.addEventListener('change', () => { forcedTheme = themeSelect.value; applyTheme(); });
  eventSelect.addEventListener('change', () => { forcedEvent = eventSelect.value; applyTheme(); });
  characterButton.addEventListener('click', handleCharacterClick);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !specialMessageActive) scheduleRegularMessage(2000);
  });

  applyTheme();
  scheduleRegularMessage(5000);
  window.setInterval(applyTheme, 60000);
})();
