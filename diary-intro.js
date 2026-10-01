(() => {
  'use strict';

  const intro = document.getElementById('diaryIntro');
  const introSeenKey = 'my-little-day-intro-seen';
  const date = document.getElementById('diaryIntroDate');
  const openButton = document.getElementById('diaryIntroOpen');
  const loading = document.getElementById('diaryIntroLoading');
  const loadingBlocks = [...(loading?.querySelectorAll('.diary-intro-loading__blocks span') || [])];
  const months = ['JAN.', 'FEB.', 'MAR.', 'APR.', 'MAY.', 'JUN.', 'JUL.', 'AUG.', 'SEP.', 'OCT.', 'NOV.', 'DEC.'];

  if (!intro || !date || !openButton || !loading) return;

  let introSeen = false;
  try {
    introSeen = sessionStorage.getItem(introSeenKey) === 'true';
  } catch {}
  if (introSeen) {
    intro.hidden = true;
    return;
  }
  document.documentElement.classList.add('diary-intro-pending');

  const today = new Date();
  const formattedDate = `${months[today.getMonth()]} ${String(today.getDate()).padStart(2, '0')} ${today.getFullYear()}`;
  date.dateTime = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  date.textContent = formattedDate;

  function closeIntro() {
    intro.classList.add('diary-intro--leaving');
    window.setTimeout(() => {
      intro.hidden = true;
      document.documentElement.classList.remove('diary-intro-pending');
    }, 320);
  }

  function fillLoadingBlock(index) {
    const block = loadingBlocks[index];
    if (!block) {
      window.setTimeout(closeIntro, 180);
      return;
    }

    block.style.borderColor = '#a18fcb';
    block.style.background = '#b9c9ee';
    if (index === loadingBlocks.length - 1) {
      window.setTimeout(closeIntro, 180);
      return;
    }
    window.setTimeout(() => fillLoadingBlock(index + 1), 205);
  }

  openButton.addEventListener('click', () => {
    if (openButton.disabled) return;

    openButton.disabled = true;
    try {
      sessionStorage.setItem(introSeenKey, 'true');
    } catch {}
    loading.classList.remove('diary-intro-loading--active');
    loadingBlocks.forEach(block => {
      block.style.removeProperty('border-color');
      block.style.removeProperty('background');
    });
    loading.hidden = false;
    window.setTimeout(() => fillLoadingBlock(0), 80);
  });
})();
