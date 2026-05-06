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
      <td style="color:var(--text-light); font-size:11px;">${idx + 1}</td>
      <td><span class="cat-badge cat-${catName}">${catName}</span></td>
      <td style="font-size:12px;">${cov.name}</td>
      <td class="amount-cell">${formatManwon(toManwon(cov.amount))}</td>
      <td class="premium-cell">${cov.premium.toLocaleString()}원</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('resultCount').textContent = `총 ${coverages.length}개 담보`;
  document.getElementById('resultCard').style.display = 'block';

  // 통계 렌더링
  renderStats(catCounts, totalPremium);
}

function renderStats(catCounts, totalPremium) {
  const catInfo = {
    '암': { icon: '🔬', color: '#CC0000' },
    '뇌': { icon: '🧠', color: '#3300CC' },
    '심': { icon: '❤️', color: '#CC0066' },
    '상해': { icon: '🦴', color: '#006699' },
    '운전자': { icon: '🚗', color: '#336600' },
    '입원일당': { icon: '🏥', color: '#996600' },
    '수술': { icon: '⚕️', color: '#660099' },
    '납입면제': { icon: '✅', color: '#666' },
    '기타': { icon: '📋', color: '#999' },
  };

  const grid = document.getElementById('statsGrid');
  grid.innerHTML = '';
  Object.entries(catCounts).forEach(([cat, count]) => {
    const info = catInfo[cat] || catInfo['기타'];
    const div = document.createElement('div');
    div.className = 'stat-card';
    div.innerHTML = `<div class="stat-num" style="color:${info.color}">${info.icon} ${count}</div><div class="stat-label">${cat}</div>`;
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

// ===== 페이지 헤더 HTML =====
function makePageHeader(icon, title, subtitle) {
  const customer = document.getElementById('customerName').value.trim() || '고객';
  const planner = document.getElementById('plannerName').value.trim() || '';
  const branch = document.getElementById('branchName').value.trim() || '';
  const today = new Date().toLocaleDateString('ko-KR');

  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1>${icon} ${title}</h1>
        <div class="subtitle">${subtitle}</div>
        <div style="margin-top:6px; font-size:11px; opacity:0.8;">※ 본 자료는 보험 상품을 쉽게 이해하기 위해 제작된 것으로 모집용으로 사용 불가</div>
      </div>
      <div class="page-header-right">
        <div class="customer-name">< ${customer} > 고객님</div>
        <div>${branch ? branch + ' ' : ''}${planner ? planner + ' 플래너' : ''}</div>
        <div style="margin-top:4px; font-size:11px; opacity:0.8;">${today}</div>
      </div>
    </div>
  `;
}

// ===== 전체 섹션 렌더링 =====
function renderAllSections(coverages) {
  renderAllinone(coverages);
  renderCancer(coverages);
  renderBrain(coverages);
  renderHeart(coverages);
  renderInjury(coverages);
  renderDriver(coverages);
  renderDaily(coverages);
  renderSurgery(coverages);
}

// ===== 올인원 렌더링 =====
function renderAllinone(coverages) {
  const container = document.getElementById('allinoneContent');
  const cats = ['암', '뇌', '심', '상해', '운전자', '수술', '입원일당'];
  const catColors = {
    '암': '', '뇌': 'section-title-brain', '심': 'section-title-heart',
    '수술': 'section-title-surgery', '입원일당': 'section-title-daily',
    '상해': 'section-title-injury', '운전자': 'section-title-driver'
  };
  const catIcons = { '암': '🔬', '뇌': '🧠', '심': '❤️', '상해': '🦴', '운전자': '🚗', '수술': '⚕️', '입원일당': '🏥' };

  const totalPremium = sumPremiums(coverages);
  const customer = document.getElementById('customerName').value.trim() || '고객';
  const product = document.getElementById('productName').value.trim() || '';
  const payment = document.getElementById('paymentInfo').value.trim() || '';

  let sectionsHtml = '';
  cats.forEach(cat => {
    const items = getCatCoverages(coverages, cat);
    sectionsHtml += `
      <div class="coverage-section">
        <div class="section-title ${catColors[cat] || ''}">
          ${catIcons[cat]} ${cat} 담보
          <span style="margin-left:auto; font-size:12px; font-weight:400;">${items.length}개</span>
        </div>
        <div class="coverage-list">
          ${makeCoverageList(items)}
        </div>
      </div>
    `;
  });

  container.innerHTML = `
    <div class="proposal-page">
      ${makePageHeader('📊', '스마트 제안서 · 올인원', '내 보험 한번에 보여주는 스마트제안서')}
      <div class="page-body">
        ${product || payment ? `
          <div style="background:var(--orange-pale); padding:12px 16px; border-radius:10px; margin-bottom:20px; font-size:13px;">
            <strong>📌 ${product}</strong>${payment ? ' · ' + payment : ''}
          </div>
        ` : ''}
        <div class="highlight-box">
          <div>
            <div class="highlight-label">월 납입 보험료 합계</div>
            <div style="font-size:12px; opacity:0.8; margin-top:2px;">${customer} 고객님 현재 가입 담보 기준</div>
          </div>
          <div class="highlight-amount">${Math.round(totalPremium).toLocaleString()}원</div>
        </div>
        <div class="allinone-grid">${sectionsHtml}</div>
        <div class="notice-box" style="margin-top:16px;">
          ⚠️ 위 보장내용은 실제 증권 내용과 다를 수 있으며, 정확한 내용은 보험증권을 확인해 주시기 바랍니다.
        </div>
      </div>
    </div>
  `;
}

// ===== 암 보장 렌더링 =====
function renderCancer(coverages) {
  const container = document.getElementById('cancerContent');
  const items = getCatCoverages(coverages, '암');

  const diagItems = items.filter(c => c.cat.sub === '진단');
  const treatItems = items.filter(c => c.cat.sub === '치료');
  const surgItems = items.filter(c => c.cat.sub === '수술');

  // 주요 진단금 합계
  const totalDiag = diagItems.filter(c => ['일반암', '특정암', '고액암'].includes(c.cat.group)).reduce((s, c) => s + c.amount, 0);

  // 그룹별 집계
  const diagGroups = groupItems(diagItems);
  const treatGroups = groupItems(treatItems);
  const surgGroups = groupItems(surgItems);

  container.innerHTML = `
    <div class="proposal-page">
      ${makePageHeader('🔬', '암 보장 한번에 보여주는 스마트제안서', '진단 · 항암치료 · 수술 · 입원 보장')}
      <div class="page-body">
        <div class="highlight-box">
          <div>
            <div class="highlight-label">암 진단 시 주요 보장액 (일반암 기준)</div>
          </div>
          <div class="highlight-amount">${formatManwon(toManwon(totalDiag))}</div>
        </div>
        <div class="notice-box">
          ⚠️ 암담보 특약은 <strong>가입 후 90일 면책기간</strong>이 적용되며, 가입 후 1년 이내 진단 시 50% 감액 조건이 있습니다.
        </div>
        <div class="proposal-grid">
          <div class="proposal-col">
            <div class="col-header">① 진단 보장</div>
            ${renderGroupItems(diagGroups)}
            <div class="total-bar">
              <span class="total-label">진단 담보 합계</span>
              <span class="total-amount">${formatManwon(toManwon(sumAmounts(diagItems)))}</span>
            </div>
          </div>
          <div class="proposal-col">
            <div class="col-header blue">② 최신 항암치료 보장</div>
            ${renderGroupItems(treatGroups)}
            <div class="total-bar">
              <span class="total-label">치료 담보 수</span>
              <span class="total-amount">${treatItems.length}개</span>
            </div>
          </div>
          <div class="proposal-col">
            <div class="col-header purple">③ 수술 보장</div>
            ${renderGroupItems(surgGroups)}
            <div class="total-bar">
              <span class="total-label">수술 담보 합계</span>
              <span class="total-amount">${formatManwon(toManwon(sumAmounts(surgItems)))}</span>
            </div>
          </div>
        </div>
        <div class="section-divider">암 보장 상세 내역</div>
        ${renderDetailTable(items)}
      </div>
    </div>
  `;
}

// ===== 뇌 보장 렌더링 =====
function renderBrain(coverages) {
  const container = document.getElementById('brainContent');
  const items = getCatCoverages(coverages, '뇌');

  const diagItems = items.filter(c => c.cat.sub === '진단');
  const surgItems = items.filter(c => c.cat.sub === '수술');
  const examItems = items.filter(c => c.cat.sub === '검사');

  const brainFlowData = [
    { stage: '검사', icon: '🔍', desc: '혈관조영술\nCT/MRI', items: examItems },
    { stage: '뇌혈관질환', icon: '🩸', desc: '동맥경화/협착', items: diagItems.filter(c => c.name.includes('뇌혈관질환')) },
    { stage: '뇌경색/뇌졸중', icon: '⚡', desc: '뇌졸중 진단', items: diagItems.filter(c => c.name.includes('뇌졸중') || c.name.includes('뇌경색')) },
    { stage: '뇌출혈', icon: '🔴', desc: '뇌출혈 진단', items: diagItems.filter(c => c.name.includes('뇌출혈')) },
    { stage: '수술/치료', icon: '⚕️', desc: '혈전용해 등', items: surgItems },
  ];

  container.innerHTML = `
    <div class="proposal-page">
      ${makePageHeader('🧠', '뇌 보장 한번에 보여주는 스마트제안서', '뇌혈관질환 단계별 치료보장')}
      <div class="page-body">
        <div style="background:#EEF2FF; border-left:4px solid #3344CC; padding:12px 16px; border-radius:0 8px 8px 0; margin-bottom:16px; font-size:13px; color:#3344CC;">
          💡 심·뇌혈관질환은 반복적인 수술비 보장이 매우 중요합니다. 재발할 수 있기 때문입니다.
        </div>
        <div class="flow-diagram">
          ${brainFlowData.map((f, i) => `
            <div class="flow-stage">
              <div class="flow-stage-title">${f.stage}</div>
              <div style="font-size:28px; margin-bottom:6px;">${f.icon}</div>
              <div class="flow-stage-amount">${f.items.length > 0 ? formatManwon(toManwon(sumAmounts(f.items))) : '-'}</div>
              <div class="flow-stage-desc">${f.desc}</div>
            </div>
            ${i < brainFlowData.length - 1 ? '<div class="flow-arrow">→</div>' : ''}
          `).join('')}
        </div>
        <div class="proposal-grid">
          <div class="proposal-col">
            <div class="col-header">① 진단 보장</div>
            ${makeCoverageList(diagItems)}
            <div class="total-bar">
              <span class="total-label">진단 합계</span>
              <span class="total-amount">${formatManwon(toManwon(sumAmounts(diagItems)))}</span>
            </div>
          </div>
          <div class="proposal-col">
            <div class="col-header blue">② 수술/치료 보장</div>
            ${makeCoverageList(surgItems)}
            <div class="total-bar">
              <span class="total-label">수술/치료 합계</span>
              <span class="total-amount">${formatManwon(toManwon(sumAmounts(surgItems)))}</span>
            </div>
          </div>
          <div class="proposal-col">
            <div class="col-header purple">③ 검사 보장</div>
            ${makeCoverageList(examItems)}
            <div class="total-bar">
              <span class="total-label">검사 담보 수</span>
              <span class="total-amount">${examItems.length}개</span>
            </div>
          </div>
        </div>
        <div class="section-divider">뇌 보장 상세 내역</div>
        ${renderDetailTable(items)}
      </div>
    </div>
  `;
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
      ${makePageHeader('❤️', '심장 보장 한번에 보여주는 스마트제안서', '심장질환 진단·수술·치료 보장')}
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
          <div class="proposal-col">
            <div class="col-header">① 진단 보장</div>
            ${makeCoverageList(diagItems)}
            <div class="total-bar">
              <span class="total-label">진단 합계</span>
              <span class="total-amount">${formatManwon(toManwon(sumAmounts(diagItems)))}</span>
            </div>
          </div>
          <div class="proposal-col">
            <div class="col-header blue">② 수술/치료 보장</div>
            ${makeCoverageList(surgItems)}
            <div class="total-bar">
              <span class="total-label">수술 합계</span>
              <span class="total-amount">${formatManwon(toManwon(sumAmounts(surgItems)))}</span>
            </div>
          </div>
          <div class="proposal-col">
            <div class="col-header purple">③ 심장 보장 요약</div>
            <div style="padding:16px;">
              <div style="text-align:center; margin-bottom:16px;">
                <div style="font-size:48px; margin-bottom:8px;">❤️</div>
                <div style="font-size:13px; color:var(--text-light);">전체 심장 담보</div>
                <div style="font-size:32px; font-weight:800; color:var(--orange);">${formatManwon(toManwon(sumAmounts(items)))}</div>
              </div>
              <div style="font-size:12px; color:var(--text-light); line-height:1.8;">
                • 진단 담보: ${diagItems.length}개<br>
                • 수술/치료 담보: ${surgItems.length}개<br>
                • 월 보험료: ${Math.round(sumPremiums(items)).toLocaleString()}원
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

// ===== 상해 보장 렌더링 =====
function renderInjury(coverages) {
  const container = document.getElementById('injuryContent');
  const items = getCatCoverages(coverages, '상해');

  const deathItems = items.filter(c => c.cat.sub === '사망장해');
  const fracItems = items.filter(c => c.cat.sub === '골절화상');
  const rehabItems = items.filter(c => c.cat.sub === '재활');

  container.innerHTML = `
    <div class="proposal-page">
      ${makePageHeader('🦴', '상해 보장 한번에 보여주는 스마트제안서', '사망·장해·골절·화상 보장')}
      <div class="page-body">
        <div class="proposal-grid">
          <div class="proposal-col">
            <div class="col-header" style="background:var(--orange-pale); color:var(--orange); border-bottom-color:var(--orange);">① 사망·장해 보장</div>
            ${makeCoverageList(deathItems)}
            <div class="total-bar">
              <span class="total-label">합계</span>
              <span class="total-amount">${formatManwon(toManwon(sumAmounts(deathItems)))}</span>
            </div>
          </div>
          <div class="proposal-col">
            <div class="col-header blue">② 골절·화상 보장</div>
            ${makeCoverageList(fracItems)}
            <div class="total-bar">
              <span class="total-label">합계</span>
              <span class="total-amount">${formatManwon(toManwon(sumAmounts(fracItems)))}</span>
            </div>
          </div>
          <div class="proposal-col">
            <div class="col-header purple">③ 재활 보장</div>
            ${makeCoverageList(rehabItems)}
            <div class="total-bar">
              <span class="total-label">담보 수</span>
              <span class="total-amount">${rehabItems.length}개</span>
            </div>
          </div>
        </div>
        <div class="section-divider">상해 보장 상세 내역</div>
        ${renderDetailTable(items)}
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
      ${makePageHeader('🚗', '운전자 보장 한번에 보여주는 스마트제안서', '자동차사고 법률·치료 보장')}
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
      ${makePageHeader('🏥', '입원일당 보장 한번에 보여주는 스마트제안서', '질병 입원 시 하루 보장 내역')}
      <div class="page-body">
        <div class="highlight-box">
          <div>
            <div class="highlight-label">종합병원 입원 시 하루 최대 보장</div>
            <div style="font-size:12px; opacity:0.8; margin-top:2px;">중복 지급 담보 포함 기준</div>
          </div>
          <div class="highlight-amount">${maxDaily}만원/일</div>
        </div>
        <div class="proposal-grid">
          <div class="proposal-col">
            <div class="col-header">① 일반 입원일당</div>
            ${makeCoverageList(diseaseItems)}
            <div class="total-bar">
              <span class="total-label">담보 수</span>
              <span class="total-amount">${diseaseItems.length}개</span>
            </div>
          </div>
          <div class="proposal-col">
            <div class="col-header blue">② 종합/상급병원 일당</div>
            ${makeCoverageList(hospitalItems)}
            <div class="total-bar">
              <span class="total-label">담보 수</span>
              <span class="total-amount">${hospitalItems.length}개</span>
            </div>
          </div>
          <div class="proposal-col">
            <div class="col-header purple">③ 간호간병 & 기타</div>
            ${makeCoverageList([...nursingItems, ...otherItems])}
            <div class="total-bar">
              <span class="total-label">담보 수</span>
              <span class="total-amount">${(nursingItems.length + otherItems.length)}개</span>
            </div>
          </div>
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
      ${makePageHeader('⚕️', '수술 보장 한번에 보여주는 스마트제안서 (남성)', '남성 특화 수술 보장')}
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
          <div class="proposal-col">
            <div class="col-header">① 5대기관·주요수술</div>
            ${makeCoverageList([...mainItems, ...diseaseItems])}
            <div class="total-bar">
              <span class="total-label">합계</span>
              <span class="total-amount">${formatManwon(toManwon(sumAmounts([...mainItems, ...diseaseItems])))}</span>
            </div>
          </div>
          <div class="proposal-col">
            <div class="col-header blue">② 남성 특정 수술</div>
            ${makeCoverageList(maleItems)}
            <div class="total-bar">
              <span class="total-label">합계</span>
              <span class="total-amount">${formatManwon(toManwon(sumAmounts(maleItems)))}</span>
            </div>
          </div>
          <div class="proposal-col">
            <div class="col-header purple">③ 특수·기타 수술</div>
            ${makeCoverageList([...specialItems, ...rehabItems])}
            <div class="total-bar">
              <span class="total-label">담보 수</span>
              <span class="total-amount">${(specialItems.length + rehabItems.length)}개</span>
            </div>
          </div>
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

// ===== 초기화 =====
function clearAll() {
  if (!confirm('모든 데이터를 초기화하시겠습니까?')) return;
  document.getElementById('pasteArea').value = '';
  document.getElementById('resultCard').style.display = 'none';
  document.getElementById('summaryCard').style.display = 'none';
  parsedCoverages = [];
  ['allinone', 'cancer', 'brain', 'heart', 'injury', 'driver', 'daily', 'surgery'].forEach(section => {
    const el = document.getElementById(section + 'Content');
    if (el) el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📊</div><h3>데이터를 먼저 입력해주세요</h3></div>`;
  });
}
