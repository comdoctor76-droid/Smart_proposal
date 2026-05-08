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
    { label: '일반암진단',  kws: ['일반암'] },
    { label: '유사암진단',  kws: ['유사암', '소액암', '갑상선암'] },
    { label: '항암치료비',  kws: ['표적항암', '면역항암', '카티(CAR-T)', '다빈치로봇', '양성자'] },
    { label: '암수술비',    kws: ['암수술', '암치료수술'] },
  ];

  const statsRows = [
    { rank:'1위', label:'갑상선암',  pct:12.1, cov:'유사암진단',  kws:['유사암','갑상선암','소액암'] },
    { rank:'2위', label:'대장암',    pct:12.0, cov:'일반암진단',  kws:['일반암'] },
    { rank:'3위', label:'폐암',      pct:11.2, cov:'일반암진단',  kws:['일반암'] },
    { rank:'4위', label:'위암',      pct:9.5,  cov:'일반암진단',  kws:['일반암'] },
    { rank:'5위', label:'유방암',    pct:9.3,  cov:'일반암진단',  kws:['일반암'] },
    { rank:'6위', label:'전립선암',  pct:8.0,  cov:'일반암진단',  kws:['일반암'] },
    { rank:'7위', label:'간암',      pct:5.6,  cov:'일반암진단',  kws:['일반암'] },
    { rank:'8위', label:'췌장암',    pct:3.2,  cov:'일반암진단',  kws:['일반암'] },
    { rank:'9위', label:'담낭암',    pct:2.6,  cov:'일반암진단',  kws:['일반암'] },
    { rank:'10위',label:'신장암',    pct:2.5,  cov:'일반암진단',  kws:['일반암'] },
  ];

  const ageGroups = [
    { age:'50대', causes:['갑상선','대장','유방','위','폐'],   kws:[['유사암','갑상선암','소액암'],['일반암'],['일반암'],['일반암'],['일반암']] },
    { age:'60대', causes:['폐','대장','위','간','전립선'],     kws:[['일반암'],['일반암'],['일반암'],['일반암'],['일반암']] },
    { age:'70대', causes:['폐','대장','위','간','췌장'],       kws:[['일반암'],['일반암'],['일반암'],['일반암'],['일반암']] },
  ];

  const content = `
    <div style="padding:12px 15px 10px;font-size:11px;">
      ${makeSmartTabHdr('암보험금편', customer, product, payment, totalPremium, today)}
      ${makeSmartEnroll('cancer', enrollCols, kws => fmtA(kws), kws => fmtP(kws), '일반암 기준 / 유사암·소액암 별도 약관 참조')}
      ${makeSmartStats('📊', '암 발생통계 (2022년 기준)', 13,
          ['순위','암종류','구성비','보장담보','보험금'], statsRows, kws => fmtA(kws))}
      ${makeSmartAge('👤', '연령대별 암 발생 현황', '암보험금', ageGroups, kws => fmtA(kws))}
      <div style="font-size:8px;color:#999;border-top:1px solid #eee;padding-top:5px;margin-top:2px;">
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
    { label: '뇌출혈',   kws: ['뇌출혈'] },
    { label: '뇌경색',   kws: ['뇌경색','뇌졸중'] },
    { label: '뇌혈관질환', kws: ['뇌혈관질환'] },
    { label: '수술비',   kws: ['심뇌혈관질환수술','심뇌혈관질환주요치료비','혈전용해치료비'] },
  ];

  const statsRows = [
    { rank:'1위', label:'뇌경색(허혈성)', pct:71.2, cov:'진단+수술비', kws:['뇌경색','뇌졸중'] },
    { rank:'2위', label:'뇌출혈(출혈성)', pct:21.0, cov:'진단+수술비', kws:['뇌출혈'] },
    { rank:'3위', label:'일과성뇌허혈',   pct:7.8,  cov:'뇌혈관질환',  kws:['뇌혈관질환'] },
  ];

  const ageGroups = [
    { age:'50대', causes:['뇌경색','뇌출혈','뇌혈관질환'], kws:[['뇌경색','뇌졸중'],['뇌출혈'],['뇌혈관질환']] },
    { age:'60대', causes:['뇌경색','뇌출혈','뇌혈관질환'], kws:[['뇌경색','뇌졸중'],['뇌출혈'],['뇌혈관질환']] },
    { age:'70대', causes:['뇌경색','뇌출혈','뇌혈관질환'], kws:[['뇌경색','뇌졸중'],['뇌출혈'],['뇌혈관질환']] },
  ];

  const content = `
    <div style="padding:12px 15px 10px;font-size:11px;">
      ${makeSmartTabHdr('뇌혈관보험금편', customer, product, payment, totalPremium, today)}
      ${makeSmartEnroll('brain', enrollCols, kws => fmtA(kws), kws => fmtP(kws), '')}
      ${makeSmartStats('📊', '뇌혈관질환 통계 (2022년 기준)', 75,
          ['순위','뇌혈관질환','구성비','보장담보','보험금'], statsRows, kws => fmtA(kws))}
      ${makeSmartAge('👤', '연령대별 뇌혈관질환 현황', '뇌혈관보험금', ageGroups, kws => fmtA(kws))}
      <div style="font-size:8px;color:#999;border-top:1px solid #eee;padding-top:5px;margin-top:2px;">
        ⚠️ 위 보장내용은 실제 증권 내용과 다를 수 있으며, 정확한 내용은 보험증권을 확인해 주시기 바랍니다.
      </div>
    </div>`;

  container.innerHTML = `<div class="proposal-page">${content}</div>`;
}

// ===== 심장 보장 렌더링 =====
function renderHeart(coverages) {
  const container = document.getElementById('heartContent');
  const items = getCatCoverages(coverages, '심');

  const diagItems = items.filter(c => c.cat.sub === '진단');
  const surgItems = items.filter(c => c.cat.sub === '수술');

  const heartTypes = [
    { name: '부정맥', icon: '💓', filter: c => c.name.includes('I49') || c.name.includes('부정맥') },
    { name: '협심증', icon: '💔', filter: c => c.name.includes('허혈심장') || c.name.includes('협심') },
    { name: '급성심근경색', icon: '❤️‍🔥', filter: c => c.name.includes('급성심근경색') },
    { name: '심부전', icon: '💙', filter: c => c.name.includes('심부전') || c.name.includes('심혈관(특정Ⅱ)') },
    { name: '심장염증', icon: '🔴', filter: c => c.name.includes('심장염증') || c.name.includes('심혈관(주요') },
  ];

  container.innerHTML = `
    <div class="proposal-page">
      ${makePageHeader('❤️', "안 보이는 '심장' 보험을 한눈에 보여주는 스마트제안서", '심장질환 진단·수술·치료 보장')}
      <div class="page-body">
        <div class="flow-diagram">
          ${heartTypes.map((ht, i) => {
            const matched = diagItems.filter(ht.filter);
            return `
              <div class="flow-stage">
                <div class="flow-stage-title">${ht.name}</div>
                <div style="font-size:28px; margin-bottom:6px;">${ht.icon}</div>
                <div class="flow-stage-amount">${matched.length > 0 ? formatManwon(toManwon(sumAmounts(matched))) : '-'}</div>
                <div class="flow-stage-desc">진단금</div>
              </div>
              ${i < heartTypes.length - 1 ? '<div class="flow-arrow">|</div>' : ''}
            `;
          }).join('')}
        </div>
        <div class="proposal-grid">
          ${makeCollapsibleCol('①', '진단 보장', diagItems, '', formatManwon(toManwon(sumAmounts(diagItems))))}
          ${makeCollapsibleCol('②', '수술/치료 보장', surgItems, 'blue', formatManwon(toManwon(sumAmounts(surgItems))))}
          <div class="proposal-col">
            <div class="col-header purple">③ 보장 요약</div>
            <div style="padding:14px;text-align:center;">
              <div style="font-size:40px;margin-bottom:6px;">❤️</div>
              <div style="font-size:28px;font-weight:800;color:var(--orange);">${formatManwon(toManwon(sumAmounts(items)))}</div>
              <div style="font-size:11px;color:var(--text-light);margin-top:8px;line-height:1.8;">
                진단 ${diagItems.length}개 · 수술/치료 ${surgItems.length}개<br>
                월 보험료 ${Math.round(sumPremiums(items)).toLocaleString()}원
              </div>
            </div>
          </div>
        </div>
        <div class="section-divider">심장 보장 상세 내역</div>
        ${renderDetailTable(items)}
      </div>
    </div>
  `;
}

// ===== 사망·장해 보장 렌더링 =====
function renderDeath(coverages) {
  const container = document.getElementById('deathContent');
  const allInjury = getCatCoverages(coverages, '상해');
  const deathItems = allInjury.filter(c => c.cat.sub === '사망장해');
  const deathOnly = deathItems.filter(c => c.name.includes('사망') && !c.name.includes('후유장해'));
  const disabilityOnly = deathItems.filter(c => c.name.includes('후유장해') || c.name.includes('장해'));

  container.innerHTML = `
    <div class="proposal-page">
      ${makePageHeader('🛡️', "안 보이는 '사망·장해' 보험을 한눈에 보여주는 스마트제안서", '상해사망·후유장해 보장')}
      <div class="page-body">
        <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
          <div class="highlight-box" style="flex:1;min-width:140px;">
            <div>
              <div class="highlight-label">상해사망</div>
              <div style="font-size:11px;opacity:0.8;margin-top:2px;">상해사망 담보 기준</div>
            </div>
            <div class="highlight-amount">${formatManwon(toManwon(sumAmounts(deathOnly)))}</div>
          </div>
          <div class="highlight-box" style="flex:1;min-width:140px;background:linear-gradient(135deg,#3300CC,#1A0088);">
            <div>
              <div class="highlight-label">상해후유</div>
              <div style="font-size:11px;opacity:0.8;margin-top:2px;">상해후유장해 담보 기준</div>
            </div>
            <div class="highlight-amount">${formatManwon(toManwon(sumAmounts(disabilityOnly)))}</div>
          </div>
        </div>
        <div class="proposal-grid">
          ${makeCollapsibleCol('①', '상해사망 보장', deathOnly, '', formatManwon(toManwon(sumAmounts(deathOnly))))}
          ${makeCollapsibleCol('②', '상해후유 보장', disabilityOnly, 'blue', formatManwon(toManwon(sumAmounts(disabilityOnly))))}
        </div>
        <div class="section-divider">사망·장해 보장 상세 내역</div>
        ${renderDetailTable(deathItems)}
      </div>
    </div>
  `;
}

// ===== 상해 보장 렌더링 (골절·화상·재활) =====
function renderInjury(coverages) {
  const container = document.getElementById('injuryContent');
  if (!container) return;
  const allInjury = getCatCoverages(coverages, '상해');
  const fracItems  = allInjury.filter(c => c.cat.sub === '골절화상');
  const rehabItems = allInjury.filter(c => c.cat.sub === '재활');
  const otherItems = allInjury.filter(c => !['사망장해','골절화상','재활'].includes(c.cat.sub));
  const totalItems = [...fracItems, ...rehabItems, ...otherItems];

  if (totalItems.length === 0) {
    container.innerHTML = `<div class="card"><div class="empty-state"><div class="empty-state-icon">🦴</div><h3>상해 담보 없음</h3><p>골절·화상·재활 관련 담보가 없습니다.</p></div></div>`;
    return;
  }

  container.innerHTML = `
    <div class="proposal-page">
      ${makePageHeader('🦴', "안 보이는 '상해' 보험을 한눈에 보여주는 스마트제안서", '골절·화상·재활 보장')}
      <div class="page-body">
        <div class="highlight-box">
          <div><div class="highlight-label">상해 보장 합계</div></div>
          <div class="highlight-amount">${formatManwon(toManwon(sumAmounts(totalItems)))}</div>
        </div>
        <div class="proposal-grid">
          ${makeCollapsibleCol('①', '골절·화상 보장', fracItems, '', formatManwon(toManwon(sumAmounts(fracItems))))}
          ${makeCollapsibleCol('②', '재활 보장', rehabItems, 'blue', rehabItems.length + '개')}
          ${otherItems.length > 0 ? makeCollapsibleCol('③', '기타 상해 보장', otherItems, 'purple', formatManwon(toManwon(sumAmounts(otherItems)))) : ''}
        </div>
        <div class="section-divider">상해 보장 상세 내역</div>
        ${renderDetailTable(totalItems)}
      </div>
    </div>
  `;
}

// ===== 한장 요약 렌더링 =====
function renderOnePager(coverages) {
  const container = document.getElementById('onepagerContent');
  const customer = document.getElementById('customerName').value.trim() || '고객';

  const cancerItems = getCatCoverages(coverages, '암');
  const brainItems = getCatCoverages(coverages, '뇌');
  const heartItems = getCatCoverages(coverages, '심');
  const deathItems = getCatCoverages(coverages, '상해').filter(c => c.cat.sub === '사망장해');
  const totalPremium = sumPremiums(coverages);

  // 각 섹션별 진단 주요 금액
  const cancerDiag = cancerItems.filter(c => c.cat.sub === '진단' && ['일반암', '특정암'].includes(c.cat.group));
  const brainDiag = brainItems.filter(c => c.cat.sub === '진단');
  const heartDiag = heartItems.filter(c => c.cat.sub === '진단');

  function makeSection(icon, color, title, diagItems, allItems) {
    const sid = 'ops' + (++_colSec);
    const topItems = diagItems.slice(0, 5);
    const totalAmt = formatManwon(toManwon(sumAmounts(allItems)));
    return `
      <div style="flex:1; border:2px solid ${color}; border-radius:10px; overflow:hidden; min-width:180px;">
        <div style="background:${color}; color:white; padding:10px 14px; font-size:14px; font-weight:800; display:flex; align-items:center; justify-content:space-between; gap:8px; cursor:pointer; user-select:none;"
             onclick="(function(){var el=document.getElementById('${sid}');var ar=document.getElementById('${sid}_a');var open=el.style.display!=='none';el.style.display=open?'none':'block';ar.style.transform=open?'':'rotate(180deg)';if(!open){el.style.animation='none';requestAnimationFrame(function(){el.style.animation='slideDown 0.25s ease';});}})()">
          <span><span>${icon}</span> ${title} 총 ${totalAmt}</span>
          <span id="${sid}_a" style="font-size:10px; transition:transform 0.25s; display:inline-block;">▼</span>
        </div>
        <div id="${sid}" style="display:none;">
          <div style="padding:6px 0;">
            ${topItems.length > 0 ? topItems.map(c => `
              <div style="display:flex; justify-content:space-between; padding:6px 12px; border-bottom:1px solid #f0f0f0; font-size:12px;">
                <span style="flex:1; color:#333;">${c.cat ? c.cat.label : c.name}</span>
                <span style="font-weight:700; color:${color}; white-space:nowrap; margin-left:8px;">${formatManwon(toManwon(c.amount))}</span>
              </div>
            `).join('') : '<div style="padding:10px 12px; color:#999; font-size:12px;">담보 없음</div>'}
            ${allItems.length > topItems.length ? `<div style="padding:6px 12px; font-size:11px; color:#999;">외 ${allItems.length - topItems.length}개 담보...</div>` : ''}
          </div>
          <div style="background:#f8f8f8; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid #e0e0e0;">
            <span style="font-size:11px; color:#666; font-weight:700;">총 ${allItems.length}개 담보</span>
            <span style="font-size:14px; font-weight:800; color:${color};">${totalAmt}</span>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="proposal-page">
      ${makePageHeader('📄', "안 보이는 '핵심 보장'을 한눈에 보여주는 스마트제안서", '암 · 뇌 · 심장 핵심 보장 한눈에 보기')}
      <div class="page-body">
        <div style="display:flex; justify-content:flex-end; margin-bottom:12px; font-size:12px; color:var(--text-light);">
          <span>월 납입 보험료 합계 <strong style="color:var(--orange); font-size:14px;">${Math.round(totalPremium).toLocaleString()}원</strong> · 총 ${coverages.length}개 담보</span>
        </div>

        <div style="display:flex; gap:14px; flex-wrap:wrap; margin-bottom:16px;">
          ${makeSection('🔬', '#CC0000', '암 보장', cancerDiag, cancerItems)}
          ${makeSection('🧠', '#3344CC', '뇌 보장', brainDiag, brainItems)}
          ${makeSection('❤️', '#CC1155', '심장 보장', heartDiag, heartItems)}
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px;">
          <div style="border:1px solid var(--gray); border-radius:8px; padding:12px 14px;">
            <div style="font-size:12px; font-weight:800; color:var(--orange); margin-bottom:8px;">🛡️ 사망·장해 보장</div>
            ${deathItems.slice(0, 4).map(c => `
              <div style="display:flex; justify-content:space-between; font-size:12px; padding:3px 0; border-bottom:1px solid #f0f0f0;">
                <span>${c.cat ? c.cat.label : c.name}</span>
                <span style="font-weight:700; color:var(--orange);">${formatManwon(toManwon(c.amount))}</span>
              </div>
            `).join('')}
            <div style="text-align:right; margin-top:6px; font-size:13px; font-weight:800; color:var(--orange);">${formatManwon(toManwon(sumAmounts(deathItems)))}</div>
          </div>
          <div style="border:1px solid var(--gray); border-radius:8px; padding:12px 14px; background:var(--orange-pale);">
            <div style="font-size:12px; font-weight:800; color:var(--orange); margin-bottom:8px;">📊 보장 현황 요약</div>
            <div style="font-size:12px; line-height:2;">
              <div style="display:flex; justify-content:space-between;"><span>🔬 암 담보</span><span style="font-weight:700;">${cancerItems.length}개</span></div>
              <div style="display:flex; justify-content:space-between;"><span>🧠 뇌 담보</span><span style="font-weight:700;">${brainItems.length}개</span></div>
              <div style="display:flex; justify-content:space-between;"><span>❤️ 심장 담보</span><span style="font-weight:700;">${heartItems.length}개</span></div>
              <div style="display:flex; justify-content:space-between;"><span>🛡️ 사망·장해</span><span style="font-weight:700;">${deathItems.length}개</span></div>
            </div>
          </div>
        </div>

        <div class="notice-box">
          ⚠️ 위 보장내용은 실제 증권 내용과 다를 수 있으며, 정확한 내용은 보험증권을 확인해 주시기 바랍니다.
        </div>
      </div>
    </div>
  `;
}

// ===== 수술(여) 렌더링 =====
function renderWoman(coverages) {
  const container = document.getElementById('womanContent');
  const surgItems = getCatCoverages(coverages, '수술');
  const cancerItems = getCatCoverages(coverages, '암');

  // 여성 수술 담보
  const womanSurgItems = surgItems.filter(c => c.cat.sub === '여성수술');
  // 여성 양성종양 (유방, 자궁근종, 자궁내막증, 갑상선결절)
  const benignWoman = surgItems.filter(c => c.cat.sub === '여성양성종양' ||
    (c.cat.group && ['유방양성종양', '자궁근종', '자궁내막증', '갑상선결절'].some(kw => c.cat.group.includes(kw))));
  // 여성암 진단 (유방암, 자궁암, 난소암 등)
  const womanCancerDiag = cancerItems.filter(c => c.cat.group && ['여성암', '유방암', '자궁암', '난소암'].some(kw => c.cat.group.includes(kw)));
  const womanCancerAll = cancerItems.filter(c => c.cat.sub === '진단' && c.cat.group && c.cat.group.includes('여성'));
  // 5대기관 및 일반 질병 수술
  const mainItems = surgItems.filter(c => ['5대기관', '질병수술'].includes(c.cat.sub));
  const specialItems = surgItems.filter(c => ['특수', '전신마취', '양성종양'].includes(c.cat.sub));

  const womanBenignMap = [
    { label: '유방양성종양', kw: ['유방양성', '유방종양'] },
    { label: '자궁근종', kw: ['자궁근종'] },
    { label: '자궁내막증', kw: ['자궁내막증'] },
    { label: '갑상선결절', kw: ['갑상선결절', '갑상선'] },
  ].map(b => ({
    label: b.label,
    amount: surgItems.find(c => b.kw.some(kw => c.name.includes(kw)))?.amount || 0
  }));

  const womanCancerMap = [
    { label: '유방암', kw: ['유방암'] },
    { label: '자궁암', kw: ['자궁암', '자궁경부암'] },
    { label: '난소암', kw: ['난소암'] },
    { label: '갑상선암', kw: ['갑상선암', '중증갑상선암'] },
    { label: '폐암', kw: ['폐암'] },
  ].map(b => ({
    label: b.label,
    amount: cancerItems.find(c => b.kw.some(kw => c.name.includes(kw)))?.amount || 0
  }));

  container.innerHTML = `
    <div class="proposal-page">
      ${makePageHeader('🌸', "안 보이는 '수술' 보험을 한눈에 보여주는 스마트제안서 (여성)", '여성 특화 수술·암 보장')}
      <div class="page-body">
        <div class="highlight-box" style="background:linear-gradient(135deg, #CC0066, #990044);">
          <div>
            <div class="highlight-label">▣ 여성양성종양 집중보장</div>
            <div style="font-size:12px; opacity:0.8; margin-top:2px;">유방양성종양 / 자궁근종 / 자궁내막증 / 갑상선결절</div>
          </div>
          <div class="highlight-amount">${womanSurgItems.length + benignWoman.length + specialItems.length}개 담보</div>
        </div>

        <div style="margin:14px 0;">
          <div style="font-size:12px; font-weight:800; color:#CC0066; margin-bottom:8px;">① 여성 양성종양 치료 보장</div>
          <div class="flow-diagram">
            ${womanBenignMap.map(b => `
              <div class="flow-stage">
                <div class="flow-stage-title">${b.label}</div>
                <div class="flow-stage-amount">${b.amount > 0 ? formatManwon(toManwon(b.amount)) : '-'}</div>
              </div>
            `).join('<div class="flow-arrow">|</div>')}
          </div>
        </div>

        <div style="margin:14px 0;">
          <div style="font-size:12px; font-weight:800; color:#CC0066; margin-bottom:8px;">② 여성암 집중보장</div>
          <div class="flow-diagram">
            ${womanCancerMap.map(b => `
              <div class="flow-stage">
                <div class="flow-stage-title">${b.label}</div>
                <div class="flow-stage-amount" style="color:#CC0000;">${b.amount > 0 ? formatManwon(toManwon(b.amount)) : '-'}</div>
              </div>
            `).join('<div class="flow-arrow">|</div>')}
          </div>
        </div>

        <div class="proposal-grid">
          ${makeCollapsibleCol('①', '여성 특정 수술', womanSurgItems.length > 0 ? womanSurgItems : benignWoman, '', formatManwon(toManwon(sumAmounts(womanSurgItems.length > 0 ? womanSurgItems : benignWoman))))}
          ${makeCollapsibleCol('②', '5대기관·주요수술', mainItems, 'blue', formatManwon(toManwon(sumAmounts(mainItems))))}
          ${makeCollapsibleCol('③', '특수·기타 수술', specialItems, 'purple', specialItems.length + '개')}
        </div>
        <div class="section-divider">수술(여) 보장 상세 내역</div>
        ${renderDetailTable([...womanSurgItems, ...benignWoman, ...mainItems, ...specialItems])}
      </div>
    </div>
  `;
}

// ===== 운전자 보장 렌더링 =====
function renderDriver(coverages) {
  const container = document.getElementById('driverContent');
  const items = getCatCoverages(coverages, '운전자');

  if (items.length === 0) {
    container.innerHTML = `<div class="card"><div class="empty-state"><div class="empty-state-icon">🚗</div><h3>운전자 담보 없음</h3><p>가입된 운전자 관련 담보가 없습니다.</p></div></div>`;
    return;
  }

  container.innerHTML = `
    <div class="proposal-page">
      ${makePageHeader('🚗', "안 보이는 '운전자' 보험을 한눈에 보여주는 스마트제안서", '자동차사고 법률·치료 보장')}
      <div class="page-body">
        <div class="allinone-grid">
          <div class="coverage-section">
            <div class="section-title section-title-driver">🚗 운전자 담보 목록</div>
            <div class="coverage-list">${makeCoverageList(items)}</div>
          </div>
          <div class="card" style="background:var(--orange-pale);">
            <h3 style="margin-bottom:12px; font-size:15px;">📊 보장 요약</h3>
            <div style="font-size:32px; font-weight:800; color:var(--orange); text-align:center; margin:16px 0;">${formatManwon(toManwon(sumAmounts(items)))}</div>
            <div style="font-size:13px; color:var(--text-light); text-align:center;">전체 운전자 담보 합계</div>
          </div>
        </div>
        <div class="section-divider">운전자 보장 상세 내역</div>
        ${renderDetailTable(items)}
      </div>
    </div>
  `;
}

// ===== 입원일당 렌더링 =====
function renderDaily(coverages) {
  const container = document.getElementById('dailyContent');
  const items = getCatCoverages(coverages, '입원일당');

  const diseaseItems = items.filter(c => c.cat.sub === '질병');
  const hospitalItems = items.filter(c => c.cat.sub === '종합병원' || c.cat.sub === '상급종합');
  const nursingItems = items.filter(c => c.cat.sub === '간호간병');
  const otherItems = items.filter(c => !['질병', '종합병원', '상급종합', '간호간병'].includes(c.cat.sub));

  // 하루 최대 입원일당 계산
  const maxDaily = items.reduce((sum, c) => {
    const dv = toManwon(c.amount);
    return sum + dv;
  }, 0);

  container.innerHTML = `
    <div class="proposal-page">
      ${makePageHeader('🏥', "안 보이는 '입원일당' 보험을 한눈에 보여주는 스마트제안서", '질병 입원 시 하루 보장 내역')}
      <div class="page-body">
        <div class="highlight-box">
          <div>
            <div class="highlight-label">종합병원 입원 시 하루 최대 보장</div>
            <div style="font-size:12px; opacity:0.8; margin-top:2px;">중복 지급 담보 포함 기준</div>
          </div>
          <div class="highlight-amount">${maxDaily}만원/일</div>
        </div>
        <div class="proposal-grid">
          ${makeCollapsibleCol('①', '일반 입원일당', diseaseItems, '', diseaseItems.length + '개')}
          ${makeCollapsibleCol('②', '종합/상급병원 일당', hospitalItems, 'blue', hospitalItems.length + '개')}
          ${makeCollapsibleCol('③', '간호간병 & 기타', [...nursingItems, ...otherItems], 'purple', (nursingItems.length + otherItems.length) + '개')}
        </div>
        <div class="section-divider">입원일당 상세 내역</div>
        ${renderDetailTable(items)}
      </div>
    </div>
  `;
}

// ===== 수술(남) 렌더링 =====
function renderSurgery(coverages) {
  const container = document.getElementById('surgeryContent');
  const items = getCatCoverages(coverages, '수술');

  const mainItems = items.filter(c => c.cat.sub === '5대기관');
  const diseaseItems = items.filter(c => c.cat.sub === '질병수술');
  const maleItems = items.filter(c => c.cat.sub === '남성수술');
  const specialItems = items.filter(c => c.cat.sub === '특수' || c.cat.sub === '전신마취' || c.cat.sub === '양성종양');
  const rehabItems = items.filter(c => c.cat.sub === '재활');

  // 남성 양성종양 집계
  const benignMap = [
    { label: '대장용종', amount: items.find(c => c.name.includes('대장양성종양') || c.name.includes('폴립'))?.amount || 0 },
    { label: '갑상선결절', amount: items.find(c => c.name.includes('갑상선'))?.amount || 0 },
    { label: '신장낭종', amount: items.find(c => c.name.includes('신장낭종') || c.name.includes('비뇨기'))?.amount || 0 },
    { label: '담낭용종', amount: items.find(c => c.name.includes('담낭'))?.amount || 0 },
  ];

  container.innerHTML = `
    <div class="proposal-page">
      ${makePageHeader('⚕️', "안 보이는 '수술' 보험을 한눈에 보여주는 스마트제안서 (남성)", '남성 특화 수술 보장')}
      <div class="page-body">
        <div class="highlight-box">
          <div>
            <div class="highlight-label">▣ 남성 양성종양 치료 집중 보장</div>
            <div style="font-size:12px; opacity:0.8; margin-top:2px;">대장용종 / 갑상선결절 / 신장낭종 / 담낭용종</div>
          </div>
          <div class="highlight-amount">${maleItems.length + specialItems.length}개 담보</div>
        </div>
        <div class="flow-diagram">
          ${benignMap.map(b => `
            <div class="flow-stage">
              <div class="flow-stage-title">${b.label}</div>
              <div class="flow-stage-amount">${b.amount > 0 ? formatManwon(toManwon(b.amount)) : '-'}</div>
            </div>
          `).join('<div class="flow-arrow">|</div>')}
        </div>
        <div class="proposal-grid">
          ${makeCollapsibleCol('①', '5대기관·주요수술', [...mainItems, ...diseaseItems], '', formatManwon(toManwon(sumAmounts([...mainItems, ...diseaseItems]))))}
          ${makeCollapsibleCol('②', '남성 특정 수술', maleItems, 'blue', formatManwon(toManwon(sumAmounts(maleItems))))}
          ${makeCollapsibleCol('③', '특수·기타 수술', [...specialItems, ...rehabItems], 'purple', (specialItems.length + rehabItems.length) + '개')}
        </div>
        <div class="section-divider">수술 보장 상세 내역</div>
        ${renderDetailTable(items)}
      </div>
    </div>
  `;
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
