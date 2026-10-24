// plugins/vsmov/plugin.js
// VSMov Provider for JKHX Player using VSMov API (vsmov.com)
// Tuân thủ kiến trúc phân tầng chuẩn mới nhất (tương đồng mẫu kkphim):
//   - Nhóm 1: Các hàm phục vụ crawl dữ liệu từ nguồn VSMov API (Crawler / Source API Layer)
//   - Nhóm 2: Các hàm phục vụ fill data lên JKHX Player (Player Contract Layer: Bắt buộc & Tùy chọn)

// ============================================================================
// CẤU HÌNH & HẰNG SỐ NGUỒN VSMOV
// ============================================================================
const DEFAULT_BASE_URL = "https://vsmov.com";
const DEFAULT_CDN = "https://vsmov.com";
const DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const CF_FALLBACK_PROXY = "https://j-proxy-fallback.khx.workers.dev/?url=";
const CODETABS_PROXY = "https://api.codetabs.com/v1/proxy?quest=";

// Polyfill an toàn cho QuickJS Sandbox nếu thiếu setTimeout
if (typeof setTimeout === 'undefined') {
  globalThis.setTimeout = function(fn) {
    if (typeof fn === 'function') {
      try { fn(); } catch (e) {}
    }
    return { unref: function() {}, ref: function() {} };
  };
  globalThis.clearTimeout = function() {};
}

/**
 * Lấy Base URL linh hoạt: ưu tiên context storage -> CUSTOM_DOMAIN -> mặc định
 */
function getBaseUrl() {
  if (typeof globalThis !== 'undefined') {
    const savedDomain = globalThis.context?.storage?.get("base_url");
    if (savedDomain && savedDomain.trim()) return savedDomain.trim().replace(/\/+$/, '');
    if (globalThis.CUSTOM_DOMAIN && globalThis.CUSTOM_DOMAIN.trim()) return globalThis.CUSTOM_DOMAIN.trim().replace(/\/+$/, '');
    if (globalThis.BASE_URL && globalThis.BASE_URL.trim()) return globalThis.BASE_URL.trim().replace(/\/+$/, '');
  }
  return DEFAULT_BASE_URL;
}

/**
 * Lấy CDN URL linh hoạt
 */
function getCdnDomain() {
  if (typeof globalThis !== 'undefined') {
    const savedCdn = globalThis.context?.storage?.get("cdn_domain");
    if (savedCdn && savedCdn.trim()) return savedCdn.trim().replace(/\/+$/, '');
  }
  return DEFAULT_CDN;
}

const KNOWN_SLUG_MAP = {
  // Danh mục danh sách
  "phim-moi-cap-nhat": { type: "danh-sach", slug: "phim-moi-cap-nhat" },
  "phim-moi": { type: "danh-sach", slug: "phim-moi" },
  "phim-bo": { type: "danh-sach", slug: "phim-bo" },
  "phim-le": { type: "danh-sach", slug: "phim-le" },
  "subteam": { type: "danh-sach", slug: "subteam" },
  "thuyet-minh": { type: "danh-sach", slug: "thuyet-minh"},
  "long-tieng": { type: "danh-sach", slug: "long-tieng"},
  "dang-chieu": { type: "danh-sach", slug: "dang-chieu"},
  "4k": { type: "danh-sach", slug: "4k"},
  "phim-chieu-rap": { type: "danh-sach", slug: "phim-chieu-rap"},

  // Quốc gia
  "han-quoc": { type: "quoc-gia", slug: "han-quoc" },
  "trung-quoc": { type: "quoc-gia", slug: "trung-quoc" },
  "au-my": { type: "quoc-gia", slug: "au-my" },
  "nhat-ban": { type: "quoc-gia", slug: "nhat-ban" },
  "thai-lan": { type: "quoc-gia", slug: "thai-lan" },
  "viet-nam": { type: "quoc-gia", slug: "viet-nam" },
  "hong-kong": { type: "quoc-gia", slug: "hong-kong" },
  "dai-loan": { type: "quoc-gia", slug: "dai-loan" },
  "an-do": { type: "quoc-gia", slug: "an-do" },
  "phap": { type: "quoc-gia", slug: "phap" },
  "anh": { type: "quoc-gia", slug: "anh" },
  "y": { type: "quoc-gia", slug: "y" },
  "duc": { type: "quoc-gia", slug: "duc" },

  // Thể loại
  "action-adventure": { type: "the-loai", slug: "action-adventure" },
  "hanh-dong": { type: "the-loai", slug: "hanh-dong" },
  "kinh-di": { type: "the-loai", slug: "kinh-di" },
  "tinh-cam": { type: "the-loai", slug: "tinh-cam" },
  "hai-huoc": { type: "the-loai", slug: "hai-huoc" },
  "vien-tuong": { type: "the-loai", slug: "vien-tuong" },
  "tam-ly": { type: "the-loai", slug: "tam-ly" },
  "co-trang": { type: "the-loai", slug: "co-trang" },
  "chien-tranh": { type: "the-loai", slug: "chien-tranh" },
  "hinh-su": { type: "the-loai", slug: "hinh-su" },
  "vo-thuat": { type: "the-loai", slug: "vo-thuat" },
  "hoat-hinh": { type: "the-loai", slug: "hoat-hinh" },
  "shows": { type: "the-loai", slug: "truyen-hinh-thuc-te" },
  "tv-shows": { type: "the-loai", slug: "truyen-hinh-thuc-te" },
  "tai-lieu": { type: "the-loai", slug: "tai-lieu" },
  "bi-an": { type: "the-loai", slug: "bi-an" },
  "chinh-kich": { type: "the-loai", slug: "chinh-kich" },
  "gia-dinh": { type: "the-loai", slug: "gia-dinh" },
  "hoc-duong": { type: "the-loai", slug: "hoc-duong" },
  "am-nhac": { type: "the-loai", slug: "am-nhac" },
  "phieu-luu": { type: "the-loai", slug: "phieu-luu" },
  "than-thoai": { type: "the-loai", slug: "than-thoai" },
  "khoa-hoc": { type: "the-loai", slug: "khoa-hoc" },
  "the-thao": { type: "the-loai", slug: "the-thao" }
};

// ============================================================================
// NHÓM 1: CÁC HÀM CRAWL DỮ LIỆU TỪ NGUỒN VSMOV API (vsmov.com)
// ============================================================================

/**
 * 1.1 HELPER: Ghép link ảnh trực tiếp với CDN
 */
function buildImageUrl(path, cdnDomain = getCdnDomain()) {
  if (!path || typeof path !== 'string') return "";
  const trimmed = path.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const cleanPath = trimmed.replace(/^\/+/, '');
  const cleanCdn = (cdnDomain || getCdnDomain()).replace(/\/+$/, '');
  return `${cleanCdn}/${cleanPath}`;
}

/**
 * 1.2 HELPER: Tạo query string an toàn cho URL API
 */
function buildQueryString(params) {
  if (!params || typeof params !== 'object') return '';
  const parts = [];
  for (const key of Object.keys(params)) {
    const val = params[key];
    if (val !== undefined && val !== null && val !== '') {
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(val)));
    }
  }
  return parts.join('&');
}

/**
 * 1.3 HELPER: Trích xuất tên thể loại đầu tiên từ item
 */
function extractFirstCategory(item) {
  if (Array.isArray(item.category) && item.category.length > 0) {
    const first = item.category[0];
    if (typeof first === 'object' && first !== null) {
      return first.name || first.slug || "";
    }
    return String(first);
  }
  return null;
}

/**
 * 1.4 HELPER: Phân giải type & slug chuẩn từ query
 */
function resolveTypeAndSlug(type, slug) {
  let resolvedType = (type || "").trim();
  let resolvedSlug = (slug || "").trim();

  if (!resolvedType || resolvedType === "category" || resolvedType === "all") {
    if (KNOWN_SLUG_MAP[resolvedSlug]) {
      return KNOWN_SLUG_MAP[resolvedSlug];
    }
    if (/^\d{4}$/.test(resolvedSlug)) {
      return { type: "nam", slug: resolvedSlug };
    }
    resolvedType = "danh-sach";
  }

  if (resolvedType === "the-loai" || resolvedType === "theloai" || resolvedType === "genres") {
    resolvedType = "the-loai";
  } else if (resolvedType === "quoc-gia" || resolvedType === "quocgia" || resolvedType === "countries") {
    resolvedType = "quoc-gia";
  } else if (resolvedType === "nam" || resolvedType === "years") {
    resolvedType = "nam";
  } else if (resolvedType === "danh-sach" || resolvedType === "danhsach" || resolvedType === "lists") {
    resolvedType = "danh-sach";
  }

  return { type: resolvedType, slug: resolvedSlug };
}

/**
 * 1.5 CRAWLER: Lấy danh sách thể loại từ VSMov
 */
async function crawlGenres() {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/api/the-loai`);
    const json = await res.json();
    const items = json.data?.items || json.items || [];
    if (Array.isArray(items) && items.length > 0) {
      return items.map(i => ({ name: i.name, slug: i.slug }));
    }
  } catch (e) {
    // Fallback nếu API nguồn lỗi
  }
  return [
    { name: 'Action & Adventure', slug: 'action-adventure' },
    { name: 'Hành Động', slug: 'hanh-dong' },
    { name: 'Kinh Dị', slug: 'kinh-di' },
    { name: 'Tình Cảm', slug: 'tinh-cam' },
    { name: 'Hài Hước', slug: 'hai-huoc' },
    { name: 'Viễn Tưởng', slug: 'vien-tuong' },
    { name: 'Tâm Lý', slug: 'tam-ly' },
    { name: 'Cổ Trang', slug: 'co-trang' },
    { name: 'Chiến Tranh', slug: 'chien-tranh' },
    { name: 'Hình Sự', slug: 'hinh-su' },
    { name: 'Võ Thuật', slug: 'vo-thuat' },
    { name: 'Tài Liệu', slug: 'tai-lieu' },
    { name: 'Bí Ẩn', slug: 'bi-an' },
    { name: 'Chính Kịch', slug: 'chinh-kich' },
    { name: 'Gia Đình', slug: 'gia-dinh' },
    { name: 'Học Đường', slug: 'hoc-duong' },
    { name: 'Âm Nhạc', slug: 'am-nhac' },
    { name: 'Phiêu Lưu', slug: 'phieu-luu' },
    { name: 'Thần Thoại', slug: 'than-thoai' },
    { name: 'Khoa Học', slug: 'khoa-hoc' },
    { name: 'Thể Thao', slug: 'the-thao' }
  ];
}

/**
 * 1.6 CRAWLER: Lấy danh sách quốc gia từ VSMov
 */
async function crawlCountries() {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/api/quoc-gia`);
    const json = await res.json();
    const items = json.data?.items || json.items || [];
    if (Array.isArray(items) && items.length > 0) {
      return items.map(i => ({ name: i.name, slug: i.slug }));
    }
  } catch (e) {
    // Fallback nếu API nguồn lỗi
  }
  return [
    { name: 'Hàn Quốc', slug: 'han-quoc' },
    { name: 'Trung Quốc', slug: 'trung-quoc' },
    { name: 'Âu Mỹ', slug: 'au-my' },
    { name: 'Nhật Bản', slug: 'nhat-ban' },
    { name: 'Thái Lan', slug: 'thai-lan' },
    { name: 'Việt Nam', slug: 'viet-nam' },
    { name: 'Hồng Kông', slug: 'hong-kong' },
    { name: 'Đài Loan', slug: 'dai-loan' },
    { name: 'Ấn Độ', slug: 'an-do' },
    { name: 'Pháp', slug: 'phap' },
    { name: 'Anh', slug: 'anh' },
    { name: 'Ý', slug: 'y' }
  ];
}

/**
 * 1.7 CRAWLER: Lấy danh sách phim theo phân loại, phân trang và bộ lọc từ VSMov
 */
async function crawlList(type, slug, page = 1, filters = {}) {
  try {
    const LIMIT = 24;
    const base = getBaseUrl();
    const resolved = resolveTypeAndSlug(type, slug);
    let targetType = resolved.type;
    let targetSlug = resolved.slug;

    const hasFilterCategory = Boolean(filters?.category && filters.category.trim());
    const hasFilterCountry = Boolean(filters?.country && filters.country.trim());
    const hasFilterYear = Boolean(filters?.year && filters.year.trim());
    const hasFilterType = Boolean(filters?.type && filters.type.trim());
    const hasFilterStatus = Boolean(filters?.status && filters.status.trim());
    const hasAnyFilter = hasFilterCategory || hasFilterCountry || hasFilterYear || hasFilterType || hasFilterStatus;

    const queryParams = {
      page: page,
      limit: LIMIT
    };

    if (hasFilterYear) {
      queryParams.year = filters.year.trim();
    }
    if (hasFilterCountry) {
      queryParams.country = filters.country.trim();
    }
    if (hasFilterCategory) {
      queryParams.category = filters.category.trim();
    }
    if (hasFilterType) {
      queryParams.type = filters.type.trim();
    }
    if (hasFilterStatus) {
      queryParams.status = filters.status.trim();
    }

    let url = "";

    if (targetType === "the-loai") {
      const genreSlug = hasFilterCategory ? filters.category.trim() : targetSlug;
      delete queryParams.category;
      const qs = buildQueryString(queryParams);
      url = `${base}/api/the-loai/${genreSlug}${qs ? '?' + qs : ''}`;
    } else if (targetType === "quoc-gia") {
      const countrySlug = hasFilterCountry ? filters.country.trim() : targetSlug;
      // Server VSMov bỏ qua query param category trên /api/quoc-gia/[slug].
      // Do đó nếu có lọc Thể loại (category), chuyển sang endpoint lọc tổng hợp /api/danh-sach
      if (hasFilterCategory) {
        queryParams.country = countrySlug;
        const qs = buildQueryString(queryParams);
        url = `${base}/api/danh-sach?${qs}`;
      } else {
        delete queryParams.country;
        const qs = buildQueryString(queryParams);
        url = `${base}/api/quoc-gia/${countrySlug}${qs ? '?' + qs : ''}`;
      }
    } else if (targetType === "nam") {
      const yearSlug = hasFilterYear ? filters.year.trim() : targetSlug;
      // Server VSMov bỏ qua category và country trên /api/nam/[year].
      // Do đó nếu có lọc Thể loại hoặc Quốc gia, chuyển sang /api/danh-sach
      if (hasFilterCategory || hasFilterCountry) {
        queryParams.year = yearSlug;
        const qs = buildQueryString(queryParams);
        url = `${base}/api/danh-sach?${qs}`;
      } else {
        delete queryParams.year;
        const qs = buildQueryString(queryParams);
        url = `${base}/api/nam/${yearSlug}${qs ? '?' + qs : ''}`;
      }
    } else if (targetType === "code") {
      const qs = buildQueryString(queryParams);
      url = `${base}/api/code/${targetSlug}${qs ? '?' + qs : ''}`;
    } else {
      // targetType === "danh-sach"
      const listSlug = targetSlug || "phim-moi-cap-nhat";

      if (listSlug === "hoat-hinh") {
        if (hasAnyFilter) {
          queryParams.category = queryParams.category || "hoat-hinh";
          const qs = buildQueryString(queryParams);
          url = `${base}/api/danh-sach?${qs}`;
        } else {
          const qs = buildQueryString(queryParams);
          url = `${base}/api/the-loai/hoat-hinh${qs ? '?' + qs : ''}`;
        }
      } else if (listSlug === "tv-shows" || listSlug === "shows") {
        if (hasAnyFilter) {
          queryParams.category = queryParams.category || "truyen-hinh-thuc-te";
          const qs = buildQueryString(queryParams);
          url = `${base}/api/danh-sach?${qs}`;
        } else {
          const qs = buildQueryString(queryParams);
          url = `${base}/api/the-loai/truyen-hinh-thuc-te${qs ? '?' + qs : ''}`;
        }
      } else if (listSlug === "phim-bo") {
        if (hasAnyFilter) {
          queryParams.type = queryParams.type || "series";
          const qs = buildQueryString(queryParams);
          url = `${base}/api/danh-sach?${qs}`;
        } else {
          const qs = buildQueryString(queryParams);
          url = `${base}/api/danh-sach/phim-bo${qs ? '?' + qs : ''}`;
        }
      } else if (listSlug === "phim-le") {
        if (hasAnyFilter) {
          queryParams.type = queryParams.type || "single";
          const qs = buildQueryString(queryParams);
          url = `${base}/api/danh-sach?${qs}`;
        } else {
          const qs = buildQueryString(queryParams);
          url = `${base}/api/danh-sach/phim-le${qs ? '?' + qs : ''}`;
        }
      } else if (listSlug === "subteam") {
        const qs = buildQueryString(queryParams);
        url = `${base}/api/danh-sach/subteam${qs ? '?' + qs : ''}`;
      } else {
        // phim-moi-cap-nhat hoặc mặc định
        if (hasAnyFilter) {
          const qs = buildQueryString(queryParams);
          url = `${base}/api/danh-sach?${qs}`;
        } else {
          const qs = buildQueryString(queryParams);
          url = `${base}/api/danh-sach/phim-moi-cap-nhat${qs ? '?' + qs : ''}`;
        }
      }
    }

    const res = await fetch(url);
    const text = await res.text();
    if (text.trim().startsWith("<")) {
      return { rawItems: [], pagination: {}, cdnDomain: getCdnDomain() };
    }

    const data = JSON.parse(text);
    const rawItems = data.items || data.data?.items || [];
    const pagination = data.data?.params?.pagination || data.pagination || data.data?.pagination || {};
    const cdnDomain = data.pathImage || data.data?.pathImage || getCdnDomain();

    return { rawItems, pagination, cdnDomain };
  } catch (e) {
    return { rawItems: [], pagination: {}, cdnDomain: getCdnDomain() };
  }
}

/**
 * 1.8 CRAWLER: Tìm kiếm phim theo từ khoá từ VSMov
 */
async function crawlSearch(keyword, page = 1) {
  try {
    const base = getBaseUrl();
    const qs = buildQueryString({
      keyword: keyword,
      page: page,
      limit: 20
    });
    const url = `${base}/api/tim-kiem?${qs}`;
    const res = await fetch(url);
    const text = await res.text();
    if (text.trim().startsWith("<")) {
      return { rawItems: [], pagination: {}, cdnDomain: getCdnDomain() };
    }

    const data = JSON.parse(text);
    const rawItems = data.items || data.data?.items || [];
    const pagination = data.pagination || data.data?.pagination || {};
    const cdnDomain = data.pathImage || data.data?.pathImage || getCdnDomain();

    return { rawItems, pagination, cdnDomain };
  } catch (e) {
    return { rawItems: [], pagination: {}, cdnDomain: getCdnDomain() };
  }
}

/**
 * 1.9 CRAWLER: Lấy thông tin chi tiết phim & danh sách tập từ VSMov
 */
async function crawlDetail(slug) {
  const base = getBaseUrl();
  const url = `${base}/api/phim/${slug}`;
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok || text.trim().startsWith("<")) {
    throw new Error(`VSMov: Không tìm thấy dữ liệu cho phim ${slug}`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`VSMov: Dữ liệu API không hợp lệ cho phim ${slug}`);
  }

  if (!data.status || !data.movie) {
    throw new Error(`VSMov: Không tìm thấy dữ liệu cho phim ${slug}`);
  }

  return {
    movie: data.movie,
    episodes: data.episodes || [],
    pathImage: data.pathImage || getCdnDomain()
  };
}

// ============================================================================
// NHÓM 2: CÁC HÀM PHỤC VỤ FILL DATA LÊN JKHX-PLAYER (JKHX Player Contract)
// ============================================================================

/**
 * 2.1 HELPER: Chuẩn hoá item raw từ VSMov thành MovieItem của JKHX Player
 */
function formatMovieItem(item, cdnDomain = getCdnDomain()) {
  let epCurrent = item.episode_current;
  if (typeof epCurrent === "string") {
    epCurrent = epCurrent.trim();
  } else {
    epCurrent = null;
  }

  if (epCurrent && (epCurrent.toLowerCase() === "tập mới" || epCurrent.toLowerCase() === "tap moi")) {
    epCurrent = null;
  }

  const movieType = item.type || (item.tmdb?.type === "tv" ? "series" : "single");

  return {
    slug: item.slug,
    name: item.name,
    originName: item.origin_name || item.name,
    thumbUrl: buildImageUrl(item.thumb_url, cdnDomain),
    posterUrl: buildImageUrl(item.poster_url || item.thumb_url, cdnDomain),
    year: item.year ? parseInt(item.year) : null,
    type: movieType,
    quality: item.quality || "HD",
    language: item.lang || "Vietsub",
    category: extractFirstCategory(item),
    providerId: "vsmov",
    episodeCurrent: epCurrent,
    rating: item.tmdb?.vote_average ? parseFloat(item.tmdb.vote_average) : null,
    tmdbId: item.tmdb?.id ? String(item.tmdb.id) : (item.tmdb_id ? String(item.tmdb_id) : null)
  };
}

/**
 * 2.2 METADATA: Danh sách năm phát hành
 */
function getYears() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 57 }, (_, i) => ({
    name: (currentYear - i).toString(),
    slug: (currentYear - i).toString()
  }));
}

/**
 * 2.3 METADATA: Danh sách danh mục cố định
 */
function getListCategories() {
  // return [
  //   { name: 'Phim Mới Cập Nhật', slug: 'phim-moi-cap-nhat' },
  //   { name: 'Phim Bộ', slug: 'phim-bo' },
  //   { name: 'Phim Lẻ', slug: 'phim-le' },
  //   { name: 'Hoạt Hình', slug: 'hoat-hinh' },
  //   { name: 'TV Shows', slug: 'tv-shows' },
  //   { name: 'Subteam', slug: 'subteam' }
  // ];
  //   // Danh mục danh sách
  return [
    { name: "Phim Mới Cập Nhật", slug: "phim-moi-cap-nhat" },
    { name: "Phim Mới", slug: "phim-moi" },
    { name: "Phim Lẻ", slug: "phim-le" },
    { name: "Subteam", slug: "subteam" },
    { name: "Phim Thuyết Minh", slug: "thuyet-minh" },
    { name: "Phim Lồng Tiếng", slug: "long-tieng" },
    { name: "Phim Đang Chiếu", slug: "dang-chieu" },
    { name: "Phim 4K", slug: "4k" },
    { name: "Phim Chiếu Rạp", slug: "phim-chieu-rap" }
  ];
}

/**
 * 2.4 PLAYER INTERFACE: Lấy danh sách thể loại cho Player
 */
async function getGenres() {
  return await crawlGenres();
}

/**
 * 2.5 PLAYER INTERFACE: Lấy danh sách quốc gia cho Player
 */
async function getCountries() {
  return await crawlCountries();
}

/**
 * 2.6 PLAYER INTERFACE (TÙY CHỌN): Cấu trúc bộ lọc tổng hợp cho MovieListScreen của Player
 */
async function getFilters() {
  const [genres, countries] = await Promise.all([
    crawlGenres(),
    crawlCountries()
  ]);
  return {
    genres: genres,
    countries: countries,
    years: getYears(),
    sortFields: [],
    sortTypes: [],
    types: [
      { name: "Tất cả loại", slug: "" },
      { name: "Phim lẻ", slug: "single" },
      { name: "Phim bộ", slug: "series" }
    ],
    statuses: [
      { name: "Tất cả trạng thái", slug: "" },
      { name: "Hoàn tất", slug: "completed" },
      { name: "Đang chiếu", slug: "ongoing" },
      { name: "Trailer", slug: "trailer" }
    ]
  };
}

/**
 * 2.7 PLAYER INTERFACE (BẮT BUỘC): Cấu trúc menu trên cùng cho HomeScreen của Player
 */
async function getMenu() {
  const [genres, countries] = await Promise.all([
    crawlGenres(),
    crawlCountries()
  ]);

  return [
    { title: 'VS Cập Nhật', isDropdown: false, prefix: 'danh-sach', slug: 'phim-moi-cap-nhat' },
    { title: 'Phim Bộ', isDropdown: false, prefix: 'danh-sach', slug: 'phim-bo' },
    { title: 'Phim Lẻ', isDropdown: false, prefix: 'danh-sach', slug: 'phim-le' },
    { title: 'Hoạt Hình', isDropdown: false, prefix: 'the-loai', slug: 'hoat-hinh' },
    { title: 'TV Shows', isDropdown: false, prefix: 'the-loai', slug: 'truyen-hinh-thuc-te' },
    { title: 'Subteam', isDropdown: false, prefix: 'danh-sach', slug: 'subteam' },
    { title: 'Thể loại', isDropdown: true, prefix: 'the-loai', items: genres },
    { title: 'Danh mục', isDropdown: true, prefix: 'danh-sach', items: getListCategories() },
    { title: 'Quốc gia', isDropdown: true, prefix: 'quoc-gia', items: countries },
    { title: 'Năm', isDropdown: true, prefix: 'nam', items: getYears() }
  ];
}

/**
 * 2.8 PLAYER INTERFACE (BẮT BUỘC): Dữ liệu các row và quick category buttons cho HomeScreen của Player
 */
async function getHome() {
  const homeSectionsConfig = [
    { title: "Phim Mới Cập Nhật", type: "danh-sach", slug: "phim-moi-cap-nhat" },
    { title: "Phim Bộ Nổi Bật", type: "danh-sach", slug: "phim-bo" },
    { title: "Phim Lẻ Hot", type: "danh-sach", slug: "phim-le" },
    { title: "Hoạt Hình Chọn Lọc", type: "the-loai", slug: "hoat-hinh" },
    { title: "TV Shows", type: "the-loai", slug: "truyen-hinh-thuc-te" },
    { title: "Phim Hàn Quốc", type: "quoc-gia", slug: "han-quoc" },
    { title: "Hành Động & Phiêu Lưu", type: "the-loai", slug: "action-adventure" }
  ];

  const sections = await Promise.all(
    homeSectionsConfig.map(async config => {
      const { rawItems, cdnDomain } = await crawlList(config.type, config.slug, 1);
      const items = rawItems.map(item => formatMovieItem(item, cdnDomain));
      return {
        title: config.title,
        type: config.type,
        slug: config.slug,
        items: items
      };
    })
  );

  return {
    sections: sections.filter(s => s.items.length > 0)
  };
}

/**
 * 2.9 PLAYER INTERFACE (BẮT BUỘC): Lấy danh sách phim phân trang & bộ lọc cho MovieListScreen của Player
 */
async function getList(type, slug, page = 1, filters = {}) {
  const LIMIT = 24;
  const { rawItems, pagination, cdnDomain } = await crawlList(type, slug, page, filters);
  const items = rawItems.map(item => formatMovieItem(item, cdnDomain));

  const perPage = Number(pagination.totalItemsPerPage) || LIMIT;
  const totalPages = pagination.totalPages
    ? Number(pagination.totalPages)
    : (pagination.totalItems ? Math.ceil(Number(pagination.totalItems) / perPage) : 1);

  return {
    items: items,
    page: page,
    hasNext: page < totalPages,
    totalPages: totalPages,
    totalItems: pagination.totalItems ? Number(pagination.totalItems) : items.length
  };
}

/**
 * 2.10 PLAYER INTERFACE (BẮT BUỘC): Tìm kiếm phim cho SearchScreen của Player
 */
async function search(keyword, page = 1) {
  const { rawItems, pagination, cdnDomain } = await crawlSearch(keyword, page);
  const items = rawItems.map(item => formatMovieItem(item, cdnDomain));
  const totalItems = pagination.totalItems || items.length;
  const totalPages = pagination.totalPages || Math.ceil(totalItems / 20) || 1;

  return {
    items: items,
    page: page,
    hasNext: page < totalPages
  };
}

/**
 * 2.11 PLAYER INTERFACE (BẮT BUỘC): Chi tiết phim & danh sách tập cho DetailScreen của Player
 */
async function getDetail(slug) {
  const { movie, episodes, pathImage } = await crawlDetail(slug);
  const cdnDomain = pathImage || getCdnDomain();

  const episodeServers = (episodes || []).map((server, sIdx) => {
    const cleanServerName = (server.server_name || `Server ${sIdx + 1}`)
      .replace(/[\r\n\t]+/g, ' ')
      .trim();

    return {
      serverName: cleanServerName || `Server ${sIdx + 1}`,
      episodes: (server.server_data || []).map((item, eIdx) => ({
        id: item.slug || `ep-${eIdx + 1}`,
        name: item.name || `Tập ${eIdx + 1}`,
        slug: item.slug || `tap-${eIdx + 1}`,
        number: eIdx + 1,
        serverName: cleanServerName || "Vietsub",
        data: {
          m3u8: item.link_m3u8 || item.m3u8 || item.file || "",
          embed: item.link_embed || item.embed || item.link || ""
        }
      }))
    };
  });

  return {
    slug: movie.slug,
    name: movie.name,
    originName: movie.origin_name || movie.name,
    thumbUrl: buildImageUrl(movie.thumb_url, cdnDomain),
    posterUrl: buildImageUrl(movie.poster_url || movie.thumb_url, cdnDomain),
    backdropUrl: buildImageUrl(movie.thumb_url, cdnDomain),
    year: movie.year ? parseInt(movie.year) : null,
    type: movie.type || "series",
    status: movie.status || "ongoing",
    quality: movie.quality || "HD",
    language: movie.lang || "Vietsub",
    duration: movie.time || "",
    currentEpisode: movie.episode_current || "",
    totalEpisodes: movie.episode_total || "",
    description: movie.content ? movie.content.replace(/<[^>]+>/g, '').trim() : "",
    actors: Array.isArray(movie.actor) ? movie.actor : [],
    directors: Array.isArray(movie.director) ? movie.director : [],
    genres: (movie.category || []).map(c => (typeof c === 'object' && c !== null ? c.name : String(c))),
    countries: (movie.country || []).map(c => (typeof c === 'object' && c !== null ? c.name : String(c))),
    rating: movie.tmdb?.vote_average ? parseFloat(movie.tmdb.vote_average) : null,
    tmdbId: movie.tmdb?.id ? String(movie.tmdb.id) : null,
    imdbId: movie.imdb?.id ? String(movie.imdb.id) : null,
    episodes: episodeServers
  };
}

/**
 * 2.12 HELPER (Embed HTML Fetcher): Tải nội dung trang embed với OkHttp timeout & proxy fallback
 */
async function fetchEmbedHtml(url) {
  const headers = {
    "User-Agent": DEFAULT_UA,
    "Referer": "https://vsmov.com/"
  };

  // 1. Thử fetch trực tiếp qua OkHttp bridge (timeout 6s)
  try {
    const res = await fetch(url, { headers, timeout: 6000 });
    if (res && (res.ok || res.status === 200)) {
      const text = await res.text();
      if (text && typeof text === 'string' && text.length > 500) {
        return text;
      }
    }
  } catch (e) {}

  // 2. Tầng dự phòng 1: Cloudflare Worker Proxy
  try {
    const cfUrl = CF_FALLBACK_PROXY + encodeURIComponent(url);
    const cfRes = await fetch(cfUrl, { headers, timeout: 6000 });
    if (cfRes && (cfRes.ok || cfRes.status === 200)) {
      const cfText = await cfRes.text();
      if (cfText && typeof cfText === 'string' && cfText.length > 500) {
        return cfText;
      }
    }
  } catch (e) {}

  // 3. Tầng dự phòng 2: Codetabs Proxy
  try {
    const ctUrl = CODETABS_PROXY + encodeURIComponent(url);
    const ctRes = await fetch(ctUrl, { headers, timeout: 6000 });
    if (ctRes && (ctRes.ok || ctRes.status === 200)) {
      const ctText = await ctRes.text();
      if (ctText && typeof ctText === 'string' && ctText.length > 500) {
        return ctText;
      }
    }
  } catch (e) {}

  return null;
}

/**
 * 2.13 HELPER (Nuvio Stream Extractor): Bóc tách luồng m3u8 HLS native & phụ đề trực tiếp từ VSMov
 * Áp dụng thuật toán bóc tách đa phương thức (5 tầng bóc tách + 2 tầng proxy fallback) từ Nuvio
 */
async function extractVsmovStream(embedUrl, existingM3u8) {
  if (existingM3u8 && String(existingM3u8).indexOf(".m3u8") >= 0) {
    return {
      m3u8: existingM3u8,
      subtitle: "",
      subtitles: []
    };
  }
  if (!embedUrl) {
    return { m3u8: "", subtitle: "", subtitles: [] };
  }

  let cleanEmbedUrl = String(embedUrl).trim();
  if (cleanEmbedUrl.startsWith("http://")) {
    cleanEmbedUrl = cleanEmbedUrl.replace("http://", "https://");
  }

  // Nếu embedUrl đã là link m3u8 trực tiếp
  if (cleanEmbedUrl.toLowerCase().indexOf(".m3u8") >= 0) {
    return {
      m3u8: cleanEmbedUrl,
      subtitle: "",
      subtitles: []
    };
  }

  const originMatch = cleanEmbedUrl.match(/^(https?:\/\/[^\/]+)/i);
  const origin = originMatch ? originMatch[1] : "https://vsmov.com";
  const hashMatch = cleanEmbedUrl.match(/\/video\/([a-zA-Z0-9_-]+)/i);

  // Dự phòng sẵn m3u8 và origin từ cấu trúc link embed: https://{host}/video/{hash}
  let fallbackM3u8 = "";
  let fallbackSub = "";
  if (hashMatch) {
    if (origin.indexOf("sv2") >= 0) {
      fallbackM3u8 = origin + "/video/" + hashMatch[1] + "/master-b2.m3u8";
      fallbackSub = origin + "/video/" + hashMatch[1] + "/subtitle.vtt";
    } else {
      fallbackM3u8 = origin + "/stream/" + hashMatch[1] + "/master.m3u8";
    }
  }

  const html = await fetchEmbedHtml(cleanEmbedUrl);

  if (!html) {
    return {
      m3u8: fallbackM3u8,
      subtitle: fallbackSub,
      subtitles: fallbackSub ? [{
        label: "Tiếng Việt",
        language: "vi",
        url: fallbackSub,
        format: "vtt",
        type: "vtt",
        default: true
      }] : []
    };
  }

  // 1. 🎯 BÓC TÁCH M3U8 (ĐA PHƯƠNG THỨC - ZERO PROXY)
  let m3u8 = "";

  // Cách 1: signedMasterUrl trong playerOptions (ƯU TIÊN HÀNG ĐẦU để có signature)
  const signedMatch = html.match(/signedMasterUrl\s*:\s*[`"']([^`"']+\.m3u8[^`"']*)[`"']/i)
    || html.match(/signedMasterUrl\s*:\s*[`"'](https?:\/\/[^`"']+)[`"']/i);
  if (signedMatch && signedMatch[1] && signedMatch[1].trim() !== "") {
    m3u8 = signedMatch[1].replace(/[\\`"']/g, "").trim();
  }

  // Cách 2: Tìm biến url = `...` hoặc url: `...` (ArtPlayer / Modern JS)
  if (!m3u8) {
    const varUrlMatch = html.match(/(?:const|let|var)?\s*url\s*[:=]\s*[`"']([^`"'\s]+\.m3u8[^`"'\s]*)[`"']/i);
    if (varUrlMatch && varUrlMatch[1]) {
      m3u8 = varUrlMatch[1].replace(/[\\`"']/g, "").trim();
    }
  }

  // Cách 3: Link trực tiếp .m3u8 trong script/HTML
  if (!m3u8) {
    const m3u8Match = html.match(/https?:\/\/[^"'`\s<>]+\.m3u8[^"'`\s<>]*/i);
    if (m3u8Match) {
      m3u8 = m3u8Match[0].replace(/[\\`"']/g, "").trim();
    }
  }

  // Cách 4: baseUrl + videoHash trong script
  if (!m3u8) {
    const baseUrlMatch = html.match(/baseUrl\s*=\s*[`"']([^`"']+)[`"']/i);
    const videoHashMatch = html.match(/videoHash\s*=\s*[`"']([^`"']+)[`"']/i);
    if (baseUrlMatch && videoHashMatch) {
      let bUrl = baseUrlMatch[1].replace(/\/+$/, "");
      if (bUrl.startsWith("http://")) bUrl = bUrl.replace("http://", "https://");
      m3u8 = bUrl + "/stream/" + videoHashMatch[1] + "/master.m3u8";
    }
  }

  // Cách 5: Fallback từ hash & origin
  if (!m3u8) {
    m3u8 = fallbackM3u8;
  }

  // Chuẩn hóa đường dẫn m3u8
  if (m3u8) {
    if (m3u8.startsWith("//")) {
      m3u8 = "https:" + m3u8;
    } else if (m3u8.startsWith("/")) {
      m3u8 = origin.replace(/\/+$/, "") + m3u8;
    } else if (m3u8.startsWith("http://")) {
      m3u8 = m3u8.replace("http://", "https://");
    }
  }

  // 2. 🎯 BÓC TÁCH PHỤ ĐỀ (SUBTITLES)
  const subtitles = [];

  // Cách 1: Parse mảng playerOptions.subtitles
  const subArrayMatch = html.match(/subtitles\s*:\s*(\[[\s\S]*?\])\s*,\s*(?:audios|thumb|linkVast|[a-zA-Z0-9_$]+\s*:)/i);
  if (subArrayMatch) {
    try {
      const items = JSON.parse(subArrayMatch[1]);
      if (Array.isArray(items)) {
        items.forEach(item => {
          if (!item || !item.url) return;
          let fullSubUrl = item.url.startsWith("http")
            ? item.url
            : (origin.replace(/\/+$/, "") + "/" + item.url.replace(/^\/+/, ""));
          if (fullSubUrl.startsWith("http://")) fullSubUrl = fullSubUrl.replace("http://", "https://");

          const code = String(item.code || "").toLowerCase();
          let label = "Tiếng Việt";
          let srclang = "vi";
          let isDefault = false;

          if (code === "vie" || code === "vi") {
            label = "Tiếng Việt";
            srclang = "vi";
            isDefault = true;
          } else if (code === "eng" || code === "en") {
            label = "Tiếng Anh";
            srclang = "en";
          } else if (code === "kor" || code === "ko") {
            label = "Tiếng Hàn";
            srclang = "ko";
          } else if (code === "chi" || code === "zho" || code === "zh") {
            label = "Tiếng Trung";
            srclang = "zh";
          } else if (code === "jpn" || code === "ja") {
            label = "Tiếng Nhật";
            srclang = "ja";
          } else if (code === "tha" || code === "th") {
            label = "Tiếng Thái";
            srclang = "th";
          } else {
            label = item.name || code.toUpperCase() || "Phụ đề";
            srclang = code.slice(0, 2) || "vi";
          }

          const cleanSubUrl = fullSubUrl.replace(/[\\`"']/g, "").trim();
          subtitles.push({
            label: label,
            language: srclang,
            url: cleanSubUrl,
            format: cleanSubUrl.endsWith(".srt") ? "srt" : "vtt",
            type: cleanSubUrl.endsWith(".srt") ? "srt" : "vtt",
            default: isDefault
          });
        });
      }
    } catch (e) {}
  }

  // Cách 2: Tìm biến subtitleUrl / subUrl = `...` (ArtPlayer style)
  if (subtitles.length === 0) {
    const subVarMatch = html.match(/(?:const|let|var)?\s*(?:subtitleUrl|subUrl)\s*[:=]\s*[`"']([^`"'\s]+\.(?:vtt|srt|json)[^`"'\s]*)[`"']/i);
    if (subVarMatch && subVarMatch[1]) {
      const rawUrl = subVarMatch[1].replace(/[\\`"']/g, "").trim();
      let fullSubUrl = rawUrl.startsWith("http")
        ? rawUrl
        : (origin.replace(/\/+$/, "") + "/" + rawUrl.replace(/^\/+/, ""));
      if (fullSubUrl.startsWith("http://")) fullSubUrl = fullSubUrl.replace("http://", "https://");
      const cleanSubUrl = fullSubUrl.replace(/[\\`"']/g, "").trim();
      subtitles.push({
        label: "Tiếng Việt",
        language: "vi",
        url: cleanSubUrl,
        format: cleanSubUrl.endsWith(".srt") ? "srt" : "vtt",
        type: cleanSubUrl.endsWith(".srt") ? "srt" : "vtt",
        default: true
      });
    }
  }

  // Cách 3: Regex fallback cho các trường url: "..."
  if (subtitles.length === 0) {
    const itemMatches = html.match(/["']?url["']?\s*:\s*[`"']([^`"']+\.(?:vtt|srt|json)[^`"']*)[`"']/gi);
    if (itemMatches) {
      itemMatches.forEach(mStr => {
        const uMatch = mStr.match(/[`"']([^`"']+\.(?:vtt|srt|json)[^`"']*)[`"']/);
        if (uMatch && uMatch[1]) {
          const rawUrl = uMatch[1].replace(/[\\`"']/g, "").trim();
          let fullSubUrl = rawUrl.startsWith("http")
            ? rawUrl
            : (origin.replace(/\/+$/, "") + "/" + rawUrl.replace(/^\/+/, ""));
          if (fullSubUrl.startsWith("http://")) fullSubUrl = fullSubUrl.replace("http://", "https://");
          const isVi = fullSubUrl.indexOf("vie") >= 0 || fullSubUrl.indexOf("vi.") >= 0 || fullSubUrl.indexOf("subtitle.vtt") >= 0;
          const cleanSubUrl = fullSubUrl.replace(/[\\`"']/g, "").trim();
          subtitles.push({
            label: isVi ? "Tiếng Việt" : "Phụ đề",
            language: "vi",
            url: cleanSubUrl,
            format: cleanSubUrl.endsWith(".srt") ? "srt" : "vtt",
            type: cleanSubUrl.endsWith(".srt") ? "srt" : "vtt",
            default: isVi
          });
        }
      });
    }
  }

  // Cách 4: Link phụ đề đơn lẻ (.vtt, .srt, .json)
  if (subtitles.length === 0) {
    const subMatch = html.match(/https?:\/\/[^"'`\s<>]+\.(?:vtt|srt|json)[^"'`\s<>]*/i)
      || html.match(/[`"'](https?:\/\/[^"'`\s<>]+\.(?:vtt|json))[`"']/i)
      || html.match(/[`"'](\/video\/[^"'`\s<>]+\/subtitle\/[^"'`\s<>]+\.vtt)[`"']/i);
    if (subMatch) {
      const rawUrl = (subMatch[1] || subMatch[0]).replace(/[\\`"']/g, "").trim();
      let fullSubUrl = rawUrl.startsWith("http")
        ? rawUrl
        : (origin.replace(/\/+$/, "") + "/" + rawUrl.replace(/^\/+/, ""));
      if (fullSubUrl.startsWith("http://")) fullSubUrl = fullSubUrl.replace("http://", "https://");
      const cleanSubUrl = fullSubUrl.replace(/[\\`"']/g, "").trim();
      subtitles.push({
        label: "Tiếng Việt",
        language: "vi",
        url: cleanSubUrl,
        format: cleanSubUrl.endsWith(".srt") ? "srt" : "vtt",
        type: cleanSubUrl.endsWith(".srt") ? "srt" : "vtt",
        default: true
      });
    }
  }

  // Cách 5: Fallback sv2 subtitle nếu có
  if (subtitles.length === 0 && fallbackSub) {
    subtitles.push({
      label: "Tiếng Việt",
      language: "vi",
      url: fallbackSub,
      format: "vtt",
      type: "vtt",
      default: true
    });
  }

  if (subtitles.length > 0 && !subtitles.some(s => s.default)) {
    subtitles[0].default = true;
  }

  const primarySub = (subtitles.find(s => s.default) || subtitles[0] || {}).url || "";

  return {
    m3u8: m3u8,
    subtitle: primarySub,
    subtitles: subtitles
  };
}

/**
 * 2.14 PLAYER INTERFACE (BẮT BUỘC): Luồng phát video trực tiếp cho ExoPlayer/Media3 của Player
 * Bóc tách đa phương thức theo chuẩn Nuvio Engine: trích xuất m3u8 HLS native & phụ đề WebVTT trực tiếp
 */
async function getStream(episodeData) {
  const data = (episodeData && episodeData.data) || {};
  const rawEmbed = data.embed || data.link_embed || (episodeData && episodeData.link_embed) || (episodeData && episodeData.embed) || "";
  const rawM3u8 = data.m3u8 || data.link_m3u8 || (episodeData && episodeData.link_m3u8) || (episodeData && episodeData.m3u8) || "";

  // 1. Thực hiện bóc tách luồng phát qua logic Nuvio extractVsmovStream
  const extracted = await extractVsmovStream(rawEmbed, rawM3u8);

  if (extracted && extracted.m3u8) {
    return {
      type: "m3u8",
      url: extracted.m3u8,
      headers: {
        "User-Agent": DEFAULT_UA,
        "Referer": "https://vsmov.com/",
        "Origin": "https://vsmov.com"
      },
      subtitles: extracted.subtitles || []
    };
  }

  // 2. Thử giải mã bằng thư viện Extractor trong QuickJS Sandbox (nếu có)
  if (rawEmbed && typeof globalThis !== 'undefined' && globalThis.extractors) {
    try {
      if (typeof globalThis.extractors.auto === 'function') {
        const resolved = await globalThis.extractors.auto(rawEmbed);
        if (resolved && resolved.url) {
          return {
            type: resolved.type || "m3u8",
            url: resolved.url,
            headers: resolved.headers || {
              "User-Agent": DEFAULT_UA,
              "Referer": "https://vsmov.com/",
              "Origin": "https://vsmov.com"
            },
            subtitles: resolved.subtitles || []
          };
        }
      }
    } catch (e) {
      // Fallback
    }
  }

  // 3. Dự phòng cuối cùng: WebView Player
  if (rawEmbed) {
    return {
      type: "embed",
      url: rawEmbed,
      headers: {
        "User-Agent": DEFAULT_UA,
        "Referer": "https://vsmov.com/",
        "Origin": "https://vsmov.com"
      },
      subtitles: []
    };
  }

  throw new Error(`VSMov: Không tìm thấy luồng phát cho tập ${(episodeData && episodeData.name) || ""}`);
}

/**
 * 2.13 PLAYER INTERFACE (TÙY CHỌN): Kiểm tra trạng thái hoạt động của nguồn VSMov
 */
async function checkHealth() {
  try {
    const start = Date.now();
    const res = await fetch(`${getBaseUrl()}/api/the-loai`);
    const latency = Date.now() - start;
    if (res.ok) {
      return { status: "ok", message: "Kết nối máy chủ VSMov ổn định", latencyMs: latency };
    }
    return { status: "degraded", message: `VSMov phản hồi mã ${res.status}`, latencyMs: latency };
  } catch (e) {
    return { status: "blocked", message: "Không thể kết nối đến máy chủ VSMov (có thể bị chặn mạng)", latencyMs: null };
  }
}

/**
 * 2.14 PLAYER INTERFACE (TÙY CHỌN): Cung cấp các thiết lập cấu hình của Plugin
 */
async function getSettings() {
  const currentBase = getBaseUrl();
  const currentCdn = getCdnDomain();
  return [
    {
      key: "base_url",
      title: "Tên miền API (Base URL)",
      description: "Thay đổi tên miền API khi vsmov.com bị nhà mạng chặn",
      type: "text",
      defaultValue: DEFAULT_BASE_URL,
      currentValue: currentBase
    },
    {
      key: "cdn_domain",
      title: "Tên miền CDN ảnh",
      description: "Tên miền tải ảnh poster/thumbnail",
      type: "text",
      defaultValue: DEFAULT_CDN,
      currentValue: currentCdn
    }
  ];
}

// ============================================================================
// EXPORT DEFAULT PLUGIN OBJECT
// ============================================================================
export default {
  id: "vsmov",
  name: "VSMov",
  version: "1.0.1",

  // ==========================================
  // NHÓM HÀM GIAO DIỆN BẮT BUỘC (MANDATORY)
  // ==========================================
  getHome,
  getMenu,
  getList,
  search,
  getDetail,
  getStream,

  // ==========================================
  // NHÓM HÀM GIAO DIỆN TÙY CHỌN (OPTIONAL)
  // ==========================================
  getFilters,
  getSettings,
  checkHealth,

  // ==========================================
  // CÁC HÀM METADATA BỔ TRỢ & EXTRACTOR
  // ==========================================
  getGenres,
  getCountries,
  getYears,
  getListCategories,
  extractVsmovStream
};
