import { supabase, isSupabaseConfigured, mockPerformances } from '../shared.js';

// 1. 애플리케이션 상태 (Global State)
const state = {
    tickets: [],            // 전체 예매 내역 데이터 (원본 캐시)
    filteredTickets: [],    // 검색/필터/정렬이 적용된 데이터
    searchQuery: '',        // 검색어
    selectedMovieFilter: '',// 공연 필터 (movie_id)
    sortBy: 'newest'        // 정렬 기준
};

// 2. DOM 요소 셀렉터
const DOM = {
    ticketTableBody: document.getElementById('ticket-table-body'),
    noDataMessage: document.getElementById('no-data-message'),
    tableLoading: document.getElementById('table-loading'),
    
    // 컨트롤 바
    searchInput: document.getElementById('search-input'),
    filterMovie: document.getElementById('filter-movie'),
    sortTickets: document.getElementById('sort-tickets'),
    btnRefresh: document.getElementById('btn-refresh'),
    
    // 대시보드 스탯
    statTotalBookings: document.getElementById('stat-total-bookings'),
    statTotalSeats: document.getElementById('stat-total-seats'),
    statPopularMovie: document.getElementById('stat-popular-movie'),

    // 네비바 로고 및 링크
    btnBookingNavBack: document.getElementById('btn-booking-nav-back')
};

// 3. 초기화 함수
function init() {
    // 3-1. 공연 필터 목록 옵션 렌더링
    populateMovieFilterOptions();

    // 3-2. 이벤트 리스너 등록
    setupEventListeners();

    // 3-3. 예매 내역 불러오기
    fetchTickets();
}

// 4. 공연 필터 셀렉트박스 옵션 로드
function populateMovieFilterOptions() {
    mockPerformances.forEach(play => {
        const option = document.createElement('option');
        option.value = play.id;
        option.textContent = play.title;
        DOM.filterMovie.appendChild(option);
    });
}

// 5. 이벤트 리스너 통합 등록부
function setupEventListeners() {
    // 5-1. 실시간 검색어 입력 이벤트
    DOM.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        applyFiltersAndRender();
    });

    // 5-2. 공연 필터 변경 이벤트
    DOM.filterMovie.addEventListener('change', (e) => {
        state.selectedMovieFilter = e.target.value;
        applyFiltersAndRender();
    });

    // 5-3. 정렬 기준 변경 이벤트
    DOM.sortTickets.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        applyFiltersAndRender();
    });

    // 5-4. 새로고침 버튼 클릭 이벤트
    DOM.btnRefresh.addEventListener('click', () => {
        fetchTickets();
    });

    // 5-5. Lucide 아이콘 지원
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// 6. 예매 내역 비동기 조회 (Supabase & LocalStorage 폴백 지원)
async function fetchTickets() {
    // 로딩 화면 표시
    DOM.tableLoading.classList.remove('hidden');
    DOM.noDataMessage.classList.add('hidden');
    DOM.ticketTableBody.innerHTML = '';

    let rawData = [];

    if (isSupabaseConfigured) {
        try {
            console.log('[Admin] Supabase DB로부터 전체 예매 목록 조회 중...');
            const { data, error } = await supabase
                .from('tickets')
                .select('*')
                .order('booked_at', { ascending: false });

            if (error) throw error;
            rawData = data || [];
        } catch (err) {
            console.error('[Admin] Supabase 예매 데이터 조회 실패:', err);
            alert(`⚠️ DB 연동 중 오류가 발생하여 로컬 브라우저 저장소 데이터(LocalStorage)로 대체합니다.`);
            rawData = loadFromLocalStorage();
        }
    } else {
        console.log('[Admin] Supabase 미연동 상태: LocalStorage 데이터 사용');
        rawData = loadFromLocalStorage();
    }

    // 데이터 표준화 및 가독성 최적화
    state.tickets = normalizeTickets(rawData);
    
    // 전체 예매 내역 기준 통계 산출
    calculateDashboardStats();

    // 로딩 완료 후 필터 및 렌더링
    DOM.tableLoading.classList.add('hidden');
    applyFiltersAndRender();
}

// 7. LocalStorage 백업 로드 헬퍼
function loadFromLocalStorage() {
    try {
        const localData = localStorage.getItem('aether_cinema_tickets');
        return localData ? JSON.parse(localData) : [];
    } catch (err) {
        console.error('[Admin] LocalStorage 데이터 로딩 에러:', err);
        return [];
    }
}

// 8. DB 및 로컬 스토리지 필드 불일치 해소를 위한 표준화
function normalizeTickets(rawData) {
    return rawData.map(ticket => {
        // DB 테이블의 snake_case와 로컬스토리지의 camelCase 필드명 호환 처리
        const id = ticket.id;
        const movie_id = ticket.movie_id || ticket.movieId || '';
        const movie_title = ticket.movie_title || ticket.movieTitle || '알 수 없는 공연';
        const show_date = ticket.show_date || ticket.date || '';
        const show_time = ticket.show_time || ticket.time || '';
        const booked_at = ticket.booked_at || ticket.bookedAt || '';
        
        let seats = [];
        if (Array.isArray(ticket.seats)) {
            seats = ticket.seats;
        } else if (typeof ticket.seats === 'string') {
            try {
                seats = JSON.parse(ticket.seats);
            } catch (e) {
                // 콤마로 구분된 텍스트 형태일 때 대비
                seats = ticket.seats.split(',').map(s => s.trim());
            }
        }

        return { id, movie_id, movie_title, show_date, show_time, seats, booked_at };
    });
}

// 9. 대시보드 핵심 통계량 계산 및 반영
function calculateDashboardStats() {
    const totalBookings = state.tickets.length;
    
    // 총 좌석 수 합산
    let totalSeats = 0;
    state.tickets.forEach(t => {
        totalSeats += (t.seats ? t.seats.length : 0);
    });

    // 공연별 예약 횟수 집계
    const popularMap = {};
    state.tickets.forEach(t => {
        const title = t.movie_title;
        popularMap[title] = (popularMap[title] || 0) + (t.seats ? t.seats.length : 0);
    });

    let popularMovie = '-';
    let maxSeats = 0;
    for (const [title, seatCount] of Object.entries(popularMap)) {
        if (seatCount > maxSeats) {
            maxSeats = seatCount;
            popularMovie = title;
        }
    }
    
    // UI에 수치 애니메이션/포맷 적용하여 주입
    DOM.statTotalBookings.textContent = totalBookings.toLocaleString('ko-KR') + '건';
    DOM.statTotalSeats.textContent = totalSeats.toLocaleString('ko-KR') + '석';
    
    // 긴 제목은 축소 표기
    if (popularMovie.length > 18) {
        DOM.statPopularMovie.textContent = popularMovie.substring(0, 16) + '...';
        DOM.statPopularMovie.title = popularMovie;
    } else {
        DOM.statPopularMovie.textContent = popularMovie;
    }
}

// 10. 실시간 필터 및 정렬 알고리즘 적용
function applyFiltersAndRender() {
    let result = [...state.tickets];

    // 10-1. 공연별 필터링
    if (state.selectedMovieFilter) {
        result = result.filter(ticket => ticket.movie_id === state.selectedMovieFilter);
    }

    // 10-2. 검색어 필터링 (예매번호, 공연제목, 좌석명)
    if (state.searchQuery) {
        const query = state.searchQuery;
        result = result.filter(ticket => {
            const matchId = ticket.id.toLowerCase().includes(query);
            const matchTitle = ticket.movie_title.toLowerCase().includes(query);
            const matchSeats = ticket.seats.some(s => s.replace('-', '').toLowerCase().includes(query) || s.toLowerCase().includes(query));
            return matchId || matchTitle || matchSeats;
        });
    }

    // 10-3. 정렬 알고리즘 적용
    if (state.sortBy === 'newest') {
        // 예매 일시 기준 최신순
        result.sort((a, b) => new Date(b.booked_at) - new Date(a.booked_at));
    } else if (state.sortBy === 'oldest') {
        // 예매 일시 기준 과거순
        result.sort((a, b) => new Date(a.booked_at) - new Date(b.booked_at));
    } else if (state.sortBy === 'showDate') {
        // 실제 관람 날짜 및 시간순
        result.sort((a, b) => {
            const dateTimeA = `${a.show_date}T${a.show_time}`;
            const dateTimeB = `${b.show_date}T${b.show_time}`;
            return new Date(dateTimeA) - new Date(dateTimeB);
        });
    }

    state.filteredTickets = result;
    renderTicketsTable();
}

// 11. 최종 HTML 테이블 행 생성 및 렌더링
function renderTicketsTable() {
    DOM.ticketTableBody.innerHTML = '';

    if (state.filteredTickets.length === 0) {
        DOM.noDataMessage.classList.remove('hidden');
        return;
    }

    DOM.noDataMessage.classList.add('hidden');

    state.filteredTickets.forEach(ticket => {
        const row = document.createElement('tr');
        row.dataset.id = ticket.id;

        // 예매 관람 요일 추출
        let dayLabel = '';
        if (ticket.show_date) {
            const dateObj = new Date(ticket.show_date);
            dayLabel = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()] || '';
        }

        // 관람 일정 가독성 포맷
        const dateStr = ticket.show_date ? `${ticket.show_date} (${dayLabel})` : '-';
        const timeStr = ticket.show_time || '';

        // 좌석 목록 배지화
        const seatBadges = ticket.seats.map(seatId => {
            const formatted = seatId.replace('-', '');
            return `<span class="seat-badge">${formatted}</span>`;
        }).join('');

        // 예매 생성 시각 한국 표준 포맷 처리
        const formattedBookedAt = formatDateTime(ticket.booked_at);

        row.innerHTML = `
            <td><span class="ticket-id">${ticket.id}</span></td>
            <td class="movie-title-td">${ticket.movie_title}</td>
            <td class="date-td">${dateStr}<br>${timeStr}</td>
            <td><div class="seats-container">${seatBadges}</div></td>
            <td class="booked-at-td">${formattedBookedAt}</td>
            <td>
                <button class="btn-delete" data-id="${ticket.id}">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> 취소
                </button>
            </td>
        `;

        // 삭제 이벤트 리스너 할당
        row.querySelector('.btn-delete').addEventListener('click', () => handleDeleteTicket(ticket.id));
        DOM.ticketTableBody.appendChild(row);
    });

    // Lucide 아이콘 라이브러리 가동
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// 12. 날짜/시간 한글 가독성 도우미 함수
function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        
        return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
    } catch (e) {
        return dateStr;
    }
}

// 13. [DELETE] 특정 예매 내역 취소 (DB 연동 및 LocalStorage 폴백 지원)
async function handleDeleteTicket(ticketId) {
    const isConfirmed = confirm(`🚨 예매번호 [ ${ticketId} ] 내역을 정말로 취소(삭제)하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`);
    if (!isConfirmed) return;

    DOM.tableLoading.classList.remove('hidden');

    let success = false;

    if (isSupabaseConfigured) {
        try {
            console.log(`[Admin] Supabase DB에서 예매번호 ${ticketId} 삭제 처리 중...`);
            const { error } = await supabase
                .from('tickets')
                .delete()
                .eq('id', ticketId);

            if (error) throw error;
            success = true;
        } catch (err) {
            console.error('[Admin] Supabase 예매 취소 중 에러:', err);
            alert(`❌ DB 예매 취소 처리 중 오류가 발생했습니다: ${err.message || err}`);
        }
    }

    // Supabase 연동에 실패했거나, 애초에 미연동 상태인 경우 로컬스토리지 백업 데이터 정리
    if (!success) {
        try {
            console.log(`[Admin] LocalStorage에서 예매번호 ${ticketId} 삭제 처리 중...`);
            const localData = loadFromLocalStorage();
            
            // 기존 localData 배열에서 해당 id를 필터링 제거
            const updatedData = localData.filter(ticket => ticket.id !== ticketId);
            
            localStorage.setItem('aether_cinema_tickets', JSON.stringify(updatedData));
            success = true;
        } catch (err) {
            console.error('[Admin] LocalStorage 예매 취소 중 에러:', err);
            alert(`❌ 로컬 데이터 삭제 처리 중 오류가 발생했습니다.`);
            success = false;
        }
    }

    if (success) {
        alert(`🎉 예매번호 [ ${ticketId} ] 가 정상적으로 취소되었습니다.`);
        // 최신 데이터 동기화
        await fetchTickets();
    } else {
        DOM.tableLoading.classList.add('hidden');
    }
}

// 14. 문서 로드 시 가동
document.addEventListener('DOMContentLoaded', init);
