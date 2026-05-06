// 담보명 → 카테고리 매핑 테이블
const COVERAGE_MAP = [
  // ===== 암 (Cancer) =====
  // 진단
  { keywords: ['암진단Ⅱ(유사암제외)', '암진단Ⅱ(일반암)'], cat: '암', sub: '진단', label: '일반암진단', group: '일반암' },
  { keywords: ['암진단Ⅱ(소액암및유사암제외)'], cat: '암', sub: '진단', label: '일반암진단(소액암제외)', group: '일반암' },
  { keywords: ['특정암진단'], cat: '암', sub: '진단', label: '특정암진단', group: '특정암' },
  { keywords: ['고액치료비암진단'], cat: '암', sub: '진단', label: '고액암진단', group: '고액암' },
  { keywords: ['3대암진단'], cat: '암', sub: '진단', label: '3대암진단', group: '특정암' },
  { keywords: ['남성생식기암진단'], cat: '암', sub: '진단', label: '남성생식기암진단', group: '남성암' },
  { keywords: ['폐암진단'], cat: '암', sub: '진단', label: '폐암진단', group: '남성암' },
  { keywords: ['위암진단'], cat: '암', sub: '진단', label: '위암진단', group: '남성암' },
  { keywords: ['대장/소장/항문암진단'], cat: '암', sub: '진단', label: '대장암진단', group: '남성암' },
  { keywords: ['중증갑상선암진단'], cat: '암', sub: '진단', label: '중증갑상선암진단', group: '갑상선암' },
  { keywords: ['양성뇌종양진단'], cat: '암', sub: '진단', label: '양성뇌종양진단', group: '유사암' },
  { keywords: ['유사암진단Ⅱ(양성뇌종양포함)', '유사암진단Ⅱ담보', '유사암진단(양성뇌종양포함)'], cat: '암', sub: '진단', label: '유사암진단(양성뇌종양포함)', group: '유사암' },
  { keywords: ['재진단암진단'], cat: '암', sub: '진단', label: '재진단암진단', group: '재발암' },
  { keywords: ['재진단암진단(기타피부암및갑상선암)'], cat: '암', sub: '진단', label: '재진단암진단(갑상선)', group: '재발암' },
  { keywords: ['이차암진단'], cat: '암', sub: '진단', label: '이차암진단', group: '재발암' },
  { keywords: ['전이암진단(최초1회한)(림프절전이암)'], cat: '암', sub: '진단', label: '전이암진단(림프절)', group: '전이암' },
  { keywords: ['전이암진단(최초1회한)(특정전이암)'], cat: '암', sub: '진단', label: '전이암진단(특정)', group: '전이암' },
  { keywords: ['간/담낭/담도/췌장암진단'], cat: '암', sub: '진단', label: '간/췌장암진단', group: '고액암' },
  // 항암치료
  { keywords: ['암주요치료비(1형)(암치료급여금(기타피부암및갑상선암제외))'], cat: '암', sub: '치료', label: '암치료급여금(1형)', group: '항암치료비' },
  { keywords: ['암주요치료비(1형)(기타피부암및갑상선암치료급여금)'], cat: '암', sub: '치료', label: '갑상선암치료급여금(1형)', group: '항암치료비' },
  { keywords: ['암주요치료비(1형)(암치료비지원금(1천만원이상,종합병원))'], cat: '암', sub: '치료', label: '암치료비지원금(1형,종합)', group: '항암치료비' },
  { keywords: ['암주요치료비(2형)(암치료급여금(기타피부암및갑상선암제외))'], cat: '암', sub: '치료', label: '암치료급여금(2형)', group: '항암치료비' },
  { keywords: ['암주요치료비(2형)(기타피부암및갑상선암치료급여금)'], cat: '암', sub: '치료', label: '갑상선암치료급여금(2형)', group: '항암치료비' },
  { keywords: ['암주요치료비(2형)(암치료비지원금(2천만원이상,종합병원))'], cat: '암', sub: '치료', label: '암치료비지원금(2형,종합)', group: '항암치료비' },
  { keywords: ['항암약물치료'], cat: '암', sub: '치료', label: '항암약물치료', group: '항암약물' },
  { keywords: ['항암방사선약물치료(연간1회한)', '항암방사선약물치료Ⅱ(연간1회한)'], cat: '암', sub: '치료', label: '항암방사선약물치료', group: '항암약물' },
  { keywords: ['항암방사선치료'], cat: '암', sub: '치료', label: '항암방사선치료', group: '방사선치료' },
  { keywords: ['항암방사선(세기조절)치료'], cat: '암', sub: '치료', label: '항암방사선(세기조절)치료', group: '방사선치료' },
  { keywords: ['항암방사선(양성자)치료'], cat: '암', sub: '치료', label: '항암방사선(양성자)치료', group: '방사선치료' },
  { keywords: ['항암방사선약물치료후5대질병진단(2대)'], cat: '암', sub: '치료', label: '항암후2대질병진단', group: '항암후진단' },
  { keywords: ['항암방사선약물치료후5대질병진단(3대)'], cat: '암', sub: '치료', label: '항암후3대질병진단', group: '항암후진단' },
  { keywords: ['항암방사선치료후9대질병진단(4대)'], cat: '암', sub: '치료', label: '항암후4대질병진단', group: '항암후진단' },
  { keywords: ['항암방사선치료후9대질병진단(5대)'], cat: '암', sub: '치료', label: '항암후5대질병진단', group: '항암후진단' },
  // 수술
  { keywords: ['암수술'], cat: '암', sub: '수술', label: '암수술', group: '암수술' },
  { keywords: ['다빈치로봇암수술(갑상선암및전립선암제외)'], cat: '암', sub: '수술', label: '다빈치로봇암수술', group: '로봇수술' },
  { keywords: ['다빈치로봇암수술(갑상선암및전립선암)'], cat: '암', sub: '수술', label: '다빈치로봇암수술(갑상선/전립선)', group: '로봇수술' },
  { keywords: ['특정질환로봇수술(연간1회한)(특정전립선및방광질환)'], cat: '암', sub: '수술', label: '로봇수술(전립선/방광)', group: '로봇수술' },
  { keywords: ['특정질환로봇수술(연간1회한)(특정내분비및소화계질환)'], cat: '암', sub: '수술', label: '로봇수술(내분비/소화계)', group: '로봇수술' },
  { keywords: ['유방암으로인한유방수술'], cat: '암', sub: '수술', label: '유방암수술', group: '암수술' },

  // ===== 뇌 (Brain) =====
  { keywords: ['뇌출혈진단'], cat: '뇌', sub: '진단', label: '뇌출혈진단', group: '뇌출혈' },
  { keywords: ['뇌졸중진단'], cat: '뇌', sub: '진단', label: '뇌졸중진단', group: '뇌졸중' },
  { keywords: ['뇌혈관질환진단'], cat: '뇌', sub: '진단', label: '뇌혈관질환진단', group: '뇌혈관' },
  { keywords: ['뇌혈관질환(Ⅰ)진단'], cat: '뇌', sub: '진단', label: '뇌혈관질환(Ⅰ)진단', group: '뇌혈관' },
  { keywords: ['뇌혈관질환(Ⅱ)진단'], cat: '뇌', sub: '진단', label: '뇌혈관질환(Ⅱ)진단', group: '뇌혈관' },
  { keywords: ['혈전용해치료비Ⅱ(뇌졸중)', '혈전용해치료비Ⅲ(최초1회한)(뇌졸중)'], cat: '뇌', sub: '수술', label: '뇌혈전용해치료', group: '뇌수술' },
  { keywords: ['혈관조영술검사지원비(뇌심장질환'], cat: '뇌', sub: '검사', label: '혈관조영술검사', group: '뇌검사' },
  { keywords: ['양전자방출단층촬영검사지원비'], cat: '뇌', sub: '검사', label: '양전자방출단층촬영(PET)', group: '뇌검사' },
  { keywords: ['CT/MRI/심장초음파', 'MRI검사', 'CT검사'], cat: '뇌', sub: '검사', label: 'CT/MRI검사', group: '뇌검사' },

  // ===== 심 (Heart) =====
  { keywords: ['급성심근경색증진단'], cat: '심', sub: '진단', label: '급성심근경색증진단', group: '심근경색' },
  { keywords: ['허혈심장질환진단'], cat: '심', sub: '진단', label: '허혈심장질환진단', group: '협심증' },
  { keywords: ['심혈관질환(특정2대)진단'], cat: '심', sub: '진단', label: '심혈관질환(특정2대)진단', group: '심혈관' },
  { keywords: ['심혈관질환(I49)진단'], cat: '심', sub: '진단', label: '심혈관질환(I49)진단', group: '부정맥' },
  { keywords: ['심혈관질환(주요심장염증)진단'], cat: '심', sub: '진단', label: '심혈관(주요심장염증)진단', group: '심장염증' },
  { keywords: ['심혈관질환(특정Ⅰ,I49제외)'], cat: '심', sub: '진단', label: '심혈관(특정Ⅰ)진단', group: '심혈관' },
  { keywords: ['심혈관질환(특정Ⅱ)'], cat: '심', sub: '진단', label: '심혈관(특정Ⅱ)진단', group: '심혈관' },
  { keywords: ['심뇌혈관질환수술'], cat: '심', sub: '수술', label: '심뇌혈관수술', group: '심수술' },
  { keywords: ['허혈심장질환수술'], cat: '심', sub: '수술', label: '허혈심장수술', group: '심수술' },
  { keywords: ['혈전용해치료비Ⅱ(특정심장질환)', '혈전용해치료비Ⅲ(최초1회한)(특정심장질환)'], cat: '심', sub: '수술', label: '심장혈전용해치료', group: '심수술' },
  { keywords: ['인공심박동기삽입술'], cat: '심', sub: '수술', label: '인공심박동기삽입', group: '심수술' },
  { keywords: ['이식형제세동기삽입'], cat: '심', sub: '수술', label: '제세동기삽입', group: '심수술' },

  // ===== 상해 (Injury) =====
  { keywords: ['기본계약(상해사망)', '상해사망'], cat: '상해', sub: '사망장해', label: '상해사망', group: '사망' },
  { keywords: ['상해사망추가담보'], cat: '상해', sub: '사망장해', label: '상해사망추가', group: '사망' },
  { keywords: ['상해후유장해(20%이상)'], cat: '상해', sub: '사망장해', label: '후유장해(20%이상)', group: '후유장해' },
  { keywords: ['상해후유장해(50%이상)'], cat: '상해', sub: '사망장해', label: '후유장해(50%이상)', group: '후유장해' },
  { keywords: ['상해후유장해(80%이상)'], cat: '상해', sub: '사망장해', label: '후유장해(80%이상)', group: '후유장해' },
  { keywords: ['골절진단담보', '골절진단'], cat: '상해', sub: '골절화상', label: '골절진단', group: '골절' },
  { keywords: ['골절진단(치아파절제외)'], cat: '상해', sub: '골절화상', label: '골절진단(치아파절제외)', group: '골절' },
  { keywords: ['골절진단Ⅱ(치아파절제외)'], cat: '상해', sub: '골절화상', label: '골절진단Ⅱ', group: '골절' },
  { keywords: ['5대골절진단'], cat: '상해', sub: '골절화상', label: '5대골절진단', group: '골절' },
  { keywords: ['경추/흉추및요추골절진단'], cat: '상해', sub: '골절화상', label: '경추/요추골절진단', group: '골절' },
  { keywords: ['화상진단'], cat: '상해', sub: '골절화상', label: '화상진단', group: '화상' },
  { keywords: ['화상수술'], cat: '상해', sub: '골절화상', label: '화상수술', group: '화상' },
  { keywords: ['화상입원일당'], cat: '상해', sub: '골절화상', label: '화상입원일당', group: '화상' },
  { keywords: ['상해재활치료'], cat: '상해', sub: '재활', label: '상해재활치료', group: '재활' },
  { keywords: ['골절특정재활치료'], cat: '상해', sub: '재활', label: '골절재활치료', group: '재활' },
  { keywords: ['골절철심제거수술'], cat: '상해', sub: '재활', label: '골절철심제거', group: '재활' },
  { keywords: ['골절(치아파절제외)부목치료'], cat: '상해', sub: '재활', label: '골절부목치료', group: '재활' },
  { keywords: ['기본계약(상해후유장해)', '상해후유장해담보'], cat: '상해', sub: '사망장해', label: '상해후유장해(기본)', group: '후유장해' },

  // ===== 운전자 (Driver) =====
  { keywords: ['자동차사고부상치료비', '교통사고부상'], cat: '운전자', sub: '치료', label: '자동차사고부상치료비', group: '교통사고' },
  { keywords: ['자동차사고벌금', '운전자벌금', '교통사고처리지원금'], cat: '운전자', sub: '법률', label: '자동차사고벌금', group: '벌금' },
  { keywords: ['자동차사고변호사선임비용', '변호사선임비용'], cat: '운전자', sub: '법률', label: '변호사선임비용', group: '법률비용' },
  { keywords: ['운전자면허취소', '면허취소위로금', '면허정지위로금'], cat: '운전자', sub: '면허', label: '면허취소/정지위로금', group: '면허' },
  { keywords: ['자동차사고위자료', '자동차사고합의지원금'], cat: '운전자', sub: '법률', label: '자동차사고위자료', group: '위자료' },
  { keywords: ['교통상해사망', '자동차사고사망'], cat: '운전자', sub: '사망', label: '교통상해사망', group: '사망' },

  // ===== 입원일당 (Daily) =====
  { keywords: ['질병입원일당(1-180일)'], cat: '입원일당', sub: '질병', label: '질병입원일당(1-180일)', group: '일반입원' },
  { keywords: ['질병입원일당(1-30일)'], cat: '입원일당', sub: '질병', label: '질병입원일당(1-30일)', group: '일반입원' },
  { keywords: ['질병입원일당(1-10일)'], cat: '입원일당', sub: '질병', label: '질병입원일당(1-10일)', group: '일반입원' },
  { keywords: ['질병입원일당(1-180일,종합병원)'], cat: '입원일당', sub: '종합병원', label: '질병입원일당(종합병원,180일)', group: '종합병원' },
  { keywords: ['질병입원일당(1-10일,종합병원)'], cat: '입원일당', sub: '종합병원', label: '질병입원일당(종합병원,10일)', group: '종합병원' },
  { keywords: ['질병입원일당(1-30일,종합병원,1인실)'], cat: '입원일당', sub: '종합병원', label: '질병입원일당(종합1인실)', group: '종합병원1인실' },
  { keywords: ['질병입원일당(1-30일,상급종합병원,1인실)'], cat: '입원일당', sub: '상급종합', label: '질병입원일당(상급종합1인실)', group: '상급1인실' },
  { keywords: ['심뇌혈관입원일당', '심뇌혈관질환입원'], cat: '입원일당', sub: '심뇌혈관', label: '심뇌혈관입원일당', group: '심뇌혈관' },
  { keywords: ['암직접치료입원'], cat: '입원일당', sub: '암입원', label: '암직접치료입원일당', group: '암입원' },
  { keywords: ['간호간병통합서비스'], cat: '입원일당', sub: '간호간병', label: '간호간병통합서비스', group: '간호간병' },
  { keywords: ['간병인사용일당', '간병인지원'], cat: '입원일당', sub: '간호간병', label: '간병인지원', group: '간호간병' },

  // ===== 수술 (Surgery) =====
  { keywords: ['5대기관질병수술'], cat: '수술', sub: '5대기관', label: '5대기관질병수술', group: '5대기관' },
  { keywords: ['5대장기이식수술'], cat: '수술', sub: '5대기관', label: '5대장기이식수술', group: '5대장기이식' },
  { keywords: ['조혈모세포이식수술'], cat: '수술', sub: '특수', label: '조혈모세포이식수술', group: '장기이식' },
  { keywords: ['각막이식수술'], cat: '수술', sub: '특수', label: '각막이식수술', group: '장기이식' },
  { keywords: ['질병수술담보', '질병수술'], cat: '수술', sub: '질병수술', label: '질병수술(1종)', group: '질병수술' },
  { keywords: ['질병수술Ⅱ(1-5종)'], cat: '수술', sub: '질병수술', label: '질병수술Ⅱ(1-5종)', group: '질병수술' },
  { keywords: ['120대질병수술', '120대(24대)'], cat: '수술', sub: '질병수술', label: '120대질병수술', group: '질병수술' },
  { keywords: ['특정질병수술(남성)'], cat: '수술', sub: '남성수술', label: '특정질병수술(남성)', group: '남성수술' },
  { keywords: ['남성특정비뇨기계질환수술'], cat: '수술', sub: '남성수술', label: '남성비뇨기계질환수술', group: '남성수술' },
  { keywords: ['간질환수술'], cat: '수술', sub: '특수', label: '간질환수술', group: '간담' },
  { keywords: ['당뇨고혈압질환수술'], cat: '수술', sub: '특수', label: '당뇨고혈압질환수술', group: '만성질환' },
  { keywords: ['6대기관양성종양(폴립포함)수술'], cat: '수술', sub: '양성종양', label: '6대기관양성종양수술', group: '양성종양' },
  { keywords: ['위.십이지장대장양성종양(폴립포함)'], cat: '수술', sub: '양성종양', label: '위/대장양성종양수술', group: '양성종양' },
  { keywords: ['시각질환(백내장,녹내장)수술'], cat: '수술', sub: '특수', label: '백내장/녹내장수술', group: '안과' },
  { keywords: ['충수염수술'], cat: '수술', sub: '특수', label: '충수염수술', group: '복부' },
  { keywords: ['탈장수술'], cat: '수술', sub: '특수', label: '탈장수술', group: '복부' },
  { keywords: ['전신마취수술(4시간이상)'], cat: '수술', sub: '전신마취', label: '전신마취수술(4시간이상)', group: '전신마취' },
  { keywords: ['전신마취수술(6시간이상)'], cat: '수술', sub: '전신마취', label: '전신마취수술(6시간이상)', group: '전신마취' },
  { keywords: ['질병재활치료'], cat: '수술', sub: '재활', label: '질병재활치료', group: '재활' },
  { keywords: ['심뇌혈관질환특정재활치료'], cat: '수술', sub: '재활', label: '심뇌혈관특정재활치료', group: '재활' },

  // ===== 납입면제 =====
  { keywords: ['보험료납입면제대상담보', '보험료납입지원', '납입면제'], cat: '납입면제', sub: '면제', label: '납입면제', group: '납입면제' },
];

// 담보명으로 카테고리 찾기
function findCategory(coverageName) {
  if (!coverageName) return null;
  const name = coverageName.trim();
  for (const entry of COVERAGE_MAP) {
    for (const kw of entry.keywords) {
      if (name.includes(kw) || name === kw) {
        return { ...entry, matched: kw };
      }
    }
  }
  return null;
}

// 금액을 만원 단위로 변환
function toManwon(amount) {
  const n = parseInt(amount) || 0;
  return Math.round(n / 10000);
}

// 만원 단위 → 표시 문자열
function formatManwon(manwon) {
  if (manwon === 0) return '-';
  if (manwon >= 10000) return `${(manwon/10000).toFixed(manwon % 10000 === 0 ? 0 : 1)}억`;
  return `${manwon}만`;
}
