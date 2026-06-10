import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화 및 설정 체크
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
let supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vite 개발 서버 재시작이 안 되었거나 환경변수를 불러오지 못한 경우를 대비해
// 실제 사용자의 Supabase 주소와 키를 폴백 기본값으로 할당합니다.
if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_PROJECT_URL') {
    supabaseUrl = 'https://ppopovwarjgsuynrgyzo.supabase.co';
}
if (!supabaseKey || supabaseKey === 'YOUR_SUPABASE_ANON_KEY') {
    supabaseKey = 'sb_publishable_mnto_SfUgXs6V13rcaRXPQ_rHCeK0h6';
}

export const isSupabaseConfigured = 
    supabaseUrl && 
    supabaseUrl !== 'YOUR_SUPABASE_PROJECT_URL' && 
    supabaseKey && 
    supabaseKey !== 'YOUR_SUPABASE_ANON_KEY';

console.log('[Aether Art Hall Shared] Supabase 설정 상태:', {
    url: supabaseUrl,
    keyConfigured: !!supabaseKey,
    isSupabaseConfigured
});

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null;

// 대학로 대표 연극 모의 데이터 (Mock Data)
export const mockPerformances = [
    {
        id: 'play-1',
        title: '쉬어매드니스 (Shear Madness)',
        englishTitle: 'Shear Madness',
        genre: '관객참여형 추리극',
        runtime: 110,
        rating: 4.8,
        vipRows: ['C', 'D', 'E'], // VIP 등급 좌석이 배치될 행 지정
        desc: '언제나 쾌활한 쉬어매드니스 미용실 위층에서 벌어진 살인사건. 실시간으로 관객이 목격자가 되어 배심원으로서 용의자를 심문하고 살인범을 색출해 내는 추리 코미디.',
        gradient: 'linear-gradient(135deg, #11998e, #38ef7d)'
    },
    {
        id: 'play-2',
        title: '옥탑방고양이 (Cat on the Roof)',
        englishTitle: 'Cat on the Roof',
        genre: '로맨틱 코미디',
        runtime: 100,
        rating: 4.7,
        vipRows: ['D', 'E'],
        desc: '작가의 꿈을 위해 서울로 상경한 은비와 미스터리한 매력의 경민이 옥탑방 이중 계약으로 인해 엉겁결에 한 집 살이를 시작하며 피어나는 청춘 발랄 로맨스.',
        gradient: 'linear-gradient(135deg, #ff9966, #ff5e62)'
    },
    {
        id: 'play-3',
        title: '라이어 (Liar)',
        englishTitle: 'Liar',
        genre: '상황극 코미디',
        runtime: 90,
        rating: 4.6,
        vipRows: ['C', 'D'],
        desc: '두 집 살림을 차린 택시 기사 존 스미스가 가벼운 사고를 계기로 거짓말을 늘어놓기 시작한다. 거짓말이 거짓말을 낳으며 펼쳐지는 꼬리에 꼬리를 무는 포복절도 코미디.',
        gradient: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)'
    },
    {
        id: 'play-4',
        title: '빨래 (Laundry)',
        englishTitle: 'Laundry',
        genre: '힐링 뮤지컬 연극',
        runtime: 120,
        rating: 4.9,
        vipRows: ['D', 'E', 'F'],
        desc: '서울 변두리 달동네로 이사 온 나영과 이주노동자 솔롱고가 옥상 빨래터에서 만나 서로의 아픔을 보듬는다. 팍팍한 서울살이 속 소박한 이웃들의 따뜻한 위로와 노래.',
        gradient: 'linear-gradient(135deg, #00c6ff, #0072ff)'
    }
];
