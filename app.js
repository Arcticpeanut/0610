/**
 * ==========================================
 * AETHER ART HALL - CORE RESERVATION ENGINE
 * ==========================================
 * 
 * [교육용 안내]
 * 이 스크립트는 싱글 페이지 애플리케이션(SPA) 형태로 동작하는 연극 예매 시스템의 핵심 로직입니다.
 * 외부 데이터베이스(Supabase)가 정상 설정된 경우 DB와 연동하며, 설정되지 않았거나 연동에 실패할 시
 * 기존의 브라우저 'localStorage'를 활용하는 폴백(Fallback) 모드로 안전하게 작동합니다.
 */

import { supabase, isSupabaseConfigured, mockPerformances } from './shared.js';

// 1. 애플리케이션 상태 (Global State)
const state = {
    performances: [],            // 연극 공연 목록 데이터
    selectedPerformance: null,   // 선택된 연극 공연 객체
    selectedDate: '',            // 선택된 날짜 (YYYY-MM-DD 형식)
    selectedTime: '',            // 선택된 시간 (HH:MM 형식)
    selectedSeats: [],           // 현재 사용자가 클릭하여 선택한 좌석 번호 목록 (예: ['C-5', 'D-6'])
    bookedTickets: []            // 현재 선택된 공연/날짜에 해당하는 예매 내역 캐시
};

// 2. 대학로 대표 연극 모의 데이터 (Mock Data) - shared.js로부터 임포트하여 사용합니다.

// 3. DOM 요소 셀렉터
const DOM = {
    movieGrid: document.getElementById('movie-grid'),
    scheduleSection: document.getElementById('schedule-section'),
    dateTrack: document.getElementById('date-track'),
    timeGrid: document.getElementById('time-grid'),
    seatSection: document.getElementById('seat-section'),
    seatLayout: document.getElementById('seat-layout'),
    
    // 요약 패널
    summaryMovieTitle: document.getElementById('summary-movie-title'),
    summaryDateTime: document.getElementById('summary-date-time'),
    summarySeats: document.getElementById('summary-seats'),
    priceRegularQty: document.getElementById('price-regular-qty'),
    priceVipQty: document.getElementById('price-vip-qty'),
    totalQty: document.getElementById('total-qty'),
    btnCheckout: document.getElementById('btn-checkout'),

    // 네비게이션
    btnBookingNav: document.getElementById('btn-booking-nav'),
    logo: document.getElementById('logo')
};

// 4. 초기화 함수
function init() {
    state.performances = mockPerformances;
    
    // 4-1. 연극 목록 카드 렌더링
    renderPerformances();
    
    // 4-2. 이벤트 리스너 설정
    setupEventListeners();
    
    // 4-3. Lucide 아이콘 초기화 (CDN 로드 후 아이콘 태그 교체)
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// 5. 연극 목록 렌더링 엔진
function renderPerformances() {
    DOM.movieGrid.innerHTML = '';
    
    state.performances.forEach(play => {
        const playCard = document.createElement('div');
        playCard.className = 'movie-card';
        playCard.dataset.id = play.id;
        
        // 포스터 이미지 대신 프리미엄 다크 네온 그래디언트 백그라운드를 활용해 미학적 퀄리티를 유지
        playCard.innerHTML = `
            <div class="movie-poster-wrapper" style="background: ${play.gradient}; display: flex; align-items: center; justify-content: center;">
                <span class="movie-badge-vip">PREMIUM ART</span>
                <!-- 연극 무대 마스크 모양의 심볼릭 아트워크를 SVG로 인라인 생성 -->
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: rgba(255,255,255,0.7); filter: drop-shadow(0 0 10px rgba(255,255,255,0.3));">
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    <path d="M2 12h20"></path>
                </svg>
            </div>
            <div class="movie-info">
                <h3 class="movie-title">${play.title}</h3>
                <div class="movie-meta">
                    <span class="movie-rating">
                        <i data-lucide="star" style="width: 14px; height: 14px; fill: currentColor;"></i> ${play.rating}
                    </span>
                    <span>•</span>
                    <span>${play.genre}</span>
                    <span>•</span>
                    <span>${play.runtime}분</span>
                </div>
                <p class="movie-desc">${play.desc}</p>
            </div>
        `;
        
        // 카드 클릭 시 이벤트
        playCard.addEventListener('click', () => selectPerformance(play));
        DOM.movieGrid.appendChild(playCard);
    });
    
    if (window.lucide) window.lucide.createIcons();
}

// 6. 연극 선택 시 처리
function selectPerformance(play) {
    state.selectedPerformance = play;
    
    // UI 변경: 선택된 카드 하이라이트 처리
    document.querySelectorAll('.movie-card').forEach(card => {
        if (card.dataset.id === play.id) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    // 상태 초기화
    state.selectedDate = '';
    state.selectedTime = '';
    state.selectedSeats = [];
    
    // 다음 섹션 표시 및 초기 렌더링
    DOM.scheduleSection.classList.remove('hidden');
    DOM.seatSection.classList.add('hidden'); // 좌석 선택은 시간 선택 후에 활성화
    
    // 상영 시간 리스트 및 날짜 렌더링
    renderDates();
    DOM.timeGrid.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; grid-column: 1/-1; text-align: center; padding: 20px;">관람을 원하시는 날짜를 먼저 선택해 주세요.</div>';

    // 해당 스크롤 섹션으로 부드러운 스크롤 이동
    DOM.scheduleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    updateSummary();
}

// 7. 일정 날짜 렌더링 (오늘 기준 7일 자동 생성)
function renderDates() {
    DOM.dateTrack.innerHTML = '';
    
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date();
        currentDate.setDate(today.getDate() + i);
        
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dateVal = String(currentDate.getDate()).padStart(2, '0');
        const fullDateStr = `${year}-${month}-${dateVal}`;
        
        const dayName = weekDays[currentDate.getDay()];
        const isToday = i === 0;
        
        const dateCard = document.createElement('div');
        dateCard.className = `date-card ${state.selectedDate === fullDateStr ? 'selected' : ''}`;
        dateCard.innerHTML = `
            <span class="date-day-name">${isToday ? '오늘' : dayName + '요일'}</span>
            <span class="date-day-num">${dateVal}</span>
        `;
        
        dateCard.addEventListener('click', async () => {
            state.selectedDate = fullDateStr;
            
            // 데이터 비동기 조회 및 간단한 로딩 연출
            DOM.dateTrack.style.opacity = '0.5';
            await fetchBookedTickets(state.selectedPerformance.id, state.selectedDate);
            DOM.dateTrack.style.opacity = '1';
            
            // UI 업데이트
            document.querySelectorAll('.date-card').forEach(c => c.classList.remove('selected'));
            dateCard.classList.add('selected');
            
            // 시간대 렌더링 활성화
            renderTimes();
            state.selectedTime = '';
            state.selectedSeats = [];
            DOM.seatSection.classList.add('hidden');
            updateSummary();
        });
        
        DOM.dateTrack.appendChild(dateCard);
    }
}

// 8. 시간(회차) 선택 옵션 렌더링
function renderTimes() {
    DOM.timeGrid.innerHTML = '';
    
    // 연극 상영 시간표
    const times = [
        { time: '11:00', type: '1회차' },
        { time: '14:00', type: '2회차' },
        { time: '17:00', type: '3회차' },
        { time: '20:00', type: '4회차' }
    ];
    
    times.forEach(t => {
        // 이미 예약 완료된 좌석 개수를 체크하여 잔여 좌석 표기 (총 80석 기준)
        const bookedSeatsCount = getBookedSeatsForShow(state.selectedPerformance.id, state.selectedDate, t.time).length;
        const seatsLeft = 80 - bookedSeatsCount;
        
        const timeCard = document.createElement('div');
        timeCard.className = `time-card ${state.selectedTime === t.time ? 'selected' : ''}`;
        timeCard.innerHTML = `
            <span class="time-val">${t.time}</span>
            <span class="time-seats-left">${seatsLeft}석 남음 / 80석</span>
        `;
        
        timeCard.addEventListener('click', () => {
            state.selectedTime = t.time;
            
            // UI 업데이트
            document.querySelectorAll('.time-card').forEach(c => c.classList.remove('selected'));
            timeCard.classList.add('selected');
            
            // 좌석 맵 보이기
            DOM.seatSection.classList.remove('hidden');
            state.selectedSeats = [];
            
            // 좌석 배치도 빌드
            renderSeatLayout();
            
            DOM.seatSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            updateSummary();
        });
        
        DOM.timeGrid.appendChild(timeCard);
    });
}

// 9. 인터랙티브 좌석 배치도 생성 엔진 (8행 10열)
function renderSeatLayout() {
    DOM.seatLayout.innerHTML = '';
    
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = 10;
    
    // 현재 상영 회차에 이미 예매 완료(Occupied)된 좌석들을 가져옵니다
    const occupiedSeats = getBookedSeatsForShow(
        state.selectedPerformance.id,
        state.selectedDate,
        state.selectedTime
    );
    
    rows.forEach(row => {
        for (let col = 1; col <= cols; col++) {
            const seatId = `${row}-${col}`;
            const seatBox = document.createElement('div');
            
            // 좌석 등급 판별 (연극 메타데이터에 기재된 VIP 행에 맞춰 세팅)
            const isVip = state.selectedPerformance.vipRows.includes(row);
            const isOccupied = occupiedSeats.includes(seatId);
            const isSelected = state.selectedSeats.includes(seatId);
            
            // 클래스 네이밍 설정
            let seatClass = 'seat-box';
            if (isOccupied) {
                seatClass += ' seat-occupied';
            } else if (isSelected) {
                seatClass += ' seat-selected';
            } else if (isVip) {
                seatClass += ' seat-vip';
            } else {
                seatClass += ' seat-available';
            }
            
            seatBox.className = seatClass;
            // UI 상 좌석 번호 표기
            seatBox.textContent = `${row}${col}`;
            seatBox.dataset.seatId = seatId;
            
            // 좌석 클릭 이벤트
            if (!isOccupied) {
                seatBox.addEventListener('click', () => toggleSeat(seatId));
            }
            
            DOM.seatLayout.appendChild(seatBox);
        }
    });
}

// 10. 좌석 클릭 토글
function toggleSeat(seatId) {
    const index = state.selectedSeats.indexOf(seatId);
    
    if (index > -1) {
        // 이미 선택된 좌석이면 배열에서 제거
        state.selectedSeats.splice(index, 1);
    } else {
        // 최대 6석까지 예약 가능 제한 규칙 부여
        if (state.selectedSeats.length >= 6) {
            alert('교육용 가상 예매 시스템에서는 1회당 최대 6개의 좌석까지만 동시 선택할 수 있습니다.');
            return;
        }
        state.selectedSeats.push(seatId);
    }
    
    // 상태가 변경되었으므로 좌석 맵과 요약 데이터를 재렌더링
    renderSeatLayout();
    updateSummary();
}

// 11. 예매 요약 정보 실시간 계산 및 패널 업데이트
function updateSummary() {
    if (!state.selectedPerformance) {
        DOM.summaryMovieTitle.textContent = '-';
        DOM.summaryDateTime.textContent = '-';
        DOM.summarySeats.textContent = '선택된 좌석 없음';
        DOM.priceRegularQty.textContent = '0석';
        DOM.priceVipQty.textContent = '0석';
        DOM.totalQty.textContent = '0석';
        DOM.btnCheckout.disabled = true;
        return;
    }

    // 연극 제목 정보
    DOM.summaryMovieTitle.textContent = state.selectedPerformance.title;
    
    // 날짜/시간 정보
    if (state.selectedDate && state.selectedTime) {
        const dateObj = new Date(state.selectedDate);
        const dayLabel = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
        DOM.summaryDateTime.textContent = `${state.selectedDate} (${dayLabel}) | ${state.selectedTime}`;
    } else {
        DOM.summaryDateTime.textContent = '-';
    }

    // 좌석 목록 가독성 있게 나열
    if (state.selectedSeats.length > 0) {
        // 가독성 포맷 변경 ('A-5' -> 'A5')
        const formattedSeats = state.selectedSeats.map(s => s.replace('-', ''));
        DOM.summarySeats.textContent = formattedSeats.join(', ');
    } else {
        DOM.summarySeats.textContent = '선택된 좌석 없음';
    }

    // 좌석별 수량 합산
    let regularCount = 0;
    let vipCount = 0;

    state.selectedSeats.forEach(seatId => {
        const row = seatId.split('-')[0];
        const isVip = state.selectedPerformance.vipRows.includes(row);
        
        if (isVip) {
            vipCount++;
        } else {
            regularCount++;
        }
    });

    DOM.priceRegularQty.textContent = `${regularCount}석`;
    DOM.priceVipQty.textContent = `${vipCount}석`;

    // 총 수량 표시
    DOM.totalQty.textContent = `${regularCount + vipCount}석`;

    // 예매 버튼 활성화 여부
    DOM.btnCheckout.disabled = state.selectedSeats.length === 0;
}

// 12. [Supabase DB] 특정 상영 시간표에 예약 완료된 좌석 추출 헬퍼 (캐시 데이터 활용)
function getBookedSeatsForShow(movieId, date, time) {
    const bookedSeats = [];
    
    state.bookedTickets.forEach(ticket => {
        // DB 필드명은 snake_case(movie_id, show_date, show_time)이거나 camelCase(movieId, date, time)일 수 있으므로 둘 다 지원하여 호환성 확보
        const tMovieId = ticket.movie_id || ticket.movieId;
        const tDate = ticket.show_date || ticket.date;
        const tTime = ticket.show_time || ticket.time;
        
        if (tMovieId === movieId && tDate === date && tTime === time) {
            const seats = Array.isArray(ticket.seats) 
                ? ticket.seats 
                : (typeof ticket.seats === 'string' ? JSON.parse(ticket.seats) : []);
            // Filter out NAME: and PHONE: metadata from blocking seats mapping
            const realSeats = seats.filter(s => !s.startsWith('NAME:') && !s.startsWith('PHONE:'));
            bookedSeats.push(...realSeats);
        }
    });
    
    return bookedSeats;
}

// 13. [Supabase DB] 특정 공연 및 날짜에 해당하는 예매 내역 비동기 조회 (및 LocalStorage 폴백)
async function fetchBookedTickets(movieId, date) {
    if (isSupabaseConfigured) {
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select('*')
                .eq('movie_id', movieId)
                .eq('show_date', date);
            
            if (error) throw error;
            state.bookedTickets = data || [];
        } catch (err) {
            console.error('Supabase에서 예매 내역을 가져오는 중 오류 발생:', err);
            state.bookedTickets = [];
        }
    } else {
        // Fallback: LocalStorage에서 현재 공연과 날짜에 맞는 티켓들을 필터링
        try {
            const data = localStorage.getItem('aether_cinema_tickets');
            const localTickets = data ? JSON.parse(data) : [];
            state.bookedTickets = localTickets.filter(ticket => {
                const tMovieId = ticket.movie_id || ticket.movieId;
                const tDate = ticket.show_date || ticket.date;
                return tMovieId === movieId && tDate === date;
            });
        } catch (err) {
            console.error('LocalStorage에서 예매 내역 로드 중 오류 발생:', err);
            state.bookedTickets = [];
        }
    }
}

// 14. 무료 예매 완료 실행 (Checkout) - Supabase 연동 & LocalStorage 폴백
async function handleCheckout() {
    if (state.selectedSeats.length === 0) return;

    // 이름 및 전화번호 입력 필드 검증
    const nameInput = document.getElementById('customer-name');
    const phoneInput = document.getElementById('customer-phone');
    
    if (!nameInput || !phoneInput) return;

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!name) {
        alert('예매자 이름을 입력해주세요.');
        nameInput.focus();
        return;
    }
    if (!phone) {
        alert('예매자 전화번호를 입력해주세요.');
        phoneInput.focus();
        return;
    }

    // 전화번호 국문 표준 형식 검사 (숫자, 하이픈, 띄어쓰기 조합)
    const phoneRegex = /^[0-9\s-]{9,20}$/;
    if (!phoneRegex.test(phone)) {
        alert('올바른 전화번호 형식을 입력해주세요. (예: 010-1234-5678)');
        phoneInput.focus();
        return;
    }

    // 예매 번호 생성 (예: AC-XXXXXX)
    const ticketId = 'AC-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    // seats 배열 복제 후 예매자 이름 및 연락처 메타데이터 병합
    const seatsWithMetadata = [...state.selectedSeats];
    seatsWithMetadata.push(`NAME:${name}`);
    seatsWithMetadata.push(`PHONE:${phone}`);

    // DB 테이블에 적합한 스네이크 케이스 필드 구조
    const newTicket = {
        id: ticketId,
        movie_id: state.selectedPerformance.id,
        movie_title: state.selectedPerformance.title,
        show_date: state.selectedDate,
        show_time: state.selectedTime,
        seats: seatsWithMetadata,
        booked_at: new Date().toISOString()
    };

    // 로딩 상태 피드백 (버튼 비활성화 및 텍스트 변경)
    const originalBtnText = DOM.btnCheckout.innerHTML;
    DOM.btnCheckout.disabled = true;
    DOM.btnCheckout.innerHTML = '<i data-lucide="loader" class="animate-spin" style="width: 18px; height: 18px;"></i> 예매 처리 중...';
    if (window.lucide) window.lucide.createIcons();

    let success = false;

    if (isSupabaseConfigured) {
        try {
            const { error } = await supabase
                .from('tickets')
                .insert([newTicket]);
            
            if (error) throw error;
            success = true;
        } catch (err) {
            console.error('Supabase 예매 등록 중 오류 발생:', err);
            alert(`❌ DB 저장 중 오류가 발생했습니다: ${err.message || err}`);
        }
    } else {
        // Fallback: LocalStorage 저장
        try {
            const localTickets = JSON.parse(localStorage.getItem('aether_cinema_tickets') || '[]');
            
            // 기존 레거시 camelCase를 유지하는 객체 형태로도 저장하여 기존 코드와 상호 호환
            const camelCaseTicket = {
                id: ticketId,
                movieId: state.selectedPerformance.id,
                movieTitle: state.selectedPerformance.title,
                date: state.selectedDate,
                time: state.selectedTime,
                seats: seatsWithMetadata,
                bookedAt: new Date().toLocaleString()
            };
            
            localTickets.push(camelCaseTicket);
            localStorage.setItem('aether_cinema_tickets', JSON.stringify(localTickets));
            success = true;
        } catch (err) {
            console.error('LocalStorage 저장 중 오류 발생:', err);
            alert(`❌ 로컬 저장 중 오류가 발생했습니다: ${err}`);
        }
    }

    // 버튼 원래대로 복구
    DOM.btnCheckout.innerHTML = originalBtnText;
    DOM.btnCheckout.disabled = state.selectedSeats.length === 0;
    if (window.lucide) window.lucide.createIcons();

    if (success) {
        // 성공 메시지 피드백
        alert(`🎉 무료 예매가 성공적으로 완료되었습니다!\n예매번호: ${ticketId}\n선택하신 좌석: ${state.selectedSeats.map(s => s.replace('-', '')).join(', ')}`);

        // 입력 폼 필드 리셋
        if (nameInput) nameInput.value = '';
        if (phoneInput) phoneInput.value = '';

        // 입력 상태 리셋 및 최신 예매 현황 동기화
        state.selectedSeats = [];
        
        // 최신 예매 내역 다시 불러오기
        await fetchBookedTickets(state.selectedPerformance.id, state.selectedDate);
        
        // UI 동기화
        renderSeatLayout();
        updateSummary();
        renderTimes(); // 남은 좌석수 업데이트
    }
}

// 15. 이벤트 리스너 통합 등록부
function setupEventListeners() {
    // 15-1. 가상 예매 실행
    DOM.btnCheckout.addEventListener('click', handleCheckout);
    
    // 15-2. 네비게이션바 클릭 이벤트
    DOM.btnBookingNav.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    // 로고 클릭 시 새로고침 느낌의 스무스 스크롤 리셋
    DOM.logo.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// 16. 브라우저 로딩 시 엔진 가동
document.addEventListener('DOMContentLoaded', init);
