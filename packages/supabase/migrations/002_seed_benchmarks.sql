-- 업종별 벤치마크 시드 데이터 (한국 시장 기준, 2026 Q1)
-- 출처: 업종 평균 추정치

-- 이커머스
INSERT INTO benchmarks (industry, platform, metric_type, value, period, source) VALUES
('ecommerce', 'naver_search', 'cpc', 500, '2026-Q1', 'industry_avg'),
('ecommerce', 'naver_search', 'ctr', 3.5, '2026-Q1', 'industry_avg'),
('ecommerce', 'naver_search', 'cvr', 2.0, '2026-Q1', 'industry_avg'),
('ecommerce', 'naver_search', 'roas', 3.0, '2026-Q1', 'industry_avg'),
('ecommerce', 'meta', 'cpc', 800, '2026-Q1', 'industry_avg'),
('ecommerce', 'meta', 'ctr', 1.2, '2026-Q1', 'industry_avg'),
('ecommerce', 'meta', 'cvr', 1.5, '2026-Q1', 'industry_avg'),
('ecommerce', 'meta', 'roas', 2.5, '2026-Q1', 'industry_avg'),
('ecommerce', 'google', 'cpc', 600, '2026-Q1', 'industry_avg'),
('ecommerce', 'google', 'ctr', 2.5, '2026-Q1', 'industry_avg'),
('ecommerce', 'google', 'cvr', 1.8, '2026-Q1', 'industry_avg'),
('ecommerce', 'google', 'roas', 2.8, '2026-Q1', 'industry_avg'),

-- 의료 (병원/의원)
('medical', 'naver_search', 'cpc', 2000, '2026-Q1', 'industry_avg'),
('medical', 'naver_search', 'ctr', 4.0, '2026-Q1', 'industry_avg'),
('medical', 'naver_search', 'cvr', 3.0, '2026-Q1', 'industry_avg'),
('medical', 'naver_search', 'roas', 5.0, '2026-Q1', 'industry_avg'),
('medical', 'meta', 'cpc', 1500, '2026-Q1', 'industry_avg'),
('medical', 'meta', 'ctr', 0.8, '2026-Q1', 'industry_avg'),
('medical', 'meta', 'cvr', 2.0, '2026-Q1', 'industry_avg'),
('medical', 'meta', 'roas', 4.0, '2026-Q1', 'industry_avg'),
('medical', 'google', 'cpc', 1800, '2026-Q1', 'industry_avg'),
('medical', 'google', 'ctr', 3.0, '2026-Q1', 'industry_avg'),
('medical', 'google', 'cvr', 2.5, '2026-Q1', 'industry_avg'),
('medical', 'google', 'roas', 4.5, '2026-Q1', 'industry_avg'),

-- 교육/학원
('education', 'naver_search', 'cpc', 800, '2026-Q1', 'industry_avg'),
('education', 'naver_search', 'ctr', 3.0, '2026-Q1', 'industry_avg'),
('education', 'naver_search', 'cvr', 2.5, '2026-Q1', 'industry_avg'),
('education', 'naver_search', 'roas', 3.5, '2026-Q1', 'industry_avg'),
('education', 'meta', 'cpc', 600, '2026-Q1', 'industry_avg'),
('education', 'meta', 'ctr', 1.0, '2026-Q1', 'industry_avg'),
('education', 'meta', 'cvr', 1.2, '2026-Q1', 'industry_avg'),
('education', 'meta', 'roas', 2.0, '2026-Q1', 'industry_avg'),
('education', 'google', 'cpc', 700, '2026-Q1', 'industry_avg'),
('education', 'google', 'ctr', 2.0, '2026-Q1', 'industry_avg'),
('education', 'google', 'cvr', 1.5, '2026-Q1', 'industry_avg'),
('education', 'google', 'roas', 2.5, '2026-Q1', 'industry_avg'),

-- 금융
('finance', 'naver_search', 'cpc', 3000, '2026-Q1', 'industry_avg'),
('finance', 'naver_search', 'ctr', 2.5, '2026-Q1', 'industry_avg'),
('finance', 'naver_search', 'cvr', 1.5, '2026-Q1', 'industry_avg'),
('finance', 'naver_search', 'roas', 4.0, '2026-Q1', 'industry_avg'),
('finance', 'meta', 'cpc', 2500, '2026-Q1', 'industry_avg'),
('finance', 'meta', 'ctr', 0.6, '2026-Q1', 'industry_avg'),
('finance', 'meta', 'cvr', 1.0, '2026-Q1', 'industry_avg'),
('finance', 'meta', 'roas', 3.0, '2026-Q1', 'industry_avg'),
('finance', 'google', 'cpc', 2800, '2026-Q1', 'industry_avg'),
('finance', 'google', 'ctr', 2.0, '2026-Q1', 'industry_avg'),
('finance', 'google', 'cvr', 1.2, '2026-Q1', 'industry_avg'),
('finance', 'google', 'roas', 3.5, '2026-Q1', 'industry_avg');
