// ===== 글로벌 상태 =====
let parsedCoverages = [];
let customerInfo = {};

// ===== 탭 전환 =====
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('content-' + tabId).classList.add('active');
  document.getElementById('tab-' + tabId).classList.add('active');
  window.scrollTo(0, 0);
}

// ===== 헤더 업데이트 =====
function updateHeader() {
  const planner = document.getElementById('plannerName').value.trim();
  const customer = document.getElementById('customerName').value.trim();
  const branch = document.getElementById('branchName').value.trim();
  document.getElementById('headerPlanner').textContent = planner ? `🙋 ${branch ? branch + ' ' : ''}${planner} 플래너` : '🙋 플래너명을 입력하세요';
  document.getElementById('headerCustomer').textContent = customer ? `👤 ${customer} 고객님` : '👤 고객명을 입력하세요';
}

// ===== 데이터 파싱 =====
function parseData() {
  const raw = document.getElementById('pasteArea').value.trim();
  if (!raw) { alert('데이터를 먼저 붙여넣기 해주세요.'); return; }

  document.getElementById('loadingOverlay').classList.add('active');

  setTimeout(() => {
    try {
      const lines = raw.split('\n').map(l => l.trim()).filter(l => l);
      const coverages = [];

      // 컬럼 인덱스 자동 감지
      let headerRow = -1;
      let colMap = {};
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const cols = lines[i].split('\t');
        const headerIdx = detectHeaderColumns(cols);
        if (headerIdx.code !== -1 || headerIdx.name !== -1) {
          headerRow = i;
          colMap = headerIdx;
          break;
        }
      }

      // 헤더 없는 경우 기본 매핑 사용
      if (headerRow === -1) {
        colMap = { code: 3, name: 4, period: 7, amount: 8, premium: 9 };
      }

      // 상품명 추출 (헤더 전 라인)
      for (let i = 0; i < Math.min(headerRow === -1 ? 0 : headerRow, lines.length); i++) {
        const cols = lines[i].split('\t');
        if (cols[0] === '상품명' && cols[1]) {
          document.getElementById('productName').value = cols[1].trim();
        }
      }

      // 데이터 행 파싱
      const startRow = headerRow === -1 ? 0 : headerRow + 1;
      for (let i = startRow; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        if (cols.length < 4) continue;

        const code = colMap.code >= 0 ? (cols[colMap.code] || '').trim() : '';
        const name = colMap.name >= 0 ? (cols[colMap.name] || '').trim() : '';
        const amount = parseInt((colMap.amount >= 0 ? cols[colMap.amount] : cols[cols.length - 2] || '0').replace(/[^0-9]/g, '')) || 0;
        const premium = parseInt((colMap.premium >= 0 ? cols[colMap.premium] : cols[cols.length - 1] || '0').replace(/[^0-9]/g, '')) || 0;
        const period = colMap.period >= 0 ? (cols[colMap.period] || '').trim() : '';

        if (!name || name === '담보명') continue;
        if (amount === 0 && premium === 0) continue;

        const cat = findCategory(name);
        coverages.push({ code, name, amount, premium, period, cat });
      }

      if (coverages.length === 0) {
        alert('담보 데이터를 찾지 못했습니다.\n데이터 형식을 확인해주세요.');
        document.getElementById('loadingOverlay').classList.remove('active');
        return;
      }

      parsedCoverages = coverages;
      renderResults(coverages);
      renderAllSections(coverages);

    } catch (e) {
      alert('데이터 파싱 오류: ' + e.message);
    } finally {
      document.getElementById('loadingOverlay').classList.remove('active');
    }
  }, 100);
}

function detectHeaderColumns(cols) {
  const result = { code: -1, name: -1, period: -1, amount: -1, premium: -1 };
  cols.forEach((col, idx) => {
    const c = col.trim();
    if (c === '담보' || c === '담보코드') result.code = idx;
    else if (c === '담보명') result.name = idx;
    else if (c.includes('납기') || c.includes('만기')) result.period = idx;
    else if (c === '가입금액') result.amount = idx;
    else if (c === '보험료') result.premium = idx;
  });
  return result;
}

// 카테고리 아이콘 맵 (전역)
const CAT_ICONS = {
  '암': '🔬', '뇌': '🧠', '심': '❤️', '상해': '🛡️',
  '운전자': '🚗', '입원일당': '🏥', '수술': '⚕️',
  '납입면제': '✅', '기타': '📋'
};

// QR코드 URL (앱 주소)
const APP_URL = 'https://comdoctor76-droid.github.io/Smart_proposal/';

// 탭별 QR 링크
const TAB_QR_URLS = {
  allinone: APP_URL + '?tab=allinone',
  cancer:   APP_URL + '?tab=cancer',
  brain:    APP_URL + '?tab=brain',
  heart:    APP_URL + '?tab=heart',
  death:    APP_URL + '?tab=death',
  onepager: APP_URL + '?tab=onepager',
  injury:   APP_URL + '?tab=injury',
  driver:   APP_URL + '?tab=driver',
  daily:    APP_URL + '?tab=daily',
  woman:    APP_URL + '?tab=woman',
  surgery:  APP_URL + '?tab=surgery',
};

function openTabQR(tabId) {
  const url = TAB_QR_URLS[tabId] || APP_URL;
  var a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function initTabQRs() {
  Object.entries(TAB_QR_URLS).forEach(([tabId, url]) => {
    const img = document.getElementById('tab-qr-' + tabId);
    if (img) {
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(url)}&margin=2`;
    }
  });
}

// ===== 결과 테이블 렌더링 =====
function renderResults(coverages) {
  const tbody = document.getElementById('resultBody');
  tbody.innerHTML = '';

  let totalPremium = 0;
  const catCounts = {};

  coverages.forEach((cov, idx) => {
    const cat = cov.cat;
    const catName = cat ? cat.cat : '기타';
    catCounts[catName] = (catCounts[catName] || 0) + 1;
    totalPremium += cov.premium;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--text-light); font-size:11px; white-space:nowrap; width:4%;">${idx + 1}</td>
      <td style="width:10%;"><span class="cat-badge cat-${catName}" style="font-size:10px;">${catName.charAt(0)}</span></td>
      <td style="font-size:14px; font-weight:700; width:55%;">${cov.name}</td>
      <td class="amount-cell" style="white-space:nowrap; width:15%; font-size:13px;">${formatManwon(toManwon(cov.amount))}</td>
      <td class="premium-cell" style="white-space:nowrap; width:16%;">${cov.premium.toLocaleString()}원</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('resultCount').textContent = `총 ${coverages.length}개 담보`;
  document.getElementById('resultCard').style.display = 'block';

  // 통계 렌더링
  renderStats(catCounts, totalPremium);
}

function toggleCatDetail(cat) {
  const panel = document.getElementById('catDetailPanel');
  const allCards = document.querySelectorAll('.stat-card');
  const clickedCard = document.querySelector(`.stat-card[data-cat="${cat}"]`);

  const grandTotalPrem  = parsedCoverages.reduce((s, c) => s + c.premium, 0);
  const grandTotalCount = parsedCoverages.length;

  function restoreDefaultSummary() {
    const s = document.getElementById('premiumSummary');
    if (!s) return;
    s.innerHTML = `
      <div class="premium-item main">
        <div class="premium-item-label">월 보험료 합계</div>
        <div class="premium-item-value">${Math.round(grandTotalPrem).toLocaleString()}원</div>
      </div>
      <div class="premium-item">
        <div class="premium-item-label">담보 수</div>
        <div class="premium-item-value">${grandTotalCount}개</div>
      </div>`;
  }

  if (panel._activeCat === cat && panel.style.display !== 'none') {
    panel.style.display = 'none';
    panel._activeCat = '';
    allCards.forEach(c => c.classList.remove('active'));
    restoreDefaultSummary();
    return;
  }

  allCards.forEach(c => c.classList.remove('active'));
  if (clickedCard) clickedCard.classList.add('active');
  panel._activeCat = cat;

  const catColors = {
    '암': '#CC0000', '뇌': '#3300CC', '심': '#CC0066', '상해': '#006699',
    '운전자': '#336600', '입원일당': '#996600', '수술': '#660099',
    '납입면제': '#555', '기타': '#999'
  };
  const color = catColors[cat] || '#999';
  const catCovs = parsedCoverages.filter(c => c.cat && c.cat.cat === cat);
  const totalAmt  = catCovs.reduce((s, c) => s + c.amount, 0);
  const totalPrem = catCovs.reduce((s, c) => s + c.premium, 0);

  // 하단 요약 → 카테고리별 3-박스로 업데이트 (데스크탑에서 3열)
  const summary = document.getElementById('premiumSummary');
  if (summary) {
    summary.innerHTML = `
      <div class="premium-item main">
        <div class="premium-item-label">${cat} 보험료 합계</div>
        <div class="premium-item-value">${Math.round(totalPrem).toLocaleString()}원</div>
      </div>
      <div class="premium-item">
        <div class="premium-item-label">${cat} 담보</div>
        <div class="premium-item-value">${catCovs.length}개</div>
      </div>
      <div class="premium-item">
        <div class="premium-item-label">월 보험료 합계</div>
        <div class="premium-item-value">${Math.round(grandTotalPrem).toLocaleString()}원</div>
      </div>`;
  }

  // 담보 목록 — 표 형태로 컬럼 정렬
  let rowsHtml;
  if (catCovs.length === 0) {
    rowsHtml = '<div style="padding:10px 0;color:#999;font-size:13px;">해당 담보가 없습니다.</div>';
  } else {
    rowsHtml = `
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:4px 8px 6px 0;font-size:10px;color:#bbb;font-weight:600;border-bottom:1px solid #eee;">담보명</th>
            <th style="text-align:right;padding:4px 0 6px;font-size:10px;color:#bbb;font-weight:600;border-bottom:1px solid #eee;white-space:nowrap;width:80px;">보장금액</th>
            <th style="text-align:right;padding:4px 0 6px 12px;font-size:10px;color:#bbb;font-weight:600;border-bottom:1px solid #eee;white-space:nowrap;width:90px;">월 보험료</th>
          </tr>
        </thead>
        <tbody>
          ${catCovs.map(c => `
            <tr>
              <td style="padding:6px 8px 6px 0;font-size:13px;border-bottom:1px solid #f5f5f5;word-break:keep-all;">${c.name}</td>
              <td style="padding:6px 0;text-align:right;font-weight:700;color:${color};white-space:nowrap;font-size:13px;border-bottom:1px solid #f5f5f5;">${formatManwon(toManwon(c.amount))}</td>
              <td style="padding:6px 0 6px 12px;text-align:right;color:#999;white-space:nowrap;font-size:12px;border-bottom:1px solid #f5f5f5;">${c.premium.toLocaleString()}원</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  }

  panel.innerHTML = `
    <div style="display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:10px;">
      <span style="font-weight:700;font-size:14px;color:${color};">${CAT_ICONS[cat]||'📋'} ${cat} 담보 ${catCovs.length}개</span>
      <span style="font-size:12px;color:#888;">보장금액 합계 <strong style="color:${color};">${formatManwon(toManwon(totalAmt))}</strong></span>
      <span style="font-size:12px;color:#888;">${cat} 보험료 <strong style="color:#555;">${Math.round(totalPrem).toLocaleString()}원</strong></span>
    </div>
    ${rowsHtml}`;
  panel.style.display = 'block';
  panel.style.animation = 'none';
  requestAnimationFrame(() => { panel.style.animation = 'slideDown 0.25s ease'; });
}

function renderStats(catCounts, totalPremium) {
  const catColors = {
    '암': '#CC0000', '뇌': '#3300CC', '심': '#CC0066', '상해': '#006699',
    '운전자': '#336600', '입원일당': '#996600', '수술': '#660099',
    '납입면제': '#555', '기타': '#999'
  };

  const panel = document.getElementById('catDetailPanel');
  if (panel) { panel.style.display = 'none'; panel._activeCat = ''; }

  const grid = document.getElementById('statsGrid');
  grid.innerHTML = '';
  Object.entries(catCounts).forEach(([cat, count]) => {
    const icon = CAT_ICONS[cat] || '📋';
    const color = catColors[cat] || '#999';
    const div = document.createElement('div');
    div.className = 'stat-card';
    div.dataset.cat = cat;
    div.setAttribute('onclick', `toggleCatDetail('${cat}')`);
    div.innerHTML = `<div class="stat-num" style="color:${color}">${icon} ${count}</div><div class="stat-label">${cat}</div>`;
    grid.appendChild(div);
  });

  const summary = document.getElementById('premiumSummary');
  summary.innerHTML = `
    <div class="premium-item main">
      <div class="premium-item-label">월 보험료 합계</div>
      <div class="premium-item-value">${Math.round(totalPremium).toLocaleString()}원</div>
    </div>
    <div class="premium-item">
      <div class="premium-item-label">담보 수</div>
      <div class="premium-item-value">${Object.values(catCounts).reduce((a, b) => a + b, 0)}개</div>
    </div>
  `;

  document.getElementById('summaryCard').style.display = 'block';
}

// ===== 카테고리별 그룹핑 =====
function groupByCategory(coverages) {
  const groups = {};
  coverages.forEach(cov => {
    const catName = cov.cat ? cov.cat.cat : '기타';
    const subName = cov.cat ? cov.cat.sub : '기타';
    const groupName = cov.cat ? cov.cat.group : '기타';
    if (!groups[catName]) groups[catName] = {};
    if (!groups[catName][subName]) groups[catName][subName] = {};
    if (!groups[catName][subName][groupName]) groups[catName][subName][groupName] = [];
    groups[catName][subName][groupName].push(cov);
  });
  return groups;
}

function getCatCoverages(coverages, cat) {
  return coverages.filter(c => c.cat && c.cat.cat === cat);
}

function sumAmounts(coverages) {
  return coverages.reduce((sum, c) => sum + c.amount, 0);
}

function sumPremiums(coverages) {
  return coverages.reduce((sum, c) => sum + c.premium, 0);
}

// 커버리지 목록 HTML 생성
function makeCoverageList(items, titleClass = '') {
  if (!items || items.length === 0) return '<div style="padding:10px 14px; color:#999; font-size:12px;">해당 담보 없음</div>';
  return items.map(c => `
    <div class="coverage-item">
      <span class="coverage-label" style="font-size:12px;">${c.cat ? c.cat.label : c.name}</span>
      <span class="coverage-amount ${c.amount === 0 ? 'zero' : ''}">${formatManwon(toManwon(c.amount))}</span>
    </div>
  `).join('');
}

// ===== 접이식 제안서 컬럼 =====
let _colSec = 0;

function _colItemsHtml(items) {
  if (!items || items.length === 0)
    return '<div style="padding:10px 16px;color:#999;font-size:12px;">해당 담보 없음</div>';
  return items.map(c => `
    <div style="display:flex;align-items:center;padding:7px 14px;border-bottom:1px solid #f5f5f5;gap:8px;">
      <span style="flex:1;font-size:12px;">${c.cat ? c.cat.label : c.name}</span>
      <span style="font-weight:700;color:var(--orange);white-space:nowrap;font-size:12px;">${formatManwon(toManwon(c.amount))}</span>
      <span style="color:#999;white-space:nowrap;font-size:11px;">${c.premium.toLocaleString()}원</span>
    </div>`).join('');
}

function makeCollapsibleCol(num, title, items, hClass, totalOverride) {
  const id = 'cs' + (++_colSec);
  const tot = totalOverride !== undefined ? totalOverride
    : (sumAmounts(items) > 0 ? formatManwon(toManwon(sumAmounts(items))) : items.length + '개');
  return `
    <div class="proposal-col">
      <div class="col-header ${hClass||''}" onclick="toggleColSection('${id}')"
           style="cursor:pointer;justify-content:space-between;user-select:none;">
        <span>${num} ${title} 총 ${tot}</span>
        <span id="${id}_a" style="font-size:10px;transition:transform 0.25s;display:inline-block;">▼</span>
      </div>
      <div id="${id}" style="display:none;">${_colItemsHtml(items)}</div>
    </div>`;
}

function makeCollapsibleColGroups(num, title, groups, allItems, hClass, totalOverride) {
  const id = 'cs' + (++_colSec);
  const tot = totalOverride !== undefined ? totalOverride
    : (sumAmounts(allItems) > 0 ? formatManwon(toManwon(sumAmounts(allItems))) : allItems.length + '개');
  let rows = '';
  if (Object.keys(groups).length === 0) {
    rows = '<div style="padding:10px 14px;color:#999;font-size:12px;">해당 담보 없음</div>';
  } else {
    Object.entries(groups).forEach(([grp, items]) => {
      rows += `<div class="coverage-group-title">${grp}</div>`;
      items.forEach(c => {
        rows += `<div style="display:flex;align-items:center;padding:7px 14px;border-bottom:1px solid #f5f5f5;gap:8px;">
          <span style="flex:1;font-size:12px;">${c.cat ? c.cat.label : c.name}</span>
          <span style="font-weight:700;color:var(--orange);white-space:nowrap;font-size:12px;">${formatManwon(toManwon(c.amount))}</span>
          <span style="color:#999;white-space:nowrap;font-size:11px;">${c.premium.toLocaleString()}원</span>
        </div>`;
      });
    });
  }
  return `
    <div class="proposal-col">
      <div class="col-header ${hClass||''}" onclick="toggleColSection('${id}')"
           style="cursor:pointer;justify-content:space-between;user-select:none;">
        <span>${num} ${title} 총 ${tot}</span>
        <span id="${id}_a" style="font-size:10px;transition:transform 0.25s;display:inline-block;">▼</span>
      </div>
      <div id="${id}" style="display:none;">${rows}</div>
    </div>`;
}

function toggleColSection(id) {
  const el = document.getElementById(id);
  const ar = document.getElementById(id + '_a');
  if (!el) return;
  const open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  if (ar) ar.style.transform = open ? '' : 'rotate(180deg)';
  if (!open) {
    el.style.animation = 'none';
    requestAnimationFrame(() => { el.style.animation = 'slideDown 0.25s ease'; });
  }
}

// ===== 페이지 헤더 HTML =====
function makePageHeader(icon, title, subtitle) {
  const customer = document.getElementById('customerName').value.trim() || '고객';
  const birth = document.getElementById('customerBirth').value.trim() || '';
  const gender = document.getElementById('customerGender').value || '';
  const planner = document.getElementById('plannerName').value.trim() || '';
  const branch = document.getElementById('branchName').value.trim() || '';
  const product = document.getElementById('productName').value.trim() || '';
  const payment = document.getElementById('paymentInfo').value.trim() || '';
  const today = new Date().toLocaleDateString('ko-KR');
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(APP_URL)}&margin=2`;
  // QR onclick: window.open (PWA에서 a href는 현재창 이동, window.open은 외부 브라우저 오픈)
  const qrClick = `(function(){var a=document.createElement('a');a.href='${APP_URL}';a.target='_blank';a.rel='noopener noreferrer';document.body.appendChild(a);a.click();document.body.removeChild(a);})()`;

  const infoLine = [birth, gender ? gender + '성' : '', branch, planner ? planner + ' 플래너' : '']
    .filter(Boolean).join(' · ');

  return `
    <div class="page-header" style="padding:0; flex-direction:column;">

      <!-- 행1: 회사명 | 제목+부제 | 날짜 -->
      <div style="display:flex; align-items:center; gap:6px; padding:8px 14px 6px; border-bottom:1px solid rgba(255,255,255,0.2);">
        <div style="font-size:9px; opacity:0.7; white-space:nowrap; line-height:1.4;">현대해상<br>화재보험</div>
        <div style="flex:1; text-align:center; padding:0 4px;">
          <div style="font-size:22px; font-weight:800;">${icon} ${title}</div>
          <div style="font-size:10px; opacity:0.85;">${subtitle}</div>
        </div>
        <div style="font-size:10px; opacity:0.8; white-space:nowrap;">${today}</div>
      </div>

      <!-- 행2: 고객정보+상품명(좌) | QR(우) -->
      <div style="display:flex; align-items:center; padding:9px 14px; gap:10px;">
        <div style="flex:1; min-width:0;">
          <div style="font-size:20px; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">< ${customer} > 고객님</div>
          ${infoLine ? `<div style="font-size:11px; opacity:0.85; margin-top:3px;">${infoLine}</div>` : ''}
          ${product ? `<div style="font-size:11px; font-weight:700; opacity:0.95; margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">📌 ${product}${payment ? ' · ' + payment : ''}</div>` : ''}
        </div>
        <img src="${qrUrl}" width="72" height="72"
          style="border-radius:6px; background:white; padding:3px; flex-shrink:0; cursor:pointer; display:block;"
          onclick="${qrClick}"
          alt="QR" onerror="this.style.display='none'">
      </div>

    </div>
  `;
}

// ===== 전체 섹션 렌더링 =====
function renderAllSections(coverages) {
  _colSec = 0;
  renderAllinone(coverages);
  renderDeath(coverages);
  renderInjury(coverages);
  renderOnePager(coverages);
  renderCancer(coverages);
  renderBrain(coverages);
  renderHeart(coverages);
  renderWoman(coverages);
  renderDriver(coverages);
  renderDaily(coverages);
  renderSurgery(coverages);
  scaleDesktopFonts();
}

// 데스크탑(≥769px)에서 제안서 인라인 폰트 +15px
function scaleDesktopFonts() {
  if (window.innerWidth < 769) return;
  document.querySelectorAll('.proposal-page').forEach(page => {
    page.querySelectorAll('[style]').forEach(el => {
      const s = el.getAttribute('style');
      if (!s.includes('font-size')) return;
      el.setAttribute('style', s.replace(/font-size\s*:\s*(\d+(?:\.\d+)?)px/g, (_, n) =>
        `font-size:${parseFloat(n) + 15}px`
      ));
    });
  });
}

// ===== 올인원 렌더링 =====
function renderAllinone(coverages) {
  const container = document.getElementById('allinoneContent');
  const customer = document.getElementById('customerName').value.trim() || '고객';
  const product  = document.getElementById('productName').value.trim() || '';
  const payment  = document.getElementById('paymentInfo').value.trim() || '';
  const totalPremium = sumPremiums(coverages);
  const today = new Date().toLocaleDateString('ko-KR');

  // 키워드 검색 → 금액 포맷
  function byKw(...kws) {
    return coverages.filter(c => kws.some(kw => c.name.includes(kw)));
  }
  function fmtAmt(color, ...kws) {
    const total = sumAmounts(byKw(...kws));
    if (!total) return `<span style="color:#bbb;font-size:10px;">미가입</span>`;
    return `<strong style="color:${color};font-size:14px;">${formatManwon(toManwon(total))}</strong>`;
  }

  // 치료 섹션 빌더
  function makeSection(num, title, subtitle, leftImg, cols, rows, notes) {
    const C = '#FF8800', BG = '#FFF8EE';
    const cw = Math.floor(82 / cols.length);
    const thCells = cols.map(c => `
      <th style="text-align:center;padding:5px 3px;background:${C};border-left:1px solid rgba(255,255,255,0.25);vertical-align:top;">
        <div style="display:inline-block;background:#1a3080;color:white;font-weight:900;font-size:10px;
            padding:2px 8px;border-radius:3px;white-space:nowrap;margin-bottom:4px;">${c.label}</div>
        <div><img src="${c.img}" style="width:70px;height:54px;object-fit:cover;border-radius:3px;display:block;margin:0 auto 3px;"></div>
        <div style="font-size:8px;color:rgba(255,255,255,0.9);line-height:1.3;">${c.desc}</div>
      </th>`).join('');

    const tbRows = rows.map((r, ri) => {
      const bg = ri % 2 ? `background:${BG};` : '';
      const cells = cols.map(c => {
        const val = r.perCol ? fmtAmt(C, ...c.kws) : fmtAmt(C, ...r.kws);
        return `<td style="text-align:center;padding:6px 4px;border-left:1px solid #FF880033;${bg}">${val}</td>`;
      }).join('');
      return `<tr>
        <td style="padding:5px 12px;font-size:10px;font-weight:800;color:#555;white-space:nowrap;${bg}">▶ ${r.label}</td>
        ${cells}
      </tr>`;
    }).join('');

    const noteHtml = notes.map(n =>
      `<div style="background:${BG};padding:3px 10px;font-size:8px;color:#666;border-top:1px solid #FF880022;">※ ${n}</div>`
    ).join('');

    return `
      <div style="border:2px solid ${C};border-radius:6px;margin-bottom:8px;overflow:hidden;">
        <div style="background:${C};color:white;padding:6px 13px;display:flex;align-items:center;gap:9px;">
          <span style="background:white;color:${C};font-weight:900;border-radius:50%;
              width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;
              flex-shrink:0;font-size:12px;">${num}</span>
          <span style="font-size:16px;font-weight:900;">${title}</span>
          ${subtitle ? `<span style="margin-left:auto;font-size:9px;opacity:0.92;font-weight:400;text-align:right;">| ${subtitle}</span>` : ''}
        </div>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
          <colgroup>
            <col style="width:18%">
            ${cols.map(() => `<col style="width:${cw}%">`).join('')}
          </colgroup>
          <thead>
            <tr style="border-bottom:2px solid ${C}99;">
              <th style="background:${BG};text-align:center;padding:8px 4px;vertical-align:middle;">
                <img src="${leftImg}" style="width:78px;height:68px;object-fit:contain;">
              </th>
              ${thCells}
            </tr>
          </thead>
          <tbody>${tbRows}</tbody>
        </table>
        ${noteHtml}
      </div>`;
  }

  // ① 암
  const sec1 = makeSection('①', '암에 걸려도!', '암 진단 + 수술 + 항암치료 보장',
    'images/allinone_0.png',
    [
      { label:'다빈치로봇',   img:'images/allinone_1.png', desc:'비급여(전액본인부담)시', kws:['다빈치로봇'] },
      { label:'표적항암치료', img:'images/allinone_2.png', desc:'비급여(전액본인부담)시', kws:['표적항암'] },
      { label:'면역항암치료', img:'images/allinone_3.png', desc:'비급여(전액본인부담)시', kws:['카티(CAR-T)','면역항암'] },
      { label:'양성자치료',   img:'images/allinone_4.png', desc:'비급여(전액본인부담)시', kws:['양성자'] },
    ],
    [
      { label:'연1회 반복 보장', perCol:true },
      { label:'통원치료비',       perCol:false, kws:['암통원'] },
    ],
    [
      '치료 예약시 최대 1,500만원 선지급 해드리고, 치료 종료 후 추가 지급',
      '상급종합병원에서 일반암으로 치료하는 경우의 보상 예시이며, 병원급 및 갑상선/생식기암등의 세부 보장은 약관내용을 참조',
    ]
  );

  // ② 뇌혈관
  const sec2 = makeSection('②', '뇌혈관질환에 걸려도!', '뇌출혈 + 뇌경색 + 경동맥협착 + 뇌동맥류 등',
    'images/brain_left.png',
    [
      { label:'혈전용해치료',       img:'images/brain_thrombolysis.png', desc:'혈관에 주사하는 약물치료',  kws:['혈전용해치료비'] },
      { label:'혈전제거치료',       img:'images/brain_catheter.png',     desc:'카테터로 혈전을 직접 제거', kws:['심뇌혈관질환주요치료비'] },
      { label:'신의료수술(비관혈)', img:'images/brain_stent.png',        desc:'스텐트삽입, 코일색전술 등', kws:['심뇌혈관질환수술'] },
      { label:'개두수술(관혈)',     img:'images/brain_craniotomy.png',   desc:'클립결찰술, 개두술 등',     kws:['심뇌혈관질환수술'] },
    ],
    [
      { label:'연1회 반복 보장', perCol:true },
      { label:'중환자실 1일이상', perCol:false, kws:['심뇌혈관수술입원일당','심뇌혈관입원일당'] },
    ],
    ['치료 예약시 최대 500만원 선지급 해드리고, 치료 종료 후 추가 지급']
  );

  // ③ 심혈관
  const sec3 = makeSection('③', '심혈관질환에 걸려도!', '협심증 + 심근경색 + 부정맥 + 심장판막질환 + 심부전 등',
    'images/heart_left.png',
    [
      { label:'혈전용해치료', img:'images/heart_thrombolysis.png', desc:'혈관에 주사하는 약물치료',  kws:['혈전용해치료비'] },
      { label:'관상동맥수술', img:'images/heart_coronary.png',    desc:'스텐트삽입술, 풍선확장술', kws:['허혈심장질환수술','심뇌혈관질환수술'] },
      { label:'부정맥수술',   img:'images/heart_arrhythmia.png',  desc:'고주파전극도자/생동시술', kws:['인공심박동기','이식형제세동기','항응고제'] },
      { label:'심장수술',     img:'images/heart_surgery.png',     desc:'인공심박동기 삽입술 등',  kws:['심뇌혈관질환수술','심뇌혈관질환주요치료비'] },
    ],
    [
      { label:'연1회 반복 보장', perCol:true },
      { label:'중환자실 1일이상', perCol:false, kws:['심뇌혈관수술입원일당','심뇌혈관입원일당'] },
    ],
    ['치료 예약시 최대 500만원 선지급 해드리고, 치료 종료 후 추가 지급']
  );

  // ④ 치매 + ⑤ 간병인
  const d1 = fmtAmt('#8833BB', '치매주요치료비');
  const c1 = fmtAmt('#228844', '간병인사용질병입원일당', '간병인사용입원일당');
  const c2 = fmtAmt('#228844', '간호간병통합서비스');

  const sec45 = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
      <div style="border:2px solid #8833BB;border-radius:6px;overflow:hidden;">
        <div style="background:#8833BB;color:white;padding:5px 12px;display:flex;align-items:center;gap:8px;">
          <span style="background:white;color:#8833BB;border-radius:50%;width:22px;height:22px;
              display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;flex-shrink:0;">④</span>
          <span style="font-size:14px;font-weight:900;">치매에 걸려도!</span>
        </div>
        <div style="padding:8px 10px;background:#F9F0FF;">
          <div style="font-size:9px;color:#444;line-height:1.6;margin-bottom:6px;
              border-left:3px solid #8833BB;padding-left:7px;">
            <strong style="color:#8833BB;">레켐비</strong>, 알츠하이머병의 주요 원인물질인 아밀로이드 베타(Aβ)를 제거하는
            기전의 치료제. 치매 진행을 8년 지연시키는 것으로 임상에서 확인.
          </div>
          <div style="display:flex;gap:5px;margin-bottom:7px;font-size:9px;">
            <div style="flex:1;text-align:center;background:#EEE0FF;padding:3px 4px;border-radius:4px;color:#8833BB;font-weight:700;">최초+7회+19회</div>
            <div style="color:#888;align-self:center;font-weight:700;">+</div>
            <div style="flex:1;text-align:center;background:#EEE0FF;padding:3px 4px;border-radius:4px;color:#8833BB;font-weight:700;">매회(최대 36회)</div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:10px;border-top:2px solid #8833BB;">
            <tr>
              <td style="padding:5px 8px;font-weight:800;color:#8833BB;width:55%;">레켐비 치료시 ▶</td>
              <td style="text-align:center;padding:5px 8px;">${d1}</td>
            </tr>
          </table>
        </div>
      </div>
      <div style="border:2px solid #228844;border-radius:6px;overflow:hidden;">
        <div style="background:#228844;color:white;padding:5px 12px;display:flex;align-items:center;gap:8px;">
          <span style="background:white;color:#228844;border-radius:50%;width:22px;height:22px;
              display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;flex-shrink:0;">⑤</span>
          <span style="font-size:14px;font-weight:900;">간병인을 사용해도!</span>
        </div>
        <div style="padding:8px 10px;background:#F0FFF5;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:7px;">
            <img src="images/caregiver.png" style="width:62px;height:54px;object-fit:contain;flex-shrink:0;">
            <div style="font-size:9px;color:#444;line-height:1.7;">
              상해/질병으로 입원하여<br>
              <strong style="color:#228844;font-size:10px;">간병인을 사용하면</strong><br>
              (하루 8만원 이상 사용시 100%)
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:10px;border-top:2px solid #228844;">
            <tr>
              <td style="padding:5px 8px;font-weight:800;color:#228844;width:50%;">1~180일 보장 ▶</td>
              <td style="text-align:center;padding:5px 8px;">${c1} <span style="font-size:8px;color:#888;">1일당</span></td>
            </tr>
            <tr style="background:#E0FFE8;">
              <td style="padding:5px 8px;font-weight:800;color:#228844;">181~365일 보장 ▶</td>
              <td style="text-align:center;padding:5px 8px;">${c2} <span style="font-size:8px;color:#888;">1일당</span></td>
            </tr>
          </table>
        </div>
      </div>
    </div>`;

  // 페이지 헤더
  const pageHeader = `
    <div style="border-bottom:3px solid #FF8800;margin-bottom:10px;padding-bottom:8px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
        <div style="display:flex;align-items:center;gap:7px;">
          <div style="background:#FF8800;color:white;font-weight:900;font-size:13px;
              padding:3px 9px;border-radius:3px;letter-spacing:1px;">H</div>
          <span style="font-weight:900;font-size:13px;color:#333;">현대해상</span>
        </div>
        <span style="font-size:8px;color:#777;max-width:62%;text-align:right;">
          본 자료는 모집자 교육용으로 제작되었으며, 이해를 돕기 위한 예시로써 실제 보험금 지급을 보장하는 것은 아닙니다
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px;">
        <div style="border:2.5px solid #FF8800;padding:4px 14px;border-radius:5px;
            display:inline-flex;align-items:center;gap:7px;">
          <span style="color:#666;font-size:13px;font-weight:700;">치료보장</span>
          <span style="color:#111;font-size:20px;font-weight:900;">스마트 제안서</span>
        </div>
        <span style="font-size:16px;font-weight:900;color:#FF8800;">통합치료비 플랜</span>
        <span style="margin-left:auto;font-size:9px;color:#999;">${today}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;
          background:#FFF8F0;padding:6px 14px;border-radius:5px;border:1.5px solid #FFD090;">
        <span style="font-size:12px;font-weight:700;color:#333;">
          [ ${customer} 고객님 ] ${product}${payment ? ' · ' + payment : ''}
        </span>
        <span style="font-size:13px;font-weight:900;color:#FF8800;border:1.5px solid #FF8800;
            padding:3px 12px;border-radius:4px;white-space:nowrap;">
          보험료 : ${Math.round(totalPremium).toLocaleString()}원
        </span>
      </div>
    </div>`;

  const content = `
    <div style="padding:12px 15px 10px;font-size:11px;">
      ${pageHeader}
      ${sec1}
      ${sec2}
      ${sec3}
      ${sec45}
      <div style="font-size:8px;color:#999;border-top:1px solid #eee;padding-top:5px;margin-top:2px;">
        ⚠️ 위 보장내용은 실제 증권 내용과 다를 수 있으며, 정확한 내용은 보험증권을 확인해 주시기 바랍니다.
      </div>
    </div>`;

  container.innerHTML = `
    <div class="allinone-screen-view">
      <div class="proposal-page">${content}</div>
    </div>
    <div class="allinone-print-view">
      <div class="proposal-page">${content}</div>
    </div>`;
}

// ===== 치료보장 스마트 제안서 공통 헬퍼 =====

function makeSmartTabHdr(tabTitle, customer, product, payment, totalPremium, today) {
  return `
    <div style="border-bottom:3px solid #FF8800;margin-bottom:10px;padding-bottom:8px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
        <span style="font-size:8px;color:#777;max-width:62%;">
          본 자료는 모집자 교육용으로 제작되었으며, 이해를 돕기 위한 예시로써 실제 보험금 지급을 보장하는 것은 아닙니다
        </span>
        <div style="display:flex;align-items:center;gap:5px;">
          <div style="background:#FF8800;color:white;font-weight:900;font-size:13px;padding:2px 7px;border-radius:3px;">H</div>
          <span style="font-weight:900;font-size:12px;color:#333;">현대해상</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <div style="border:2px solid #FF8800;padding:3px 10px;border-radius:4px;display:inline-flex;align-items:center;gap:6px;">
          <span style="color:#666;font-size:11px;font-weight:700;">치료보장</span>
          <span style="color:#111;font-size:16px;font-weight:900;">스마트 제안서</span>
        </div>
        <span style="font-size:14px;font-weight:900;color:#FF8800;">${tabTitle}</span>
        <span style="margin-left:auto;font-size:9px;color:#999;">${today}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;
          background:#FFF8F0;padding:5px 12px;border-radius:5px;border:1.5px solid #FFD090;">
        <span style="font-size:11px;font-weight:700;color:#333;">
          [ ${customer} 고객님 ] ${product}${payment ? ' · ' + payment : ''}
        </span>
        <span style="font-size:12px;font-weight:900;color:#FF8800;border:1.5px solid #FF8800;
            padding:2px 10px;border-radius:4px;white-space:nowrap;">
          보험료 : ${Math.round(totalPremium).toLocaleString()}원
        </span>
      </div>
    </div>`;
}

function makeSmartEnroll(tabId, enrollCols, fmtA, fmtP, note) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(TAB_QR_URLS[tabId]||APP_URL)}&margin=2`;
  const qrClick = `openTabQR('${tabId}')`;
  const colCount = enrollCols.length;
  const colW = Math.floor(72 / colCount);
  const thCells = enrollCols.map(c =>
    `<th style="text-align:center;padding:4px 3px;font-size:10px;border-left:1px solid rgba(255,255,255,0.2);">${c.label}</th>`
  ).join('');
  const amtCells = enrollCols.map(c =>
    `<td style="text-align:center;padding:4px 3px;border-left:1px solid #CDD5E8;">${fmtA(c.kws)}</td>`
  ).join('');
  const premCells = enrollCols.map(c =>
    `<td style="text-align:center;padding:4px 3px;border-left:1px solid #CDD5E8;">${fmtP(c.kws)}</td>`
  ).join('');
  const noteHtml = note
    ? `<tr><td colspan="${colCount + 2}" style="font-size:8px;color:#888;padding:3px 8px;border-top:1px solid #CDD5E8;">※ ${note}</td></tr>`
    : '';
  return `
    <div style="border:1.5px solid #CDD5E8;border-radius:5px;margin-bottom:8px;overflow:hidden;">
      <div style="background:#1a3080;color:white;padding:5px 10px;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;">
        📋 가입내역
      </div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px;">
        <colgroup>
          <col style="width:20%">
          ${enrollCols.map(() => `<col style="width:${colW}%">`).join('')}
          <col style="width:8%">
        </colgroup>
        <thead>
          <tr style="background:#1a3080;color:white;">
            <th style="text-align:center;padding:4px 6px;font-size:10px;">가입담보</th>
            ${thCells}
            <th style="text-align:center;padding:4px 3px;border-left:1px solid rgba(255,255,255,0.2);font-size:9px;">QR</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:#fff;">
            <td style="padding:4px 6px;font-size:10px;font-weight:700;color:#333;border-bottom:1px solid #CDD5E8;">가입금액</td>
            ${amtCells}
            <td rowspan="2" style="text-align:center;vertical-align:middle;border-left:1px solid #CDD5E8;padding:3px;">
              <img src="${qrUrl}" width="60" height="60"
                style="border-radius:4px;background:white;padding:2px;cursor:pointer;display:block;margin:0 auto;"
                onclick="${qrClick}" alt="QR" onerror="this.style.display='none'">
            </td>
          </tr>
          <tr style="background:#FFF8F0;">
            <td style="padding:4px 6px;font-size:10px;font-weight:700;color:#333;">월보험료</td>
            ${premCells}
          </tr>
          ${noteHtml}
        </tbody>
      </table>
    </div>`;
}

function makeSmartStats(icon, title, maxPct, headers, rows, fmtA) {
  const [h0, h1, h2, h3, h4] = headers;
  const rowsHtml = rows.map((r, i) => {
    const barW = Math.round((r.pct / maxPct) * 90);
    const amtHtml = r.kws && r.kws.length > 0 ? fmtA(r.kws) : `<span style="color:#ccc;font-size:10px;">-</span>`;
    const bg = i % 2 === 0 ? '#fff' : '#F8F9FD';
    return `<tr style="background:${bg};">
      <td style="text-align:center;padding:4px 4px;font-size:10px;font-weight:700;color:#1a3080;white-space:nowrap;">${r.rank}</td>
      <td style="padding:4px 6px;font-size:10px;white-space:nowrap;">${r.label}</td>
      <td style="padding:4px 6px;">
        <div style="display:flex;align-items:center;gap:4px;">
          <div style="background:#4477CC;height:13px;border-radius:2px;width:${barW}px;flex-shrink:0;"></div>
          <span style="font-size:9px;color:#555;white-space:nowrap;">${r.pct}${typeof r.pct === 'number' && !String(r.pct).includes('일') ? '%' : ''}</span>
        </div>
      </td>
      <td style="padding:4px 6px;font-size:10px;color:#555;white-space:nowrap;">${r.cov}</td>
      <td style="text-align:center;padding:4px 4px;">${amtHtml}</td>
    </tr>`;
  }).join('');
  return `
    <div style="border:1.5px solid #1a3080;border-radius:5px;margin-bottom:8px;overflow:hidden;">
      <div style="background:#1a3080;color:white;padding:5px 10px;font-size:12px;font-weight:700;">${icon} ${title}</div>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead>
          <tr style="background:#1a3080;color:white;">
            <th style="text-align:center;padding:4px;width:12%;">${h0}</th>
            <th style="padding:4px 6px;width:20%;">${h1}</th>
            <th style="padding:4px 6px;width:28%;">${h2}</th>
            <th style="padding:4px 6px;width:22%;">${h3}</th>
            <th style="text-align:center;padding:4px;width:18%;">${h4}</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
}

function makeSmartAge(icon, title, ageLabel, groups, fmtA) {
  const cols = groups[0] ? groups[0].causes.length : 5;
  const rankHeaders = Array.from({length: cols}, (_, i) => `<th style="text-align:center;padding:4px 3px;font-size:10px;width:${Math.floor(72/cols)}%;">${i+1}위</th>`).join('');
  const groupRows = groups.map(g => {
    const causeCells = g.causes.map((cause, i) => {
      const kws = g.kws[i] || [];
      return `<td style="text-align:center;padding:3px 3px;font-size:10px;color:#FF8800;font-weight:700;white-space:nowrap;">${cause}</td>`;
    }).join('');
    const amtCells = g.causes.map((cause, i) => {
      const kws = g.kws[i] || [];
      return `<td style="text-align:center;padding:3px 3px;font-size:9px;">${kws.length > 0 ? fmtA(kws) : '<span style="color:#ccc;font-size:9px;">-</span>'}</td>`;
    }).join('');
    return `
      <tr style="background:#F8F9FD;">
        <td rowspan="2" style="text-align:center;padding:4px 6px;font-size:11px;font-weight:700;color:#1a3080;border-right:1px solid #CDD5E8;vertical-align:middle;">${g.age}</td>
        ${causeCells}
      </tr>
      <tr style="background:#fff;">
        <td style="display:none;"></td>
        ${amtCells}
      </tr>`;
  }).join('');
  return `
    <div style="border:1.5px solid #1a3080;border-radius:5px;margin-bottom:8px;overflow:hidden;">
      <div style="background:#1a3080;color:white;padding:5px 10px;font-size:12px;font-weight:700;">${icon} ${title}</div>
      <table style="width:100%;border-collapse:collapse;font-size:10px;table-layout:fixed;">
        <colgroup>
          <col style="width:10%">
          ${Array.from({length: cols}, () => `<col style="width:${Math.floor(72/cols)}%">`).join('')}
        </colgroup>
        <thead>
          <tr style="background:#1a3080;color:white;">
            <th style="text-align:center;padding:4px 6px;font-size:10px;width:10%;">구분</th>
            ${rankHeaders}
          </tr>
        </thead>
        <tbody>${groupRows}</tbody>
      </table>
    </div>`;
}

// ===== 암 보장 렌더링 =====
function renderCancer(coverages) {
  const container = document.getElementById('cancerContent');
  const customer = document.getElementById('customerName').value.trim() || '고객';
  const product  = document.getElementById('productName').value.trim() || '';
  const payment  = document.getElementById('paymentInfo').value.trim() || '';
  const totalPremium = sumPremiums(coverages);
  const today = new Date().toLocaleDateString('ko-KR');
  const OR = '#FF8800', DB = '#1a3080';

  function byKw(...kws) { return coverages.filter(c => kws.some(kw => c.name.includes(kw))); }
  function fmtA(kws) {
    const v = sumAmounts(byKw(...kws));
    return v ? `<strong style="color:#CC2200;font-size:12px;">${formatManwon(toManwon(v))}</strong>`
             : `<span style="color:#ccc;font-size:10px;">0만원</span>`;
  }
  function fmtP(kws) {
    const v = Math.round(sumPremiums(byKw(...kws)));
    return v ? `<strong style="color:#CC2200;">${v.toLocaleString()}원</strong>`
             : `<span style="color:#ccc;">0원</span>`;
  }
  // colKws=column AND rowKw=row keyword; rowKw='' shows non-반복 items
  function fmtCell(colKws, rowKw) {
    const base = coverages.filter(c => colKws.some(kw => c.name.includes(kw)));
    const items = rowKw ? base.filter(c => c.name.includes(rowKw))
                        : base.filter(c => !c.name.includes('반복'));
    const v = sumAmounts(items);
    return v ? `<strong style="color:#CC2200;font-size:12px;">${formatManwon(toManwon(v))}</strong>`
             : `<span style="color:#ccc;font-size:10px;">0만원</span>`;
  }

  function makeSection(num, title, subtitle, cols, rows, note) {
    const cw = Math.floor(80 / cols.length);
    const thCells = cols.map(c => `
      <th style="text-align:center;padding:3px 2px;border-left:1px solid rgba(255,255,255,0.15);
          font-size:9px;vertical-align:bottom;width:${cw}%;">
        ${c.img ? `<div style="height:48px;display:flex;align-items:center;justify-content:center;margin-bottom:2px;">
            <img src="${c.img}" style="max-width:95%;max-height:48px;object-fit:contain;"></div>` : ''}
        <div style="background:${OR};color:white;padding:2px 3px;font-weight:700;font-size:9px;border-radius:2px;margin-bottom:1px;">${c.label}</div>
        ${c.desc ? `<div style="color:rgba(255,255,255,0.8);font-size:8px;line-height:1.2;">${c.desc}</div>` : ''}
      </th>`).join('');
    const dataRows = rows.map((r, i) => `
      <tr style="background:${i%2===0?'white':'#F8F9FE'};">
        <td style="padding:5px 6px;font-size:10px;font-weight:700;
            color:${r.bold?OR:'#444'};border-right:1px solid #CDD5E8;white-space:nowrap;">${r.label}</td>
        ${cols.map(c => `<td style="text-align:center;padding:5px 2px;border-left:1px solid #CDD5E8;">
            ${fmtCell(c.kws, r.rowKw)}</td>`).join('')}
      </tr>`).join('');
    const noteHtml = note
      ? `<tr><td colspan="${cols.length+1}" style="font-size:8px;color:#888;padding:2px 6px;border-top:1px solid #CDD5E8;">※ ${note}</td></tr>`
      : '';
    return `
      <div style="margin-top:9px;">
        <div style="display:flex;align-items:center;gap:8px;background:${DB};color:white;padding:6px 10px;border-radius:3px 3px 0 0;">
          <span style="background:${OR};color:white;font-size:12px;font-weight:900;width:21px;height:21px;
              border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${num}</span>
          <span style="font-weight:900;font-size:12px;">${title}</span>
          <span style="font-size:8px;color:rgba(255,255,255,0.8);margin-left:auto;text-align:right;max-width:52%;">${subtitle}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1.5px solid ${DB};border-top:none;">
          <thead>
            <tr style="background:${DB};color:white;">
              <th style="padding:4px 6px;text-align:left;font-size:10px;width:20%;border-right:1px solid rgba(255,255,255,0.2);">가입담보</th>
              ${thCells}
            </tr>
          </thead>
          <tbody>${dataRows}${noteHtml}</tbody>
        </table>
      </div>`;
  }

  const enrollCols = [
    { label: '일반암진단',  kws: ['일반암'] },
    { label: '유사암진단',  kws: ['유사암','소액암','갑상선암'] },
    { label: '항암치료비',  kws: ['표적항암','면역항암','카티','CAR-T','양성자','중입자'] },
    { label: '암수술비',    kws: ['암수술','암치료수술','다빈치'] },
  ];

  const sec1 = makeSection('①', '암 진단 & 선지급',
    '암으로 최초 진단 받거나, 다른 부위 전이시에도 진단금 보장을 받을 수 있습니다(특약가입시)',
    [
      { label: '일반암',  desc: '대장암·여성 발병율 3위', kws: ['일반암'], img: '' },
      { label: '소액암',  desc: '유방암·여성 발병율 1위', kws: ['소액암'], img: '' },
      { label: '고액암',  desc: '간암·폐암·췌장암 등',   kws: ['고액암'], img: '' },
      { label: '유사암',  desc: '갑상선·기타피부·경계성', kws: ['유사암','갑상선암'], img: '' },
    ],
    [
      { label: '최초진단',   bold: true,  rowKw: '' },
      { label: '전이암 추가', bold: false, rowKw: '전이' },
    ],
    '일반암 기준 / 유사암·소액암은 별도 약관 참조'
  );

  const sec2 = makeSection('②', '암 수술 (신의료기술)',
    '국립암센터 포함한 최고의 상급종합병원에서 고가의 최신 치료를 반복 보장해드립니다.',
    [
      { label: '다빈치로봇',  desc: '비급여(전액본인부담)', kws: ['다빈치'],              img: 'images/cancer_davinci.png' },
      { label: '복강/흉강경', desc: '급여적용 수술시',     kws: ['복강경','흉강경'],     img: 'images/cancer_surgery.png' },
      { label: '개복/개흉',   desc: '급여적용 수술시',     kws: ['개복','개흉','암수술'], img: 'images/cancer_surgery.png' },
      { label: '내시경수술',  desc: '급여적용 수술시',     kws: ['내시경수술','암치료수술'], img: 'images/cancer_icon.png' },
    ],
    [
      { label: '최초 수술시',   bold: true,  rowKw: '' },
      { label: '반복(연1회)',   bold: false, rowKw: '반복' },
      { label: '치료할 때마다', bold: false, rowKw: '치료' },
    ],
    '상급종합병원 일반암 수술 보상예시 / 병원급·갑상선·생식기암 세부보장은 약관참조'
  );

  const sec3 = makeSection('③', '항암약물치료 (표적/면역)',
    '암세포만 집중 타겟치료하는 표적항암 및 면역항암 등 고가의 비급여 항암치료를 반복 보장해드립니다.',
    [
      { label: '표적항암치료', desc: '비급여·연간 3~5천만', kws: ['표적항암'],     img: '' },
      { label: '면역항암치료', desc: '비급여·연간 5천~1억', kws: ['면역항암'],     img: '' },
      { label: '카티항암치료', desc: '1회 투여 3~5억원',   kws: ['카티','CAR-T'], img: '' },
      { label: '화학항암치료', desc: '급여적용 치료시',     kws: ['화학항암','항암화학'], img: '' },
    ],
    [
      { label: '최초 수술시',   bold: true,  rowKw: '' },
      { label: '반복(연1회)',   bold: false, rowKw: '반복' },
      { label: '치료할 때마다', bold: false, rowKw: '치료' },
    ],
    '상급종합병원 일반암 항암치료 기준 / 병원급·유사암 등 세부보장은 약관참조'
  );

  const sec4 = makeSection('④', '항암방사선치료',
    '치료효과는 높이고 정상세포 손상을 최소화하는 양성자·중입자 등 고가의 치료를 반복보장합니다.',
    [
      { label: '세기조절방사선', desc: '급여적용 치료시',     kws: ['세기조절','방사선치료'],  img: 'images/cancer_radiation.png' },
      { label: '양성자치료',    desc: '20회 기준 약 2~3천만', kws: ['양성자'],                img: 'images/cancer_radiation.png' },
      { label: '중입자치료',    desc: '12회 기준 약 5~6천만', kws: ['중입자'],                img: 'images/cancer_radiation.png' },
      { label: '항암방사선',    desc: '급여적용 치료시',     kws: ['항암방사'],               img: 'images/cancer_radiation.png' },
    ],
    [
      { label: '최초 수술시',   bold: true,  rowKw: '' },
      { label: '반복(연1회)',   bold: false, rowKw: '반복' },
      { label: '치료할 때마다', bold: false, rowKw: '치료' },
    ],
    '상급종합병원 방사선치료 기준 보상예시 / 병원급·갑상선·생식기암 세부보장은 약관참조'
  );

  const content = `
    <div style="padding:12px 15px 10px;font-size:11px;">
      ${makeSmartTabHdr('암보장편', customer, product, payment, totalPremium, today)}
      ${makeSmartEnroll('cancer', enrollCols, kws => fmtA(kws), kws => fmtP(kws), '일반암 기준 / 유사암·소액암 별도 약관 참조')}
      ${sec1}${sec2}${sec3}${sec4}
      <div style="font-size:8px;color:#999;border-top:1px solid #eee;padding-top:5px;margin-top:8px;">
        ⚠️ 위 보장내용은 실제 증권 내용과 다를 수 있으며, 정확한 내용은 보험증권을 확인해 주시기 바랍니다.
      </div>
    </div>`;

  container.innerHTML = `<div class="proposal-page">${content}</div>`;
}

// ===== 뇌 보장 렌더링 =====
function renderBrain(coverages) {
  const container = document.getElementById('brainContent');
  const customer = document.getElementById('customerName').value.trim() || '고객';
  const product  = document.getElementById('productName').value.trim() || '';
  const payment  = document.getElementById('paymentInfo').value.trim() || '';
  const totalPremium = sumPremiums(coverages);
  const today = new Date().toLocaleDateString('ko-KR');
  const OR = '#FF8800', DB = '#1a3080';

  function byKw(...kws) { return coverages.filter(c => kws.some(kw => c.name.includes(kw))); }
  function fmtA(kws) {
    const v = sumAmounts(byKw(...kws));
    return v ? `<strong style="color:#CC2200;font-size:12px;">${formatManwon(toManwon(v))}</strong>`
             : `<span style="color:#ccc;font-size:10px;">0만원</span>`;
  }
  function fmtP(kws) {
    const v = Math.round(sumPremiums(byKw(...kws)));
    return v ? `<strong style="color:#CC2200;">${v.toLocaleString()}원</strong>`
             : `<span style="color:#ccc;">0원</span>`;
  }
  function fmtCell(colKws, rowKw) {
    const base = coverages.filter(c => colKws.some(kw => c.name.includes(kw)));
    const items = rowKw ? base.filter(c => c.name.includes(rowKw))
                        : base.filter(c => !c.name.includes('반복'));
    const v = sumAmounts(items);
    return v ? `<strong style="color:#CC2200;font-size:12px;">${formatManwon(toManwon(v))}</strong>`
             : `<span style="color:#ccc;font-size:10px;">0만원</span>`;
  }

  function makeSection(num, title, subtitle, cols, rows, note) {
    const cw = Math.floor(80 / cols.length);
    const thCells = cols.map(c => `
      <th style="text-align:center;padding:3px 2px;border-left:1px solid rgba(255,255,255,0.15);
          font-size:9px;vertical-align:bottom;width:${cw}%;">
        ${c.img ? `<div style="height:50px;display:flex;align-items:center;justify-content:center;margin-bottom:2px;">
            <img src="${c.img}" style="max-width:95%;max-height:50px;object-fit:contain;"></div>` : ''}
        <div style="background:${OR};color:white;padding:2px 3px;font-weight:700;font-size:9px;border-radius:2px;margin-bottom:1px;">${c.label}</div>
        ${c.desc ? `<div style="color:rgba(255,255,255,0.8);font-size:8px;line-height:1.2;">${c.desc}</div>` : ''}
      </th>`).join('');
    const dataRows = rows.map((r, i) => `
      <tr style="background:${i%2===0?'white':'#F8F9FE'};">
        <td style="padding:5px 6px;font-size:10px;font-weight:700;
            color:${r.bold?OR:'#444'};border-right:1px solid #CDD5E8;white-space:nowrap;">${r.label}</td>
        ${cols.map(c => `<td style="text-align:center;padding:5px 2px;border-left:1px solid #CDD5E8;">
            ${fmtCell(c.kws, r.rowKw)}</td>`).join('')}
      </tr>`).join('');
    const noteHtml = note
      ? `<tr><td colspan="${cols.length+1}" style="font-size:8px;color:#888;padding:2px 6px;border-top:1px solid #CDD5E8;">※ ${note}</td></tr>`
      : '';
    return `
      <div style="margin-top:9px;">
        <div style="display:flex;align-items:center;gap:8px;background:${DB};color:white;padding:6px 10px;border-radius:3px 3px 0 0;">
          <span style="background:${OR};color:white;font-size:12px;font-weight:900;width:21px;height:21px;
              border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${num}</span>
          <span style="font-weight:900;font-size:12px;">${title}</span>
          <span style="font-size:8px;color:rgba(255,255,255,0.8);margin-left:auto;text-align:right;max-width:52%;">${subtitle}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1.5px solid ${DB};border-top:none;">
          <thead>
            <tr style="background:${DB};color:white;">
              <th style="padding:4px 6px;text-align:left;font-size:10px;width:20%;border-right:1px solid rgba(255,255,255,0.2);">가입담보</th>
              ${thCells}
            </tr>
          </thead>
          <tbody>${dataRows}${noteHtml}</tbody>
        </table>
      </div>`;
  }

  const enrollCols = [
    { label: '뇌출혈',    kws: ['뇌출혈'] },
    { label: '뇌경색',    kws: ['뇌경색','뇌졸중'] },
    { label: '뇌혈관질환', kws: ['뇌혈관질환'] },
    { label: '수술치료비', kws: ['심뇌혈관질환수술','심뇌혈관질환주요치료비','혈전용해치료비'] },
  ];

  const sec1 = makeSection('①', '뇌혈관질환 진단',
    '뇌출혈·뇌경색·뇌혈관질환 진단 시 보험금을 지급해드립니다.',
    [
      { label: '뇌출혈',    desc: '출혈성 뇌졸중·21%',  kws: ['뇌출혈'],          img: 'images/brain_hemorrhage.png' },
      { label: '뇌경색',    desc: '허혈성 뇌졸중·71%',  kws: ['뇌경색','뇌졸중'], img: 'images/brain_left.png' },
      { label: '뇌혈관질환', desc: '일과성뇌허혈 등·8%', kws: ['뇌혈관질환'],      img: 'images/brain_aneurysm.png' },
      { label: '뇌혈관수술', desc: '혈전용해·스텐트 등', kws: ['심뇌혈관질환수술','혈전용해치료비'], img: 'images/brain_stent.png' },
    ],
    [
      { label: '최초진단',   bold: true,  rowKw: '' },
      { label: '반복(연1회)', bold: false, rowKw: '반복' },
    ],
    '뇌졸중 기준 / 일과성뇌허혈발작·뇌혈관질환 별도 약관 참조'
  );

  const sec2 = makeSection('②', '뇌혈관 수술 & 치료',
    '급성기 뇌졸중 치료를 위한 혈전용해·혈전제거·스텐트·개두수술 등 고가의 최신 치료를 보장합니다.',
    [
      { label: '혈전용해치료',  desc: 'tPA·혈전용해주사',  kws: ['혈전용해치료비','혈전용해'], img: 'images/brain_thrombolysis.png' },
      { label: '혈전제거(카테터)', desc: '혈관내 혈전제거술', kws: ['혈전제거','카테터','뇌혈관카테터'], img: 'images/brain_catheter.png' },
      { label: '스텐트삽입',   desc: '좁아진 혈관 확장시술', kws: ['스텐트','혈관확장'],       img: 'images/brain_stent_insert.png' },
      { label: '개두수술',     desc: '뇌출혈 외과적 제거',  kws: ['개두','뇌수술','심뇌혈관질환수술'], img: 'images/brain_craniotomy.png' },
    ],
    [
      { label: '최초 치료시',   bold: true,  rowKw: '' },
      { label: '반복(연1회)',   bold: false, rowKw: '반복' },
      { label: '치료할 때마다', bold: false, rowKw: '치료' },
    ],
    '상급종합병원 기준 보상예시 / 병원급 및 뇌혈관질환 세부보장은 약관참조'
  );

  const content = `
    <div style="padding:12px 15px 10px;font-size:11px;">
      ${makeSmartTabHdr('뇌혈관보장편', customer, product, payment, totalPremium, today)}
      ${makeSmartEnroll('brain', enrollCols, kws => fmtA(kws), kws => fmtP(kws), '뇌졸중 기준 / 뇌혈관질환 별도 약관 참조')}
      ${sec1}${sec2}
      <div style="font-size:8px;color:#999;border-top:1px solid #eee;padding-top:5px;margin-top:8px;">
        ⚠️ 위 보장내용은 실제 증권 내용과 다를 수 있으며, 정확한 내용은 보험증권을 확인해 주시기 바랍니다.
      </div>
    </div>`;

  container.innerHTML = `<div class="proposal-page">${content}</div>`;
}

// ===== 심장 보장 렌더링 =====
function renderHeart(coverages) {
  const container = document.getElementById('heartContent');
  const customer = document.getElementById('customerName').value.trim() || '고객';
  const product  = document.getElementById('productName').value.trim() || '';
  const payment  = document.getElementById('paymentInfo').value.trim() || '';
  const totalPremium = sumPremiums(coverages);
  const today = new Date().toLocaleDateString('ko-KR');
  const OR = '#FF8800', DB = '#1a3080';

  function byKw(...kws) { return coverages.filter(c => kws.some(kw => c.name.includes(kw))); }
  function fmtA(kws) {
    const v = sumAmounts(byKw(...kws));
    return v ? `<strong style="color:#CC2200;font-size:12px;">${formatManwon(toManwon(v))}</strong>`
             : `<span style="color:#ccc;font-size:10px;">0만원</span>`;
  }
  function fmtP(kws) {
    const v = Math.round(sumPremiums(byKw(...kws)));
    return v ? `<strong style="color:#CC2200;">${v.toLocaleString()}원</strong>`
             : `<span style="color:#ccc;">0원</span>`;
  }
  function fmtCell(colKws, rowKw) {
    const base = coverages.filter(c => colKws.some(kw => c.name.includes(kw)));
    const items = rowKw ? base.filter(c => c.name.includes(rowKw))
                        : base.filter(c => !c.name.includes('반복'));
    const v = sumAmounts(items);
    return v ? `<strong style="color:#CC2200;font-size:12px;">${formatManwon(toManwon(v))}</strong>`
             : `<span style="color:#ccc;font-size:10px;">0만원</span>`;
  }

  function makeSection(num, title, subtitle, cols, rows, note) {
    const cw = Math.floor(80 / cols.length);
    const thCells = cols.map(c => `
      <th style="text-align:center;padding:3px 2px;border-left:1px solid rgba(255,255,255,0.15);
          font-size:9px;vertical-align:bottom;width:${cw}%;">
        ${c.img ? `<div style="height:50px;display:flex;align-items:center;justify-content:center;margin-bottom:2px;">
            <img src="${c.img}" style="max-width:95%;max-height:50px;object-fit:contain;"></div>` : ''}
        <div style="background:${OR};color:white;padding:2px 3px;font-weight:700;font-size:9px;border-radius:2px;margin-bottom:1px;">${c.label}</div>
        ${c.desc ? `<div style="color:rgba(255,255,255,0.8);font-size:8px;line-height:1.2;">${c.desc}</div>` : ''}
      </th>`).join('');
    const dataRows = rows.map((r, i) => `
      <tr style="background:${i%2===0?'white':'#F8F9FE'};">
        <td style="padding:5px 6px;font-size:10px;font-weight:700;
            color:${r.bold?OR:'#444'};border-right:1px solid #CDD5E8;white-space:nowrap;">${r.label}</td>
        ${cols.map(c => `<td style="text-align:center;padding:5px 2px;border-left:1px solid #CDD5E8;">
            ${fmtCell(c.kws, r.rowKw)}</td>`).join('')}
      </tr>`).join('');
    const noteHtml = note
      ? `<tr><td colspan="${cols.length+1}" style="font-size:8px;color:#888;padding:2px 6px;border-top:1px solid #CDD5E8;">※ ${note}</td></tr>`
      : '';
    return `
      <div style="margin-top:9px;">
        <div style="display:flex;align-items:center;gap:8px;background:${DB};color:white;padding:6px 10px;border-radius:3px 3px 0 0;">
          <span style="background:${OR};color:white;font-size:12px;font-weight:900;width:21px;height:21px;
              border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${num}</span>
          <span style="font-weight:900;font-size:12px;">${title}</span>
          <span style="font-size:8px;color:rgba(255,255,255,0.8);margin-left:auto;text-align:right;max-width:52%;">${subtitle}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1.5px solid ${DB};border-top:none;">
          <thead>
            <tr style="background:${DB};color:white;">
              <th style="padding:4px 6px;text-align:left;font-size:10px;width:20%;border-right:1px solid rgba(255,255,255,0.2);">가입담보</th>
              ${thCells}
            </tr>
          </thead>
          <tbody>${dataRows}${noteHtml}</tbody>
        </table>
      </div>`;
  }

  const enrollCols = [
    { label: '급성심근경색', kws: ['급성심근경색'] },
    { label: '협심증',       kws: ['허혈심장질환','협심'] },
    { label: '부정맥',       kws: ['인공심박동기','이식형제세동기','부정맥','항응고제'] },
    { label: '심장수술',     kws: ['심뇌혈관질환수술','심뇌혈관질환주요치료비'] },
  ];

  const sec1 = makeSection('①', '심혈관질환 진단',
    '급성심근경색·협심증·부정맥 등 심혈관질환 진단 시 보험금을 지급해드립니다.',
    [
      { label: '급성심근경색', desc: '허혈성심장질환·39%', kws: ['급성심근경색'],         img: 'images/heart_attack.png' },
      { label: '허혈심장질환', desc: '협심증·혈관폐색 등', kws: ['허혈심장질환','협심'],  img: 'images/heart_anatomy.png' },
      { label: '부정맥',       desc: '심박이상·28%',       kws: ['인공심박동기','이식형제세동기','부정맥','항응고제'], img: 'images/heart_arrhythmia.png' },
      { label: '심혈관수술',   desc: '스텐트·판막수술 등', kws: ['심뇌혈관질환수술','심뇌혈관질환주요치료비'], img: 'images/heart_surgery.png' },
    ],
    [
      { label: '최초진단',    bold: true,  rowKw: '' },
      { label: '반복(연1회)', bold: false, rowKw: '반복' },
    ],
    '급성심근경색 기준 / 협심증·부정맥 별도 약관 참조'
  );

  const sec2 = makeSection('②', '심혈관 수술 & 치료',
    '심장 혈전 제거·관상동맥 중재시술·부정맥 기기삽입·심장수술 등 최신 고가 치료를 반복 보장합니다.',
    [
      { label: '혈전용해치료', desc: '혈전용해주사·약물', kws: ['혈전용해','심뇌혈관혈전'],   img: 'images/heart_thrombolysis.png' },
      { label: '관상동맥중재', desc: 'PCI·스텐트삽입',   kws: ['관상동맥','PCI','스텐트'],   img: 'images/heart_coronary.png' },
      { label: '부정맥기기',  desc: '인공심박동기·ICD',  kws: ['인공심박동기','이식형제세동기'], img: 'images/heart_stent2.png' },
      { label: '심장수술',    desc: '심장수술·판막수술', kws: ['심뇌혈관질환수술','심장수술','판막'], img: 'images/heart_surgery.png' },
    ],
    [
      { label: '최초 치료시',   bold: true,  rowKw: '' },
      { label: '반복(연1회)',   bold: false, rowKw: '반복' },
      { label: '치료할 때마다', bold: false, rowKw: '치료' },
    ],
    '상급종합병원 기준 보상예시 / 허혈심장질환·부정맥 세부보장은 약관참조'
  );

  const content = `
    <div style="padding:12px 15px 10px;font-size:11px;">
      ${makeSmartTabHdr('심혈관보장편', customer, product, payment, totalPremium, today)}
      ${makeSmartEnroll('heart', enrollCols, kws => fmtA(kws), kws => fmtP(kws), '급성심근경색 기준 / 협심증·부정맥 별도 약관 참조')}
      ${sec1}${sec2}
      <div style="font-size:8px;color:#999;border-top:1px solid #eee;padding-top:5px;margin-top:8px;">
        ⚠️ 위 보장내용은 실제 증권 내용과 다를 수 있으며, 정확한 내용은 보험증권을 확인해 주시기 바랍니다.
      </div>
    </div>`;

  container.innerHTML = `<div class="proposal-page">${content}</div>`;
}

// ===== 사망 보장 렌더링 =====
function renderDeath(coverages) {
  const container = document.getElementById('deathContent');
  const customer = document.getElementById('customerName').value.trim() || '고객';
  const product  = document.getElementById('productName').value.trim() || '';
  const payment  = document.getElementById('paymentInfo').value.trim() || '';
  const totalPremium = sumPremiums(coverages);
  const today = new Date().toLocaleDateString('ko-KR');

  function byKw(...kws) { return coverages.filter(c => kws.some(kw => c.name.includes(kw))); }
  function fmtA(kws) {
    const v = sumAmounts(byKw(...kws));
    return v ? `<strong style="color:#CC2200;font-size:12px;">${formatManwon(toManwon(v))}</strong>`
             : `<span style="color:#ccc;font-size:10px;">0만원</span>`;
  }
  function fmtP(kws) {
    const v = Math.round(sumPremiums(byKw(...kws)));
    return v ? `<strong style="color:#CC2200;">${v.toLocaleString()}원</strong>`
             : `<span style="color:#ccc;">0원</span>`;
  }

  const enrollCols = [
    { label: '상해사망',    kws: ['상해사망'] },
    { label: '질병사망',    kws: ['질병사망'] },
    { label: '3대질병사망', kws: ['3대질병사망','뇌혈관사망','허혈심장사망'] },
    { label: '암사망',      kws: ['암사망'] },
  ];

  const statsRows = [
    { rank:'1위',  label:'암',           pct:24.8, cov:'질병+3대+암사망', kws:['질병사망','3대질병사망','암사망'] },
    { rank:'2위',  label:'심장질환',     pct:9.4,  cov:'질병+3대사망',    kws:['질병사망','3대질병사망'] },
    { rank:'3위',  label:'폐렴',         pct:8.4,  cov:'질병사망',         kws:['질병사망'] },
    { rank:'4위',  label:'뇌혈관질환',  pct:6.9,  cov:'질병+3대사망',    kws:['질병사망','3대질병사망'] },
    { rank:'5위',  label:'고의적자해',  pct:4.1,  cov:'-',                kws:[] },
    { rank:'6위',  label:'알츠하이머',  pct:3.4,  cov:'질병사망',         kws:['질병사망'] },
    { rank:'7위',  label:'당뇨병',       pct:3.1,  cov:'질병사망',         kws:['질병사망'] },
    { rank:'8위',  label:'고혈압성질환',pct:2.3,  cov:'질병사망',         kws:['질병사망'] },
    { rank:'9위',  label:'간질환',       pct:2.2,  cov:'질병사망',         kws:['질병사망'] },
    { rank:'10위', label:'패혈증',       pct:2.2,  cov:'질병사망',         kws:['질병사망'] },
    { rank:'기타', label:'교통사고',     pct:1.0,  cov:'상해사망',         kws:['상해사망'] },
  ];

  const ageGroups = [
    {
      age:'50대',
      causes:['암','심장질환','간질환','뇌혈관질환','당뇨병'],
      kws:[['질병사망','3대질병사망','암사망'],['질병사망','3대질병사망'],['질병사망'],['질병사망','3대질병사망'],['질병사망']]
    },
    {
      age:'60대',
      causes:['암','심장질환','뇌혈관질환','간질환','폐렴'],
      kws:[['질병사망','3대질병사망','암사망'],['질병사망','3대질병사망'],['질병사망','3대질병사망'],['질병사망'],['질병사망']]
    },
    {
      age:'70대',
      causes:['암','심장질환','뇌혈관질환','폐렴','당뇨병'],
      kws:[['질병사망','3대질병사망','암사망'],['질병사망','3대질병사망'],['질병사망','3대질병사망'],['질병사망'],['질병사망']]
    },
  ];

  const content = `
    <div style="padding:12px 15px 10px;font-size:11px;">
      ${makeSmartTabHdr('사망보험금편', customer, product, payment, totalPremium, today)}
      ${makeSmartEnroll('death', enrollCols, kws => fmtA(kws), kws => fmtP(kws), '3대질병사망 : 암(유사암포함), 뇌혈관질환, 허혈심장질환')}
      ${makeSmartStats('📊', '사망원인별 통계 (2022년 기준)', 25,
          ['순위','사망원인','구성비','보장담보','보험금'], statsRows, kws => fmtA(kws))}
      ${makeSmartAge('👤', '연령대별 사망원인 현황', '사망보험금', ageGroups, kws => fmtA(kws))}
      <div style="font-size:8px;color:#999;border-top:1px solid #eee;padding-top:5px;margin-top:2px;">
        ⚠️ 위 보장내용은 실제 증권 내용과 다를 수 있으며, 정확한 내용은 보험증권을 확인해 주시기 바랍니다.
      </div>
    </div>`;

  container.innerHTML = `<div class="proposal-page">${content}</div>`;
}

// ===== 상해 보장 렌더링 =====
function renderInjury(coverages) {
  const container = document.getElementById('injuryContent');
  if (!container) return;
  const customer = document.getElementById('customerName').value.trim() || '고객';
  const product  = document.getElementById('productName').value.trim() || '';
  const payment  = document.getElementById('paymentInfo').value.trim() || '';
  const totalPremium = sumPremiums(coverages);
  const today = new Date().toLocaleDateString('ko-KR');

  function byKw(...kws) { return coverages.filter(c => kws.some(kw => c.name.includes(kw))); }
  function fmtA(kws) {
    const v = sumAmounts(byKw(...kws));
    return v ? `<strong style="color:#CC2200;font-size:12px;">${formatManwon(toManwon(v))}</strong>`
             : `<span style="color:#ccc;font-size:10px;">0만원</span>`;
  }
  function fmtP(kws) {
    const v = Math.round(sumPremiums(byKw(...kws)));
    return v ? `<strong style="color:#CC2200;">${v.toLocaleString()}원</strong>`
             : `<span style="color:#ccc;">0원</span>`;
  }

  const enrollCols = [
    { label: '골절',     kws: ['골절'] },
    { label: '화상',     kws: ['화상'] },
    { label: '재활',     kws: ['재활','물리치료','도수치료'] },
    { label: '상해수술', kws: ['상해수술'] },
  ];

  const statsRows = [
    { rank:'1위', label:'낙상·추락',  pct:32.4, cov:'골절+재활',  kws:['골절'] },
    { rank:'2위', label:'교통사고',   pct:21.3, cov:'상해수술',   kws:['상해수술'] },
    { rank:'3위', label:'운동손상',   pct:15.7, cov:'골절+재활',  kws:['골절'] },
    { rank:'4위', label:'화재·화상',  pct:8.2,  cov:'화상',        kws:['화상'] },
    { rank:'5위', label:'기타상해',   pct:22.4, cov:'상해수술',   kws:['상해수술'] },
  ];

  const content = `
    <div style="padding:12px 15px 10px;font-size:11px;">
      ${makeSmartTabHdr('상해보험금편', customer, product, payment, totalPremium, today)}
      ${makeSmartEnroll('injury', enrollCols, kws => fmtA(kws), kws => fmtP(kws), '')}
      ${makeSmartStats('📊', '상해 발생 통계 (2022년 기준)', 35,
          ['순위','상해원인','구성비','보장담보','보험금'], statsRows, kws => fmtA(kws))}
      <div style="font-size:8px;color:#999;border-top:1px solid #eee;padding-top:5px;margin-top:2px;">
        ⚠️ 위 보장내용은 실제 증권 내용과 다를 수 있으며, 정확한 내용은 보험증권을 확인해 주시기 바랍니다.
      </div>
    </div>`;

  container.innerHTML = `<div class="proposal-page">${content}</div>`;
}

// ===== 핵심보장 요약 렌더링 =====
function renderOnePager(coverages) {
  const container = document.getElementById('onepagerContent');
  const customer = document.getElementById('customerName').value.trim() || '고객';
  const product  = document.getElementById('productName').value.trim() || '';
  const payment  = document.getElementById('paymentInfo').value.trim() || '';
  const totalPremium = sumPremiums(coverages);
  const today = new Date().toLocaleDateString('ko-KR');

  function byKw(...kws) { return coverages.filter(c => kws.some(kw => c.name.includes(kw))); }
  function fmtA(kws) {
    const v = sumAmounts(byKw(...kws));
    return v ? `<strong style="color:#CC2200;font-size:12px;">${formatManwon(toManwon(v))}</strong>`
             : `<span style="color:#ccc;font-size:10px;">0만원</span>`;
  }
  function fmtP(kws) {
    const v = Math.round(sumPremiums(byKw(...kws)));
    return v ? `<strong style="color:#CC2200;">${v.toLocaleString()}원</strong>`
             : `<span style="color:#ccc;">0원</span>`;
  }

  // 4대 영역 요약 박스
  function makeSummaryBox(color, icon, title, kws) {
    const amt = fmtA(kws);
    const prem = fmtP(kws);
    return `
      <div style="border:1.5px solid ${color};border-radius:6px;overflow:hidden;">
        <div style="background:${color};color:white;padding:5px 10px;font-size:12px;font-weight:700;">${icon} ${title}</div>
        <div style="padding:8px 10px;background:#FAFBFF;">
          <div style="font-size:10px;color:#666;margin-bottom:3px;">진단·수술 합계</div>
          <div style="font-size:14px;">${amt}</div>
          <div style="font-size:9px;color:#888;margin-top:4px;">월보험료 ${prem}</div>
        </div>
      </div>`;
  }

  const content = `
    <div style="padding:12px 15px 10px;font-size:11px;">
      ${makeSmartTabHdr('핵심보장 요약편', customer, product, payment, totalPremium, today)}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        ${makeSummaryBox('#CC0000','🔬','암 보장',['일반암','유사암','소액암','갑상선암','표적항암','면역항암','암수술'])}
        ${makeSummaryBox('#1a3080','🧠','뇌혈관 보장',['뇌출혈','뇌경색','뇌졸중','뇌혈관질환','심뇌혈관질환수술','혈전용해치료비'])}
        ${makeSummaryBox('#CC0066','❤️','심혈관 보장',['급성심근경색','허혈심장질환','협심','인공심박동기','이식형제세동기','심뇌혈관질환수술'])}
        ${makeSummaryBox('#336600','🛡️','사망 보장',['상해사망','질병사망','3대질병사망','암사망'])}
      </div>
      <div style="border:1.5px solid #CDD5E8;border-radius:5px;padding:8px 12px;margin-bottom:8px;background:#FAFBFE;">
        <div style="font-size:11px;font-weight:700;color:#1a3080;margin-bottom:6px;">📋 전체 보장 현황</div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:11px;color:#555;">총 담보 수</span>
          <strong style="color:#1a3080;">${coverages.length}개</strong>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
          <span style="font-size:11px;color:#555;">월 납입 보험료 합계</span>
          <strong style="color:#CC2200;font-size:13px;">${Math.round(totalPremium).toLocaleString()}원</strong>
        </div>
      </div>
      <div style="font-size:8px;color:#999;border-top:1px solid #eee;padding-top:5px;margin-top:2px;">
        ⚠️ 위 보장내용은 실제 증권 내용과 다를 수 있으며, 정확한 내용은 보험증권을 확인해 주시기 바랍니다.
      </div>
    </div>`;

  container.innerHTML = `<div class="proposal-page">${content}</div>`;
}

// ===== 수술(여) 렌더링 =====
function renderWoman(coverages) {
  const container = document.getElementById('womanContent');
  const customer = document.getElementById('customerName').value.trim() || '고객';
  const product  = document.getElementById('productName').value.trim() || '';
  const payment  = document.getElementById('paymentInfo').value.trim() || '';
  const totalPremium = sumPremiums(coverages);
  const today = new Date().toLocaleDateString('ko-KR');
  const OR = '#FF8800', DB = '#1a3080';

  function byKw(...kws) { return coverages.filter(c => kws.some(kw => c.name.includes(kw))); }
  function fmtA(kws) {
    const v = sumAmounts(byKw(...kws));
    return v ? `<strong style="color:#CC2200;font-size:12px;">${formatManwon(toManwon(v))}</strong>`
             : `<span style="color:#ccc;font-size:10px;">0만원</span>`;
  }
  function fmtP(kws) {
    const v = Math.round(sumPremiums(byKw(...kws)));
    return v ? `<strong style="color:#CC2200;">${v.toLocaleString()}원</strong>`
             : `<span style="color:#ccc;">0원</span>`;
  }
  function fmtCell(colKws, rowKw) {
    const base = coverages.filter(c => colKws.some(kw => c.name.includes(kw)));
    const items = rowKw ? base.filter(c => c.name.includes(rowKw))
                        : base.filter(c => !c.name.includes('반복'));
    const v = sumAmounts(items);
    return v ? `<strong style="color:#CC2200;font-size:12px;">${formatManwon(toManwon(v))}</strong>`
             : `<span style="color:#ccc;font-size:10px;">0만원</span>`;
  }

  function makeSection(num, title, subtitle, cols, rows, note) {
    const cw = Math.floor(80 / cols.length);
    const thCells = cols.map(c => `
      <th style="text-align:center;padding:3px 2px;border-left:1px solid rgba(255,255,255,0.15);
          font-size:9px;vertical-align:bottom;width:${cw}%;">
        ${c.img ? `<div style="height:48px;display:flex;align-items:center;justify-content:center;margin-bottom:2px;">
            <img src="${c.img}" style="max-width:95%;max-height:48px;object-fit:contain;"></div>` : ''}
        <div style="background:${OR};color:white;padding:2px 3px;font-weight:700;font-size:9px;border-radius:2px;margin-bottom:1px;">${c.label}</div>
        ${c.desc ? `<div style="color:rgba(255,255,255,0.8);font-size:8px;line-height:1.2;">${c.desc}</div>` : ''}
      </th>`).join('');
    const dataRows = rows.map((r, i) => `
      <tr style="background:${i%2===0?'white':'#F8F9FE'};">
        <td style="padding:5px 6px;font-size:10px;font-weight:700;
            color:${r.bold?OR:'#444'};border-right:1px solid #CDD5E8;white-space:nowrap;">${r.label}</td>
        ${cols.map(c => `<td style="text-align:center;padding:5px 2px;border-left:1px solid #CDD5E8;">
            ${fmtCell(c.kws, r.rowKw)}</td>`).join('')}
      </tr>`).join('');
    const noteHtml = note
      ? `<tr><td colspan="${cols.length+1}" style="font-size:8px;color:#888;padding:2px 6px;border-top:1px solid #CDD5E8;">※ ${note}</td></tr>`
      : '';
    return `
      <div style="margin-top:9px;">
        <div style="display:flex;align-items:center;gap:8px;background:${DB};color:white;padding:6px 10px;border-radius:3px 3px 0 0;">
          <span style="background:${OR};color:white;font-size:12px;font-weight:900;width:21px;height:21px;
              border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${num}</span>
          <span style="font-weight:900;font-size:12px;">${title}</span>
          <span style="font-size:8px;color:rgba(255,255,255,0.8);margin-left:auto;text-align:right;max-width:52%;">${subtitle}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1.5px solid ${DB};border-top:none;">
          <thead>
            <tr style="background:${DB};color:white;">
              <th style="padding:4px 6px;text-align:left;font-size:10px;width:20%;border-right:1px solid rgba(255,255,255,0.2);">가입담보</th>
              ${thCells}
            </tr>
          </thead>
          <tbody>${dataRows}${noteHtml}</tbody>
        </table>
      </div>`;
  }

  const enrollCols = [
    { label: '여성수술',    kws: ['여성수술','여성특정수술'] },
    { label: '양성종양',    kws: ['유방양성','자궁근종','자궁내막증','갑상선결절'] },
    { label: '5대기관',     kws: ['5대기관'] },
    { label: '전신마취',    kws: ['전신마취'] },
  ];

  const sec1 = makeSection('①', '여성 특정수술 & 양성종양',
    '여성에게 자주 발생하는 자궁·유방·갑상선 등 양성종양 수술 시 보험금을 지급해드립니다.',
    [
      { label: '여성수술',    desc: '제왕절개·자궁·난소 등',  kws: ['여성수술','여성특정수술'],              img: 'images/cancer_surgery.png' },
      { label: '자궁근종',    desc: '여성 1위 수술·32%',      kws: ['자궁근종'],                            img: 'images/cancer_surgery.png' },
      { label: '유방양성',    desc: '유방섬유선종 등·12%',    kws: ['유방양성','유방종양'],                  img: 'images/cancer_surgery.png' },
      { label: '갑상선결절',  desc: '갑상선 절제·28%',        kws: ['갑상선결절','갑상선수술'],              img: 'images/surgery_ct.png' },
    ],
    [
      { label: '최초 수술시',   bold: true,  rowKw: '' },
      { label: '반복(연1회)',   bold: false, rowKw: '반복' },
      { label: '치료할 때마다', bold: false, rowKw: '치료' },
    ],
    '상급종합병원 기준 보상예시 / 세부보장은 약관참조'
  );

  const sec2 = makeSection('②', '5대기관 & 전신마취 수술',
    '위·대장·간·폐·췌장 5대기관 수술 및 전신마취 수술 시 추가 보험금을 지급해드립니다.',
    [
      { label: '5대기관수술',  desc: '위·대장·간·폐·췌장', kws: ['5대기관'],              img: 'images/surgery_hospital.png' },
      { label: '자궁내막증',   desc: '비급여 복강경 수술',  kws: ['자궁내막증'],           img: 'images/cancer_surgery.png' },
      { label: '전신마취',     desc: '전신마취 수술시',     kws: ['전신마취'],             img: 'images/cancer_surgery.png' },
      { label: '입원수술비',   desc: '입원 수술시',         kws: ['입원수술','수술입원'],  img: 'images/surgery_hospital.png' },
    ],
    [
      { label: '최초 수술시',   bold: true,  rowKw: '' },
      { label: '반복(연1회)',   bold: false, rowKw: '반복' },
      { label: '치료할 때마다', bold: false, rowKw: '치료' },
    ],
    '상급종합병원 기준 보상예시 / 세부보장은 약관참조'
  );

  const content = `
    <div style="padding:12px 15px 10px;font-size:11px;">
      ${makeSmartTabHdr('수술보장편(여성)', customer, product, payment, totalPremium, today)}
      ${makeSmartEnroll('woman', enrollCols, kws => fmtA(kws), kws => fmtP(kws), '여성수술 기준 / 양성종양·5대기관 별도 약관 참조')}
      ${sec1}${sec2}
      <div style="font-size:8px;color:#999;border-top:1px solid #eee;padding-top:5px;margin-top:8px;">
        ⚠️ 위 보장내용은 실제 증권 내용과 다를 수 있으며, 정확한 내용은 보험증권을 확인해 주시기 바랍니다.
      </div>
    </div>`;

  container.innerHTML = `<div class="proposal-page">${content}</div>`;
}

// ===== 운전자 보장 렌더링 =====
function renderDriver(coverages) {
  const container = document.getElementById('driverContent');
  const customer = document.getElementById('customerName').value.trim() || '고객';
  const product  = document.getElementById('productName').value.trim() || '';
  const payment  = document.getElementById('paymentInfo').value.trim() || '';
  const totalPremium = sumPremiums(coverages);
  const today = new Date().toLocaleDateString('ko-KR');

  function byKw(...kws) { return coverages.filter(c => kws.some(kw => c.name.includes(kw))); }
  function fmtA(kws) {
    const v = sumAmounts(byKw(...kws));
    return v ? `<strong style="color:#CC2200;font-size:12px;">${formatManwon(toManwon(v))}</strong>`
             : `<span style="color:#ccc;font-size:10px;">0만원</span>`;
  }
  function fmtP(kws) {
    const v = Math.round(sumPremiums(byKw(...kws)));
    return v ? `<strong style="color:#CC2200;">${v.toLocaleString()}원</strong>`
             : `<span style="color:#ccc;">0원</span>`;
  }

  const enrollCols = [
    { label: '교통상해사망',   kws: ['교통','자동차','운전자'] },
    { label: '자동차사고부상', kws: ['교통사고부상','자동차사고부상'] },
    { label: '대인배상지원',   kws: ['대인','배상'] },
    { label: '법률비용',       kws: ['법률','변호사'] },
  ];

  const statsRows = [
    { rank:'1위', label:'졸음·주의태만',   pct:38.1, cov:'교통상해', kws:['교통','운전자'] },
    { rank:'2위', label:'안전거리미확보',  pct:8.2,  cov:'교통상해', kws:['교통','운전자'] },
    { rank:'3위', label:'신호위반',        pct:5.3,  cov:'교통상해', kws:['교통','운전자'] },
    { rank:'4위', label:'과속',            pct:4.7,  cov:'교통상해', kws:['교통','운전자'] },
    { rank:'5위', label:'기타',            pct:43.7, cov:'교통상해', kws:['교통','운전자'] },
  ];

  const content = `
    <div style="padding:12px 15px 10px;font-size:11px;">
      ${makeSmartTabHdr('운전자보험편', customer, product, payment, totalPremium, today)}
      ${makeSmartEnroll('driver', enrollCols, kws => fmtA(kws), kws => fmtP(kws), '')}
      ${makeSmartStats('📊', '교통사고 원인별 통계 (2022년 기준)', 45,
          ['순위','사고원인','구성비','보장담보','보험금'], statsRows, kws => fmtA(kws))}
      <div style="font-size:8px;color:#999;border-top:1px solid #eee;padding-top:5px;margin-top:2px;">
        ⚠️ 위 보장내용은 실제 증권 내용과 다를 수 있으며, 정확한 내용은 보험증권을 확인해 주시기 바랍니다.
      </div>
    </div>`;

  container.innerHTML = `<div class="proposal-page">${content}</div>`;
}

// ===== 입원일당 렌더링 =====
function renderDaily(coverages) {
  const container = document.getElementById('dailyContent');
  const customer = document.getElementById('customerName').value.trim() || '고객';
  const product  = document.getElementById('productName').value.trim() || '';
  const payment  = document.getElementById('paymentInfo').value.trim() || '';
  const totalPremium = sumPremiums(coverages);
  const today = new Date().toLocaleDateString('ko-KR');

  function byKw(...kws) { return coverages.filter(c => kws.some(kw => c.name.includes(kw))); }
  function fmtA(kws) {
    const v = sumAmounts(byKw(...kws));
    return v ? `<strong style="color:#CC2200;font-size:12px;">${formatManwon(toManwon(v))}</strong>`
             : `<span style="color:#ccc;font-size:10px;">0만원</span>`;
  }
  function fmtP(kws) {
    const v = Math.round(sumPremiums(byKw(...kws)));
    return v ? `<strong style="color:#CC2200;">${v.toLocaleString()}원</strong>`
             : `<span style="color:#ccc;">0원</span>`;
  }

  const enrollCols = [
    { label: '일반질병입원', kws: ['질병입원일당','입원일당'] },
    { label: '종합병원입원', kws: ['종합병원입원'] },
    { label: '암입원',       kws: ['암입원'] },
    { label: '뇌심입원',     kws: ['심뇌혈관수술입원일당','심뇌혈관입원일당'] },
  ];

  const statsRows = [
    { rank:'1위', label:'정신질환',   pct:'28.1일', cov:'입원일당',   kws:['질병입원일당','입원일당'] },
    { rank:'2위', label:'근골격계질환',pct:'16.8일', cov:'입원일당',   kws:['질병입원일당','입원일당'] },
    { rank:'3위', label:'뇌혈관질환', pct:'14.7일', cov:'뇌심입원',   kws:['심뇌혈관수술입원일당','심뇌혈관입원일당'] },
    { rank:'4위', label:'암',          pct:'12.3일', cov:'암입원',     kws:['암입원'] },
    { rank:'5위', label:'심장질환',   pct:'9.8일',  cov:'뇌심입원',   kws:['심뇌혈관수술입원일당','심뇌혈관입원일당'] },
    { rank:'6위', label:'소화기질환', pct:'7.2일',  cov:'입원일당',   kws:['질병입원일당','입원일당'] },
  ];

  const content = `
    <div style="padding:12px 15px 10px;font-size:11px;">
      ${makeSmartTabHdr('입원일당편', customer, product, payment, totalPremium, today)}
      ${makeSmartEnroll('daily', enrollCols, kws => fmtA(kws), kws => fmtP(kws), '')}
      ${makeSmartStats('📊', '질환별 평균 입원일수 통계', 30,
          ['순위','질환명','평균입원일','보장담보','하루보험금'], statsRows, kws => fmtA(kws))}
      <div style="font-size:8px;color:#999;border-top:1px solid #eee;padding-top:5px;margin-top:2px;">
        ⚠️ 위 보장내용은 실제 증권 내용과 다를 수 있으며, 정확한 내용은 보험증권을 확인해 주시기 바랍니다.
      </div>
    </div>`;

  container.innerHTML = `<div class="proposal-page">${content}</div>`;
}

// ===== 수술(남) 렌더링 =====
function renderSurgery(coverages) {
  const container = document.getElementById('surgeryContent');
  const customer = document.getElementById('customerName').value.trim() || '고객';
  const product  = document.getElementById('productName').value.trim() || '';
  const payment  = document.getElementById('paymentInfo').value.trim() || '';
  const totalPremium = sumPremiums(coverages);
  const today = new Date().toLocaleDateString('ko-KR');
  const OR = '#FF8800', DB = '#1a3080';

  function byKw(...kws) { return coverages.filter(c => kws.some(kw => c.name.includes(kw))); }
  function fmtA(kws) {
    const v = sumAmounts(byKw(...kws));
    return v ? `<strong style="color:#CC2200;font-size:12px;">${formatManwon(toManwon(v))}</strong>`
             : `<span style="color:#ccc;font-size:10px;">0만원</span>`;
  }
  function fmtP(kws) {
    const v = Math.round(sumPremiums(byKw(...kws)));
    return v ? `<strong style="color:#CC2200;">${v.toLocaleString()}원</strong>`
             : `<span style="color:#ccc;">0원</span>`;
  }
  function fmtCell(colKws, rowKw) {
    const base = coverages.filter(c => colKws.some(kw => c.name.includes(kw)));
    const items = rowKw ? base.filter(c => c.name.includes(rowKw))
                        : base.filter(c => !c.name.includes('반복'));
    const v = sumAmounts(items);
    return v ? `<strong style="color:#CC2200;font-size:12px;">${formatManwon(toManwon(v))}</strong>`
             : `<span style="color:#ccc;font-size:10px;">0만원</span>`;
  }

  function makeSection(num, title, subtitle, cols, rows, note) {
    const cw = Math.floor(80 / cols.length);
    const thCells = cols.map(c => `
      <th style="text-align:center;padding:3px 2px;border-left:1px solid rgba(255,255,255,0.15);
          font-size:9px;vertical-align:bottom;width:${cw}%;">
        ${c.img ? `<div style="height:48px;display:flex;align-items:center;justify-content:center;margin-bottom:2px;">
            <img src="${c.img}" style="max-width:95%;max-height:48px;object-fit:contain;"></div>` : ''}
        <div style="background:${OR};color:white;padding:2px 3px;font-weight:700;font-size:9px;border-radius:2px;margin-bottom:1px;">${c.label}</div>
        ${c.desc ? `<div style="color:rgba(255,255,255,0.8);font-size:8px;line-height:1.2;">${c.desc}</div>` : ''}
      </th>`).join('');
    const dataRows = rows.map((r, i) => `
      <tr style="background:${i%2===0?'white':'#F8F9FE'};">
        <td style="padding:5px 6px;font-size:10px;font-weight:700;
            color:${r.bold?OR:'#444'};border-right:1px solid #CDD5E8;white-space:nowrap;">${r.label}</td>
        ${cols.map(c => `<td style="text-align:center;padding:5px 2px;border-left:1px solid #CDD5E8;">
            ${fmtCell(c.kws, r.rowKw)}</td>`).join('')}
      </tr>`).join('');
    const noteHtml = note
      ? `<tr><td colspan="${cols.length+1}" style="font-size:8px;color:#888;padding:2px 6px;border-top:1px solid #CDD5E8;">※ ${note}</td></tr>`
      : '';
    return `
      <div style="margin-top:9px;">
        <div style="display:flex;align-items:center;gap:8px;background:${DB};color:white;padding:6px 10px;border-radius:3px 3px 0 0;">
          <span style="background:${OR};color:white;font-size:12px;font-weight:900;width:21px;height:21px;
              border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${num}</span>
          <span style="font-weight:900;font-size:12px;">${title}</span>
          <span style="font-size:8px;color:rgba(255,255,255,0.8);margin-left:auto;text-align:right;max-width:52%;">${subtitle}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1.5px solid ${DB};border-top:none;">
          <thead>
            <tr style="background:${DB};color:white;">
              <th style="padding:4px 6px;text-align:left;font-size:10px;width:20%;border-right:1px solid rgba(255,255,255,0.2);">가입담보</th>
              ${thCells}
            </tr>
          </thead>
          <tbody>${dataRows}${noteHtml}</tbody>
        </table>
      </div>`;
  }

  const enrollCols = [
    { label: '5대기관수술', kws: ['5대기관'] },
    { label: '남성수술',    kws: ['남성수술'] },
    { label: '양성종양',    kws: ['대장양성종양','갑상선','신장낭종','담낭'] },
    { label: '전신마취',    kws: ['전신마취'] },
  ];

  const sec1 = makeSection('①', '남성 다빈도 양성종양 수술',
    '남성에게 자주 발생하는 대장·담낭·갑상선·전립선 수술 시 보험금을 지급해드립니다.',
    [
      { label: '대장양성종양', desc: '남성 1위·29.8%',     kws: ['대장양성종양','대장내시경'], img: 'images/cancer_surgery.png' },
      { label: '담낭절제술',   desc: '복강경 담낭제거·22%', kws: ['담낭'],                   img: 'images/cancer_surgery.png' },
      { label: '갑상선수술',   desc: '갑상선 절제·18%',    kws: ['갑상선결절','갑상선수술'], img: 'images/surgery_ct.png' },
      { label: '전립선수술',   desc: '전립선 비대·13%',    kws: ['전립선','남성수술'],       img: 'images/surgery_male_stats.png' },
    ],
    [
      { label: '최초 수술시',   bold: true,  rowKw: '' },
      { label: '반복(연1회)',   bold: false, rowKw: '반복' },
      { label: '치료할 때마다', bold: false, rowKw: '치료' },
    ],
    '상급종합병원 기준 보상예시 / 세부보장은 약관참조'
  );

  const sec2 = makeSection('②', '5대기관 & 전신마취 수술',
    '위·대장·간·폐·췌장 5대기관 수술 및 전신마취 수술 시 추가 보험금을 지급해드립니다.',
    [
      { label: '5대기관수술', desc: '위·대장·간·폐·췌장', kws: ['5대기관'],             img: 'images/surgery_hospital.png' },
      { label: '신장낭종',    desc: '신장 낭종 제거술',   kws: ['신장낭종','신장'],      img: 'images/cancer_surgery.png' },
      { label: '전신마취',    desc: '전신마취 수술시',    kws: ['전신마취'],             img: 'images/cancer_surgery.png' },
      { label: '입원수술비',  desc: '입원 수술시',        kws: ['입원수술','수술입원'],  img: 'images/surgery_hospital.png' },
    ],
    [
      { label: '최초 수술시',   bold: true,  rowKw: '' },
      { label: '반복(연1회)',   bold: false, rowKw: '반복' },
      { label: '치료할 때마다', bold: false, rowKw: '치료' },
    ],
    '상급종합병원 기준 보상예시 / 세부보장은 약관참조'
  );

  const content = `
    <div style="padding:12px 15px 10px;font-size:11px;">
      ${makeSmartTabHdr('수술보장편(남성)', customer, product, payment, totalPremium, today)}
      ${makeSmartEnroll('surgery', enrollCols, kws => fmtA(kws), kws => fmtP(kws), '5대기관 기준 / 양성종양·전신마취 별도 약관 참조')}
      ${sec1}${sec2}
      <div style="font-size:8px;color:#999;border-top:1px solid #eee;padding-top:5px;margin-top:8px;">
        ⚠️ 위 보장내용은 실제 증권 내용과 다를 수 있으며, 정확한 내용은 보험증권을 확인해 주시기 바랍니다.
      </div>
    </div>`;

  container.innerHTML = `<div class="proposal-page">${content}</div>`;
}

// ===== 공통 헬퍼 =====
function groupItems(items) {
  const groups = {};
  items.forEach(c => {
    const g = c.cat ? c.cat.group : '기타';
    if (!groups[g]) groups[g] = [];
    groups[g].push(c);
  });
  return groups;
}

function renderGroupItems(groups) {
  if (Object.keys(groups).length === 0) {
    return '<div style="padding:10px 14px; color:#999; font-size:12px;">해당 담보 없음</div>';
  }
  let html = '';
  Object.entries(groups).forEach(([group, items]) => {
    html += `<div class="coverage-group-title">${group}</div>`;
    items.forEach(c => {
      html += `
        <div class="coverage-item">
          <span class="coverage-label" style="font-size:12px;">${c.cat ? c.cat.label : c.name}</span>
          <span class="coverage-amount ${c.amount === 0 ? 'zero' : ''}">${formatManwon(toManwon(c.amount))}</span>
        </div>
      `;
    });
  });
  return html;
}

function renderDetailTable(items) {
  if (!items || items.length === 0) return '<div style="color:#999; text-align:center; padding:20px;">담보 없음</div>';
  return `
    <div style="overflow-x:auto;">
      <table class="result-table" style="font-size:12px;">
        <thead>
          <tr>
            <th>#</th>
            <th>구분</th>
            <th>담보명</th>
            <th>납기/만기</th>
            <th>가입금액</th>
            <th>보험료</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((c, i) => `
            <tr>
              <td style="color:#999;">${i + 1}</td>
              <td><span class="cat-badge cat-${c.cat ? c.cat.cat : '기타'}">${c.cat ? c.cat.sub : '기타'}</span></td>
              <td style="max-width:300px; font-size:11px;">${c.name}</td>
              <td style="font-size:11px; color:var(--text-light);">${c.period || '-'}</td>
              <td class="amount-cell">${formatManwon(toManwon(c.amount))}</td>
              <td class="premium-cell">${c.premium.toLocaleString()}원</td>
            </tr>
          `).join('')}
          <tr style="background:var(--orange-pale); font-weight:700;">
            <td colspan="4" style="text-align:right; padding:10px 12px;">합계</td>
            <td class="amount-cell">${formatManwon(toManwon(sumAmounts(items)))}</td>
            <td class="premium-cell">${Math.round(sumPremiums(items)).toLocaleString()}원</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// ===== 인쇄 =====
function printSection(section) {
  const prevActive = document.querySelector('.tab-content.active');
  switchTab(section);
  setTimeout(() => {
    window.print();
    if (prevActive) {
      const id = prevActive.id.replace('content-', '');
      setTimeout(() => switchTab(id), 500);
    }
  }, 300);
}

// ===== 샘플 데이터 =====
function loadSampleData() {
  document.getElementById('customerName').value = '홍길동';
  document.getElementById('customerBirth').value = '1984.04.01';
  document.getElementById('customerGender').value = '남';
  document.getElementById('plannerName').value = '임현자';
  document.getElementById('branchName').value = '잠실지점';
  document.getElementById('productName').value = '퍼펙트플러스종합보험(세만기형)';
  document.getElementById('paymentInfo').value = '20년납 100세만기';
  updateHeader();

  const sampleData = `서열\t생년월일\t담보\t담보명\t납기/만기\t가입금액\t보험료
00001\t8404011\t3A02\t기본계약(상해사망)\t20년납100세만기\t100000000\t5050
00001\t8404011\t3A01\t기본계약(상해후유장해)\t20년납100세만기\t10000000\t460
00001\t8404011\t4186\t보험료납입면제대상담보\t전기납20년만기\t100000\t80
00001\t8404011\t1323\t상해사망추가담보\t20년납80세만기\t50000000\t2065
00001\t8404011\t4856\t상해후유장해(20%이상)담보\t20년납100세만기\t100000000\t2660
00001\t8404011\t4155\t골절진단담보\t20년납100세만기\t300000\t3243
00001\t8404011\t4821\t골절진단(치아파절제외)담보\t20년납100세만기\t300000\t1752
00001\t8404011\t4245\t5대골절진단담보\t20년납100세만기\t1000000\t810
00001\t8404011\tA001\t암진단Ⅱ(유사암제외)\t20년납100세만기\t50000000\t46399
00001\t8404011\tA002\t암진단Ⅱ(유사암제외)(납입면제후보장강화)\t20년납100세만기\t10000000\t15223
00001\t8404011\tA003\t암진단Ⅱ(소액암및유사암제외)\t20년납100세만기\t10000000\t12332
00001\t8404011\tA004\t암주요치료비(1형)(암치료급여금(기타피부암및갑상선암제외))(연간1회한,진단후5년)\t20년납100세만기\t20000000\t0
00001\t8404011\tA005\t특정암진단\t20년납100세만기\t10000000\t8200
00001\t8404011\tA006\t고액치료비암진단\t20년납100세만기\t10000000\t6500
00001\t8404011\tA007\t남성생식기암진단\t20년납100세만기\t10000000\t3200
00001\t8404011\tA008\t중증갑상선암진단\t20년납100세만기\t10000000\t2100
00001\t8404011\tA009\t양성뇌종양진단\t20년납100세만기\t10000000\t4500
00001\t8404011\tA010\t유사암진단Ⅱ(양성뇌종양포함)\t20년납100세만기\t20000000\t9800
00001\t8404011\tA011\t재진단암진단\t20년납100세만기\t20000000\t12500
00001\t8404011\tA012\t전이암진단(최초1회한)(림프절전이암)\t20년납100세만기\t20000000\t8900
00001\t8404011\tA013\t전이암진단(최초1회한)(특정전이암)\t20년납100세만기\t20000000\t7600
00001\t8404011\tA014\t암수술\t20년납100세만기\t8000000\t3100
00001\t8404011\tA015\t다빈치로봇암수술(갑상선암및전립선암제외)\t20년납100세만기\t2000000\t4200
00001\t8404011\tA016\t항암방사선약물치료후5대질병진단(2대)\t20년납100세만기\t1000000\t1500
00001\t8404011\tB001\t뇌출혈진단\t20년납100세만기\t10000000\t9800
00001\t8404011\tB002\t뇌졸중진단\t20년납100세만기\t20000000\t18500
00001\t8404011\tB003\t뇌졸중진단(납입면제후보장강화)\t20년납100세만기\t10000000\t12000
00001\t8404011\tB004\t뇌혈관질환진단\t20년납100세만기\t10000000\t8900
00001\t8404011\tB005\t뇌혈관질환(Ⅰ)진단\t20년납100세만기\t2000000\t3200
00001\t8404011\tB006\t뇌혈관질환(Ⅱ)진단\t20년납100세만기\t20000000\t15600
00001\t8404011\tB007\t혈전용해치료비Ⅱ(뇌졸중)\t20년납100세만기\t30000000\t5200
00001\t8404011\tB008\t혈관조영술검사지원비(뇌심장질환,연간1회한,급여)\t20년납100세만기\t100000\t1800
00001\t8404011\tC001\t급성심근경색증진단\t20년납100세만기\t20000000\t16800
00001\t8404011\tC002\t급성심근경색증진단(납입면제후보장강화)\t20년납100세만기\t10000000\t11200
00001\t8404011\tC003\t허혈심장질환진단\t20년납100세만기\t10000000\t8900
00001\t8404011\tC004\t심혈관질환(특정2대)진단\t20년납100세만기\t2000000\t3800
00001\t8404011\tC005\t심혈관질환(I49)진단\t20년납100세만기\t2000000\t2900
00001\t8404011\tC006\t심혈관질환(주요심장염증)진단\t20년납100세만기\t20000000\t8700
00001\t8404011\tC007\t심혈관질환(특정Ⅰ,I49제외)\t20년납100세만기\t20000000\t14200
00001\t8404011\tC008\t심혈관질환(특정Ⅱ)\t20년납100세만기\t20000000\t9600
00001\t8404011\tC009\t심뇌혈관질환수술\t20년납100세만기\t20000000\t12800
00001\t8404011\tC010\t허혈심장질환수술\t20년납100세만기\t10000000\t6500
00001\t8404011\tC011\t혈전용해치료비Ⅱ(특정심장질환)\t20년납100세만기\t30000000\t4800
00001\t8404011\tD001\t질병입원일당(1-180일)\t20년납100세만기\t20000\t15800
00001\t8404011\tD002\t질병입원일당(1-30일)\t20년납100세만기\t10000\t8200
00001\t8404011\tD003\t질병입원일당(1-180일,종합병원)\t20년납100세만기\t10000\t7600
00001\t8404011\tD004\t질병입원일당(1-30일,종합병원,1인실)\t20년납100세만기\t100000\t18900
00001\t8404011\tE001\t5대기관질병수술\t20년납100세만기\t10000000\t8900
00001\t8404011\tE002\t5대장기이식수술\t20년납100세만기\t10000000\t3200
00001\t8404011\tE003\t특정질병수술(남성)\t20년납100세만기\t2000000\t4500
00001\t8404011\tE004\t남성특정비뇨기계질환수술\t20년납100세만기\t1000000\t2800
00001\t8404011\tE005\t질병수술담보\t20년납100세만기\t200000\t6900
00001\t8404011\tE006\t질병수술Ⅱ(1-5종)\t20년납100세만기\t1000000\t8200
00001\t8404011\tE007\t6대기관양성종양(폴립포함)수술\t20년납100세만기\t300000\t9800
00001\t8404011\tE008\t충수염수술\t20년납100세만기\t200000\t1200
00001\t8404011\tE009\t탈장수술\t20년납100세만기\t200000\t1800
00001\t8404011\tE010\t전신마취수술(4시간이상)\t20년납100세만기\t8000000\t5600
00001\t8404011\tE011\t전신마취수술(6시간이상)\t20년납100세만기\t22000000\t8900
00001\t8404011\tF001\t자동차사고부상치료비\t20년납100세만기\t2000000\t3800
00001\t8404011\tF002\t자동차사고벌금\t20년납100세만기\t30000000\t9200`;

  document.getElementById('pasteArea').value = sampleData;
  alert('샘플 데이터가 입력되었습니다.\n"⚡ 데이터 분석하기" 버튼을 클릭하세요.');
}

// ===== 캐시 완전 초기화 후 새로고침 =====
async function hardReload() {
  try {
    // 서비스 워커 해제
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    // Cache Storage 전체 삭제
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) { /* 무시 */ }
  // 쿼리스트링으로 캐시 우회 강제 리로드
  const url = location.href.split('?')[0] + '?_r=' + Date.now();
  location.replace(url);
}

// ===== 플로팅 새로고침 버튼 드래그 + 코너 스냅 =====
(function initFloatBtn() {
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('floatRefreshBtn');
    if (!btn) return;

    let dragging = false;
    let moved = false;
    let startX = 0, startY = 0;
    let curLeft = 16, curTop = 120;

    // 4개 코너 위치 계산 (헤더+탭바 높이 고려)
    function snapCorners() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const bw = btn.offsetWidth + 16;
      const bh = btn.offsetHeight + 16;
      const headerH = 120; // header + nav 높이
      return [
        { left: 16,      top: headerH,       right: 'auto', bottom: 'auto' }, // 좌상
        { left: W - bw,  top: headerH,       right: 'auto', bottom: 'auto' }, // 우상
        { left: 16,      top: H - bh,        right: 'auto', bottom: 'auto' }, // 좌하
        { left: W - bw,  top: H - bh,        right: 'auto', bottom: 'auto' }, // 우하
      ];
    }

    function nearestCorner(cx, cy) {
      const corners = snapCorners();
      let best = corners[0], bestDist = Infinity;
      corners.forEach(c => {
        const d = Math.hypot(cx - c.left, cy - c.top);
        if (d < bestDist) { bestDist = d; best = c; }
      });
      return best;
    }

    function applyPos(pos, animate) {
      if (animate) btn.style.transition = 'left 0.28s cubic-bezier(.4,0,.2,1), top 0.28s cubic-bezier(.4,0,.2,1)';
      else btn.style.transition = 'none';
      btn.style.left = pos.left + 'px';
      btn.style.top  = pos.top  + 'px';
      btn.style.right  = 'auto';
      btn.style.bottom = 'auto';
      curLeft = pos.left; curTop = pos.top;
    }

    function onStart(clientX, clientY) {
      dragging = true; moved = false;
      const rect = btn.getBoundingClientRect();
      startX = clientX - rect.left;
      startY = clientY - rect.top;
      btn.style.transition = 'none';
    }

    function onMove(clientX, clientY) {
      if (!dragging) return;
      const nx = clientX - startX;
      const ny = clientY - startY;
      if (Math.abs(nx - curLeft) > 4 || Math.abs(ny - curTop) > 4) moved = true;
      const W = window.innerWidth, H = window.innerHeight;
      curLeft = Math.max(0, Math.min(W - btn.offsetWidth, nx));
      curTop  = Math.max(0, Math.min(H - btn.offsetHeight, ny));
      btn.style.left = curLeft + 'px';
      btn.style.top  = curTop  + 'px';
      btn.style.right = 'auto';
      btn.style.bottom = 'auto';
    }

    function onEnd() {
      if (!dragging) return;
      dragging = false;
      if (!moved) { hardReload(); return; }
      const pos = nearestCorner(curLeft + btn.offsetWidth / 2, curTop + btn.offsetHeight / 2);
      applyPos(pos, true);
    }

    // ownTouch: 터치가 이 버튼에서 시작됐는지 추적 (다른 요소 터치 시 인터셉트 방지)
    let ownTouch = false;

    btn.addEventListener('mousedown',  e => { e.preventDefault(); onStart(e.clientX, e.clientY); });
    document.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
    document.addEventListener('mouseup',   () => onEnd());

    btn.addEventListener('touchstart', e => {
      ownTouch = true;
      const t = e.touches[0];
      onStart(t.clientX, t.clientY);
    }, { passive: true });

    document.addEventListener('touchmove', e => {
      if (!ownTouch || !dragging) return;
      e.preventDefault();
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }, { passive: false });

    document.addEventListener('touchend', () => {
      if (!ownTouch) return;
      ownTouch = false;
      onEnd();
    });
  });
})();

// ===== 탭 QR 초기화 =====
document.addEventListener('DOMContentLoaded', initTabQRs);

// ===== 초기화 =====
function clearAll() {
  if (!confirm('모든 데이터를 초기화하시겠습니까?')) return;
  document.getElementById('pasteArea').value = '';
  document.getElementById('resultCard').style.display = 'none';
  document.getElementById('summaryCard').style.display = 'none';
  parsedCoverages = [];
  ['allinone', 'death', 'injury', 'onepager', 'cancer', 'brain', 'heart', 'woman', 'driver', 'daily', 'surgery'].forEach(section => {
    const el = document.getElementById(section + 'Content');
    if (el) el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📊</div><h3>데이터를 먼저 입력해주세요</h3></div>`;
  });
}
