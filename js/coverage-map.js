// 담보명 → 카테고리 매핑 테이블 (v0.02)
const COVERAGE_MAP = [
  // ===== 암 (Cancer) =====
  { kw: '기본계약(암진단', cat: '암', sub: '진단', label: '암진단(기본)', group: '일반암' },
  { kw: '암진단Ⅱ(유사암제외)', cat: '암', sub: '진단', label: '일반암진단', group: '일반암' },
  { kw: '암진단Ⅱ(소액암및유사암제외)', cat: '암', sub: '진단', label: '일반암진단(소액암제외)', group: '일반암' },
  { kw: '암진단Ⅱ(일반암)', cat: '암', sub: '진단', label: '일반암진단', group: '일반암' },
  { kw: '암진단Ⅱ(소액암)', cat: '암', sub: '진단', label: '소액암진단', group: '유사암' },
  { kw: '특정암진단', cat: '암', sub: '진단', label: '특정암진단', group: '특정암' },
  { kw: '3대암진단', cat: '암', sub: '진단', label: '3대암진단', group: '특정암' },
  { kw: '고액치료비암진단', cat: '암', sub: '진단', label: '고액암진단', group: '고액암' },
  { kw: '남성생식기암진단', cat: '암', sub: '진단', label: '남성생식기암', group: '남성암' },
  { kw: '여성특정암진단', cat: '암', sub: '진단', label: '여성특정암진단', group: '여성암' },
  { kw: '폐암진단', cat: '암', sub: '진단', label: '폐암진단', group: '부위암' },
  { kw: '위암진단', cat: '암', sub: '진단', label: '위암진단', group: '부위암' },
  { kw: '대장/소장/항문암진단', cat: '암', sub: '진단', label: '대장암진단', group: '부위암' },
  { kw: '간/담낭/담도/췌장암진단', cat: '암', sub: '진단', label: '간/췌장암진단', group: '고액암' },
  { kw: '비뇨기관(신장/방광/요관)암진단', cat: '암', sub: '진단', label: '비뇨기암진단', group: '부위암' },
  { kw: '중증갑상선암진단', cat: '암', sub: '진단', label: '중증갑상선암진단', group: '갑상선암' },
  { kw: '양성뇌종양진단', cat: '암', sub: '진단', label: '양성뇌종양진단', group: '유사암' },
  { kw: '유사암진단', cat: '암', sub: '진단', label: '유사암진단', group: '유사암' },
  { kw: '재진단암진단', cat: '암', sub: '진단', label: '재진단암진단', group: '재발암' },
  { kw: '이차암진단', cat: '암', sub: '진단', label: '이차암진단', group: '재발암' },
  { kw: '전이암진단', cat: '암', sub: '진단', label: '전이암진단', group: '전이암' },
  { kw: '소아백혈병진단', cat: '암', sub: '진단', label: '소아백혈병진단', group: '부위암' },
  { kw: '다발성소아암진단', cat: '암', sub: '진단', label: '다발성소아암진단', group: '부위암' },
  // 암 항암치료
  { kw: '암주요치료비', cat: '암', sub: '치료', label: '암주요치료비', group: '항암치료비' },
  { kw: '암치료급여금', cat: '암', sub: '치료', label: '암치료급여금', group: '항암치료비' },
  { kw: '암치료비지원금', cat: '암', sub: '치료', label: '암치료비지원금', group: '항암치료비' },
  { kw: '항암약물치료', cat: '암', sub: '치료', label: '항암약물치료', group: '항암약물' },
  { kw: '항암방사선약물치료', cat: '암', sub: '치료', label: '항암방사선약물치료', group: '항암약물' },
  { kw: '항암방사선(중입자)치료', cat: '암', sub: '치료', label: '항암방사선(중입자)치료', group: '방사선치료' },
  { kw: '항암방사선(세기조절)치료', cat: '암', sub: '치료', label: '항암방사선(세기조절)치료', group: '방사선치료' },
  { kw: '항암방사선(양성자)치료', cat: '암', sub: '치료', label: '항암방사선(양성자)치료', group: '방사선치료' },
  { kw: '항암방사선치료', cat: '암', sub: '치료', label: '항암방사선치료', group: '방사선치료' },
  { kw: '항암호르몬약물허가치료', cat: '암', sub: '치료', label: '항암호르몬약물치료', group: '항암약물' },
  { kw: '표적항암약물허가치료', cat: '암', sub: '치료', label: '표적항암약물치료', group: '표적항암' },
  { kw: '카티(CAR-T)항암약물허가치료', cat: '암', sub: '치료', label: '카티(CAR-T)항암약물치료', group: '표적항암' },
  { kw: '항암방사선약물치료후5대질병진단', cat: '암', sub: '치료', label: '항암후5대질병진단', group: '항암후진단' },
  { kw: '항암방사선치료후9대질병진단', cat: '암', sub: '치료', label: '항암후9대질병진단', group: '항암후진단' },
  { kw: '뇌정위적방사선수술', cat: '암', sub: '치료', label: '뇌정위적방사선수술', group: '방사선치료' },
  // 암 수술
  { kw: '암수술', cat: '암', sub: '수술', label: '암수술', group: '암수술' },
  { kw: '다빈치로봇암수술', cat: '암', sub: '수술', label: '다빈치로봇암수술', group: '로봇수술' },
  { kw: '특정질환로봇수술', cat: '암', sub: '수술', label: '특정질환로봇수술', group: '로봇수술' },
  { kw: '유방암으로인한유방수술', cat: '암', sub: '수술', label: '유방암수술', group: '여성수술' },
  // 암 입원
  { kw: '암직접치료입원일당', cat: '암', sub: '입원', label: '암직접치료입원일당', group: '암입원' },
  { kw: '암통원', cat: '암', sub: '입원', label: '암통원', group: '암통원' },
  // 암 검사
  { kw: '생검조직병리검사', cat: '암', sub: '검사', label: '생검조직병리검사', group: '암검사' },
  { kw: '암/질병MRI', cat: '암', sub: '검사', label: '암/질병MRI촬영', group: '암검사' },
  { kw: 'NGS유전자패널검사', cat: '암', sub: '검사', label: 'NGS유전자패널검사', group: '암검사' },
  { kw: '희귀질환자산정특례', cat: '암', sub: '검사', label: '산정특례(희귀질환)', group: '산정특례' },

  // ===== 뇌 (Brain) =====
  { kw: '뇌출혈진단', cat: '뇌', sub: '진단', label: '뇌출혈진단', group: '뇌출혈' },
  { kw: '뇌졸중진단', cat: '뇌', sub: '진단', label: '뇌졸중진단', group: '뇌졸중' },
  { kw: '뇌혈관질환(Ⅰ)진단', cat: '뇌', sub: '진단', label: '뇌혈관질환(Ⅰ)진단', group: '뇌혈관' },
  { kw: '뇌혈관질환(Ⅱ)진단', cat: '뇌', sub: '진단', label: '뇌혈관질환(Ⅱ)진단', group: '뇌혈관' },
  { kw: '뇌혈관질환진단', cat: '뇌', sub: '진단', label: '뇌혈관질환진단', group: '뇌혈관' },
  { kw: '혈전용해치료비', cat: '뇌', sub: '수술', label: '혈전용해치료비', group: '뇌수술' },
  { kw: '혈관조영술검사지원비', cat: '뇌', sub: '검사', label: '혈관조영술검사', group: '뇌검사' },
  { kw: '양전자방출단층촬영검사지원비', cat: '뇌', sub: '검사', label: 'PET검사', group: '뇌검사' },
  { kw: 'CT/MRI', cat: '뇌', sub: '검사', label: 'CT/MRI검사', group: '뇌검사' },
  { kw: '뇌파/뇌척수액검사', cat: '뇌', sub: '검사', label: '뇌파/뇌척수액검사', group: '뇌검사' },
  { kw: '특정외상성뇌손상진단', cat: '뇌', sub: '진단', label: '외상성뇌손상진단', group: '뇌외상' },
  { kw: '특정외상성뇌출혈진단', cat: '뇌', sub: '진단', label: '외상성뇌출혈진단', group: '뇌외상' },

  // ===== 심 (Heart) =====
  { kw: '급성심근경색증진단', cat: '심', sub: '진단', label: '급성심근경색증진단', group: '심근경색' },
  { kw: '허혈심장질환진단', cat: '심', sub: '진단', label: '허혈심장질환진단', group: '협심증' },
  { kw: '심혈관질환(특정2대)진단', cat: '심', sub: '진단', label: '심혈관(특정2대)진단', group: '심혈관' },
  { kw: '심혈관질환(I49)진단', cat: '심', sub: '진단', label: '심혈관(I49)진단', group: '부정맥' },
  { kw: '심혈관질환(주요심장염증)진단', cat: '심', sub: '진단', label: '심장염증진단', group: '심장염증' },
  { kw: '심혈관질환(특정Ⅰ,I49제외)', cat: '심', sub: '진단', label: '심혈관(특정Ⅰ)진단', group: '심혈관' },
  { kw: '심혈관질환(특정Ⅱ)', cat: '심', sub: '진단', label: '심혈관(특정Ⅱ)진단', group: '심혈관' },
  { kw: '심뇌혈관질환수술', cat: '심', sub: '수술', label: '심뇌혈관수술', group: '심수술' },
  { kw: '심뇌혈관질환주요치료비', cat: '심', sub: '수술', label: '심뇌혈관주요치료비', group: '심수술' },
  { kw: '허혈심장질환수술', cat: '심', sub: '수술', label: '허혈심장수술', group: '심수술' },
  { kw: '인공심박동기삽입술', cat: '심', sub: '수술', label: '인공심박동기삽입', group: '심수술' },
  { kw: '이식형제세동기삽입', cat: '심', sub: '수술', label: '제세동기삽입', group: '심수술' },
  { kw: '항응고제(경구약물,급여)', cat: '심', sub: '수술', label: '항응고제치료', group: '심수술' },
  { kw: '심장(산정특례)', cat: '심', sub: '진단', label: '심장산정특례', group: '산정특례' },

  // ===== 상해 (Injury) =====
  { kw: '기본계약(상해사망)', cat: '상해', sub: '사망장해', label: '상해사망(기본)', group: '사망' },
  { kw: '상해사망추가', cat: '상해', sub: '사망장해', label: '상해사망(추가)', group: '사망' },
  { kw: '상해사망', cat: '상해', sub: '사망장해', label: '상해사망', group: '사망' },
  { kw: '기본계약(상해후유장해)', cat: '상해', sub: '사망장해', label: '상해후유장해(기본)', group: '후유장해' },
  { kw: '상해후유장해(20%이상)', cat: '상해', sub: '사망장해', label: '후유장해(20%이상)', group: '후유장해' },
  { kw: '상해후유장해(50%이상)', cat: '상해', sub: '사망장해', label: '후유장해(50%이상)', group: '후유장해' },
  { kw: '상해후유장해(80%이상)', cat: '상해', sub: '사망장해', label: '후유장해(80%이상)', group: '후유장해' },
  { kw: '상해후유장해(50%이상)(월지급형)', cat: '상해', sub: '사망장해', label: '후유장해(50%월지급)', group: '후유장해' },
  { kw: '상해후유장해(80%이상)(월지급형)', cat: '상해', sub: '사망장해', label: '후유장해(80%월지급)', group: '후유장해' },
  { kw: '골절진단Ⅱ', cat: '상해', sub: '골절', label: '골절진단Ⅱ', group: '골절' },
  { kw: '골절진단(치아파절제외)', cat: '상해', sub: '골절', label: '골절진단(치아제외)', group: '골절' },
  { kw: '골절진단', cat: '상해', sub: '골절', label: '골절진단', group: '골절' },
  { kw: '5대골절진단', cat: '상해', sub: '골절', label: '5대골절진단', group: '골절' },
  { kw: '경추/흉추및요추골절진단', cat: '상해', sub: '골절', label: '경추/요추골절진단', group: '골절' },
  { kw: '골절수술', cat: '상해', sub: '골절', label: '골절수술', group: '골절수술' },
  { kw: '5대골절수술', cat: '상해', sub: '골절', label: '5대골절수술', group: '골절수술' },
  { kw: '6대인공관절', cat: '상해', sub: '골절', label: '인공관절수술', group: '골절수술' },
  { kw: '골절탈구도수정복술', cat: '상해', sub: '골절', label: '골절탈구도수정복술', group: '골절수술' },
  { kw: '골절철심제거수술', cat: '상해', sub: '골절', label: '골절철심제거', group: '재활' },
  { kw: '골절(치아파절제외)부목치료', cat: '상해', sub: '재활', label: '골절부목치료', group: '재활' },
  { kw: '깁스치료', cat: '상해', sub: '재활', label: '깁스치료', group: '재활' },
  { kw: '화상진단', cat: '상해', sub: '화상', label: '화상진단', group: '화상' },
  { kw: '중증화상/부식진단', cat: '상해', sub: '화상', label: '중증화상/부식진단', group: '화상' },
  { kw: '화상수술', cat: '상해', sub: '화상', label: '화상수술', group: '화상' },
  { kw: '화상입원일당', cat: '상해', sub: '화상', label: '화상입원일당', group: '화상' },
  { kw: '상해수술', cat: '상해', sub: '수술', label: '상해수술', group: '상해수술' },
  { kw: '창상봉합술', cat: '상해', sub: '수술', label: '창상봉합술', group: '상해수술' },
  { kw: '심한상해수술', cat: '상해', sub: '수술', label: '심한상해수술', group: '상해수술' },
  { kw: '상해흉터성형수술', cat: '상해', sub: '수술', label: '상해흉터성형수술', group: '상해수술' },
  { kw: '안면부상해흉터성형', cat: '상해', sub: '수술', label: '안면부상해흉터성형', group: '상해수술' },
  { kw: '중대한특정상해', cat: '상해', sub: '수술', label: '중대한특정상해수술', group: '상해수술' },
  { kw: '자동차사고성형수술', cat: '상해', sub: '수술', label: '자동차사고성형수술', group: '상해수술' },
  { kw: '추간판장애수술', cat: '상해', sub: '수술', label: '추간판장애수술', group: '상해수술' },
  { kw: '추간판장애신경차단술', cat: '상해', sub: '수술', label: '추간판장애신경차단술', group: '상해수술' },
  { kw: '무릎인대파열/연골손상', cat: '상해', sub: '수술', label: '무릎인대/연골손상수술', group: '상해수술' },
  { kw: '아킬레스힘줄손상', cat: '상해', sub: '수술', label: '아킬레스힘줄손상수술', group: '상해수술' },
  { kw: '주요관절손상수술치료', cat: '상해', sub: '수술', label: '주요관절손상수술', group: '상해수술' },
  { kw: '특정외상성장기손상진단', cat: '상해', sub: '진단', label: '외상성장기손상진단', group: '외상' },
  { kw: '상해재활치료', cat: '상해', sub: '재활', label: '상해재활치료', group: '재활' },
  { kw: '골절특정재활치료', cat: '상해', sub: '재활', label: '골절재활치료', group: '재활' },
  { kw: '상해입원일당', cat: '상해', sub: '입원', label: '상해입원일당', group: '상해입원' },

  // ===== 운전자 (Driver) =====
  { kw: '교통상해사망', cat: '운전자', sub: '사망', label: '교통상해사망', group: '사망' },
  { kw: '자동차사고사망', cat: '운전자', sub: '사망', label: '자동차사고사망', group: '사망' },
  { kw: '자동차사고부상치료비', cat: '운전자', sub: '치료', label: '자동차사고부상치료비', group: '부상치료' },
  { kw: '교통사고처리지원금', cat: '운전자', sub: '법률', label: '교통사고처리지원금', group: '법률' },
  { kw: '자동차사고벌금', cat: '운전자', sub: '법률', label: '자동차사고벌금', group: '법률' },
  { kw: '자동차사고변호사선임비용', cat: '운전자', sub: '법률', label: '변호사선임비용', group: '법률' },
  { kw: '운전자면허취소위로금', cat: '운전자', sub: '면허', label: '면허취소위로금', group: '면허' },
  { kw: '운전자면허정지위로금', cat: '운전자', sub: '면허', label: '면허정지위로금', group: '면허' },
  { kw: '자동차사고위자료', cat: '운전자', sub: '법률', label: '자동차사고위자료', group: '위자료' },
  { kw: '자동차사고합의지원금', cat: '운전자', sub: '법률', label: '자동차사고합의지원금', group: '위자료' },
  { kw: '자동차사고상해진단', cat: '운전자', sub: '진단', label: '자동차사고상해진단', group: '진단' },

  // ===== 입원일당 (Daily) =====
  { kw: '질병입원일당(1-180일,종합병원)', cat: '입원일당', sub: '종합병원', label: '질병입원일당(종합,180일)', group: '종합병원' },
  { kw: '질병입원일당(1-30일,종합병원,1인실)', cat: '입원일당', sub: '종합병원', label: '질병입원일당(종합1인실)', group: '종합1인실' },
  { kw: '질병입원일당(1-30일,상급종합병원,1인실)', cat: '입원일당', sub: '상급종합', label: '질병입원일당(상급1인실)', group: '상급1인실' },
  { kw: '질병입원일당(1-10일,종합병원)', cat: '입원일당', sub: '종합병원', label: '질병입원일당(종합,10일)', group: '종합병원' },
  { kw: '질병입원일당(1-180일)', cat: '입원일당', sub: '질병', label: '질병입원일당(180일)', group: '일반입원' },
  { kw: '질병입원일당(1-30일)', cat: '입원일당', sub: '질병', label: '질병입원일당(30일)', group: '일반입원' },
  { kw: '질병입원일당(1-10일)', cat: '입원일당', sub: '질병', label: '질병입원일당(10일)', group: '일반입원' },
  { kw: '심뇌혈관입원일당', cat: '입원일당', sub: '심뇌혈관', label: '심뇌혈관입원일당', group: '심뇌혈관' },
  { kw: '심뇌혈관수술입원일당', cat: '입원일당', sub: '심뇌혈관', label: '심뇌혈관수술입원일당', group: '심뇌혈관' },
  { kw: '간병인사용질병입원일당', cat: '입원일당', sub: '간병인', label: '간병인사용입원일당', group: '간병인' },
  { kw: '간병인사용입원일당', cat: '입원일당', sub: '간병인', label: '간병인사용입원일당', group: '간병인' },
  { kw: '간호간병통합서비스', cat: '입원일당', sub: '간호간병', label: '간호간병통합서비스', group: '간호간병' },
  { kw: '질병수술입원일당', cat: '입원일당', sub: '질병', label: '질병수술입원일당', group: '수술입원' },

  // ===== 수술 (Surgery) =====
  { kw: '5대기관질병수술', cat: '수술', sub: '5대기관', label: '5대기관질병수술', group: '5대기관' },
  { kw: '5대장기이식수술', cat: '수술', sub: '5대기관', label: '5대장기이식수술', group: '5대장기이식' },
  { kw: '조혈모세포이식수술', cat: '수술', sub: '특수', label: '조혈모세포이식수술', group: '장기이식' },
  { kw: '각막이식수술', cat: '수술', sub: '특수', label: '각막이식수술', group: '안과' },
  { kw: '질병수술Ⅱ(1-5종)', cat: '수술', sub: '질병수술', label: '질병수술Ⅱ(1-5종)', group: '질병수술' },
  { kw: '120대질병수술', cat: '수술', sub: '질병수술', label: '120대질병수술', group: '질병수술' },
  { kw: '질병수술담보', cat: '수술', sub: '질병수술', label: '질병수술(1종)', group: '질병수술' },
  { kw: '질병수술', cat: '수술', sub: '질병수술', label: '질병수술', group: '질병수술' },
  { kw: '특정질병수술(남성)', cat: '수술', sub: '남성수술', label: '특정질병수술(남성)', group: '남성수술' },
  { kw: '남성특정비뇨기계질환수술', cat: '수술', sub: '남성수술', label: '남성비뇨기계수술', group: '남성수술' },
  { kw: '간질환수술', cat: '수술', sub: '특수', label: '간질환수술', group: '복부' },
  { kw: '당뇨고혈압질환수술', cat: '수술', sub: '특수', label: '당뇨고혈압질환수술', group: '만성질환' },
  { kw: '6대기관양성종양(폴립포함)수술', cat: '수술', sub: '양성종양', label: '6대기관양성종양수술', group: '양성종양' },
  { kw: '위.십이지장대장양성종양', cat: '수술', sub: '양성종양', label: '위/대장양성종양수술', group: '양성종양' },
  { kw: '시각질환(백내장,녹내장)수술', cat: '수술', sub: '특수', label: '백내장/녹내장수술', group: '안과' },
  { kw: '충수염수술', cat: '수술', sub: '특수', label: '충수염수술', group: '복부' },
  { kw: '탈장수술', cat: '수술', sub: '특수', label: '탈장수술', group: '복부' },
  { kw: '전신마취수술(4시간이상)', cat: '수술', sub: '전신마취', label: '전신마취수술(4시간↑)', group: '전신마취' },
  { kw: '전신마취수술(6시간이상)', cat: '수술', sub: '전신마취', label: '전신마취수술(6시간↑)', group: '전신마취' },
  { kw: '질병재활치료', cat: '수술', sub: '재활', label: '질병재활치료', group: '재활' },
  { kw: '심뇌혈관질환특정재활치료', cat: '수술', sub: '재활', label: '심뇌혈관특정재활치료', group: '재활' },

  // ===== 납입면제 =====
  { kw: '보험료납입면제대상담보', cat: '납입면제', sub: '면제', label: '납입면제', group: '납입면제' },
  { kw: '보험료납입지원', cat: '납입면제', sub: '면제', label: '납입지원', group: '납입면제' },
  { kw: '납입면제후보장강화', cat: '납입면제', sub: '면제', label: '납입면제후보장강화', group: '납입면제' },

  // ===== 치매 =====
  { kw: '치매주요치료비', cat: '치매', sub: '치료', label: '치매주요치료비', group: '치매' },
  { kw: '치매진단', cat: '치매', sub: '진단', label: '치매진단', group: '치매' },
];

// ──────────────────────────────────────────
// 담보명으로 카테고리 찾기 (v0.02 - 강화된 매칭)
// ──────────────────────────────────────────
function findCategory(coverageName) {
  if (!coverageName) return null;
  const name = coverageName.trim();

  // 1차: 직접 매칭
  for (const entry of COVERAGE_MAP) {
    if (name.includes(entry.kw)) {
      return { cat: entry.cat, sub: entry.sub, label: entry.label, group: entry.group, matched: entry.kw };
    }
  }

  // 2차: 접미사 제거 후 재시도
  // "(간편건강고지)", "(갱신형)", "담보", "(간편건강고지Ⅴ)" 등 제거
  const stripped = name
    .replace(/\(간편건강고지[Ⅰ-Ⅹ]?\)/g, '')
    .replace(/\(갱신형\)/g, '')
    .replace(/\(최초1회한\)/g, '')
    .replace(/\(연간1회한\)/g, '')
    .replace(/담보$/g, '')
    .replace(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (stripped !== name) {
    for (const entry of COVERAGE_MAP) {
      if (stripped.includes(entry.kw)) {
        return { cat: entry.cat, sub: entry.sub, label: entry.label, group: entry.group, matched: entry.kw + '*' };
      }
    }
  }

  return null;
}

// 금액을 만원 단위로 변환
function toManwon(amount) {
  const n = parseInt(String(amount).replace(/[^0-9]/g, '')) || 0;
  return Math.round(n / 10000);
}

// 만원 단위 → 표시 문자열
function formatManwon(manwon) {
  if (manwon === 0) return '-';
  if (manwon >= 10000) {
    const uk = manwon / 10000;
    return uk % 1 === 0 ? `${uk}억` : `${uk.toFixed(1)}억`;
  }
  return `${manwon}만`;
}
