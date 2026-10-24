// plugins/kkphim/plugin.js
// KKPhim Provider for JKHX Player using PhimAPI (phimapi.com)
// Tuân thủ kiến trúc phân tầng chuẩn mới nhất:
//   - Nhóm 1: Các hàm phục vụ crawl dữ liệu từ nguồn PhimAPI (Crawler / Source API Layer)
//   - Nhóm 2: Các hàm phục vụ fill data lên JKHX Player (Player Contract Layer: Bắt buộc & Tùy chọn)

// ============================================================================
// CẤU HÌNH & HẰNG SỐ NGUỒN PHIMAPI
// ============================================================================
const DEFAULT_BASE_URL = "https://phimapi.com";
const DEFAULT_CDN = "https://phimimg.com";

/**
 * Lấy Base URL linh hoạt: ưu tiên context storage -> CUSTOM_DOMAIN -> mặc định
 */
function getBaseUrl() {
  if (typeof globalThis !== 'undefined') {
    const savedDomain = globalThis.context?.storage?.get("base_url");
    if (savedDomain && savedDomain.trim()) return savedDomain.trim();
    if (globalThis.CUSTOM_DOMAIN && globalThis.CUSTOM_DOMAIN.trim()) return globalThis.CUSTOM_DOMAIN.trim();
    if (globalThis.BASE_URL && globalThis.BASE_URL.trim()) return globalThis.BASE_URL.trim();
  }
  return DEFAULT_BASE_URL;
}

/**
 * Lấy CDN URL linh hoạt
 */
function getCdnDomain() {
  if (typeof globalThis !== 'undefined') {
    const savedCdn = globalThis.context?.storage?.get("cdn_domain");
    if (savedCdn && savedCdn.trim()) return savedCdn.trim();
  }
  return DEFAULT_CDN;
}

const KNOWN_SLUG_MAP = {
  // Danh mục danh sách
  "phim-moi": { type: "danh-sach", slug: "phim-moi" },
  "phim-moi-cap-nhat": { type: "films", slug: "phim-moi-cap-nhat-v3" },
  "phim-moi-cap-nhat-v3": { type: "films", slug: "phim-moi-cap-nhat-v3" },
  "phim-bo": { type: "danh-sach", slug: "phim-bo" },
  "phim-le": { type: "danh-sach", slug: "phim-le" },
  "hoat-hinh": { type: "danh-sach", slug: "hoat-hinh" },
  "phim-chieu-rap": { type: "danh-sach", slug: "phim-chieu-rap" },
  "phim-vietsub": { type: "danh-sach", slug: "phim-vietsub" },
  "phim-thuyet-minh": { type: "danh-sach", slug: "phim-thuyet-minh" },
  "phim-long-tieng": { type: "danh-sach", slug: "phim-long-tieng" },
  "phim-bo-dang-chieu": { type: "danh-sach", slug: "phim-bo-dang-chieu" },
  "phim-bo-hoan-thanh": { type: "danh-sach", slug: "phim-bo-hoan-thanh" },
  "tv-shows": { type: "danh-sach", slug: "tv-shows" },
  "shows": { type: "danh-sach", slug: "tv-shows" },
  "subteam": { type: "danh-sach", slug: "subteam" },

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
  "kinh-di": { type: "the-loai", slug: "kinh-di" },
  "hanh-dong": { type: "the-loai", slug: "hanh-dong" },
  "tinh-cam": { type: "the-loai", slug: "tinh-cam" },
  "hai-huoc": { type: "the-loai", slug: "hai-huoc" },
  "vien-tuong": { type: "the-loai", slug: "vien-tuong" },
  "tam-ly": { type: "the-loai", slug: "tam-ly" },
  "co-trang": { type: "the-loai", slug: "co-trang" },
  "chien-tranh": { type: "the-loai", slug: "chien-tranh" },
  "hinh-su": { type: "the-loai", slug: "hinh-su" },
  "vo-thuat": { type: "the-loai", slug: "vo-thuat" },
  "tai-lieu": { type: "the-loai", slug: "tai-lieu" },
  "bi-an": { type: "the-loai", slug: "bi-an" },
  "tre-em": { type: "the-loai", slug: "tre-em" },
  "chinh-kich": { type: "the-loai", slug: "chinh-kich" },
  "gia-dinh": { type: "the-loai", slug: "gia-dinh" },
  "hoc-duong": { type: "the-loai", slug: "hoc-duong" },
  "am-nhac": { type: "the-loai", slug: "am-nhac" },
  "phieu-luu": { type: "the-loai", slug: "phieu-luu" },
  "than-thoai": { type: "than-thoai", slug: "than-thoai" },
  "khoa-hoc": { type: "the-loai", slug: "khoa-hoc" },
  "the-thao": { type: "the-loai", slug: "the-thao" },
  "phim-18": { type: "the-loai", slug: "phim-18" }
};

// ============================================================================
// NHÓM 1: CÁC HÀM CRAWL DỮ LIỆU TỪ NGUỒN PHIMAPI (phimapi.com)
// ============================================================================

/**
 * 1.1 HELPER: Ghép link ảnh trực tiếp với CDN
 */
function buildImageUrl(path, cdnDomain = getCdnDomain()) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const cleanPath = path.replace(/^\/+/, '');
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

  return { type: resolvedType, slug: resolvedSlug };
}

/**
 * 1.5 CRAWLER: Lấy danh sách thể loại từ PhimAPI
 */
async function crawlGenres() {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/v1/api/the-loai`);
    const json = await res.json();
    const items = json.data?.items || json.data || json || [];
    if (Array.isArray(items) && items.length > 0) {
      return items.map(i => ({ name: i.name, slug: i.slug }));
    }
  } catch (e) {
    // Fallback nếu API nguồn lỗi
  }
  return [
    { name: 'Bí Ẩn', slug: 'bi-an' }, { name: 'Khoa Học', slug: 'khoa-hoc' }, { name: 'Thể Thao', slug: 'the-thao' },
    { name: 'Chiến Tranh', slug: 'chien-tranh' }, { name: 'Kinh Dị', slug: 'kinh-di' }, { name: 'Trẻ Em', slug: 'tre-em' },
    { name: 'Chính Kịch', slug: 'chinh-kich' }, { name: 'Kinh Điển', slug: 'kinh-dien' }, { name: 'Tài Liệu', slug: 'tai-lieu' },
    { name: 'Cổ Trang', slug: 'co-trang' }, { name: 'Lịch Sử', slug: 'lich-su' }, { name: 'Tâm Lý', slug: 'tam-ly' },
    { name: 'Gia Đình', slug: 'gia-dinh' }, { name: 'Miền Tây', slug: 'mien-tay' }, { name: 'Tình Cảm', slug: 'tinh-cam' },
    { name: 'Hài Hước', slug: 'hai-huoc' }, { name: '18+', slug: 'phim-18' }, { name: 'Viễn Tưởng', slug: 'vien-tuong' },
    { name: 'Hành Động', slug: 'hanh-dong' }, { name: 'Short Drama', slug: 'phim-ngan' }, { name: 'Võ Thuật', slug: 'vo-thuat' },
    { name: 'Hình Sự', slug: 'hinh-su' }, { name: 'Phiêu Lưu', slug: 'phieu-luu' }, { name: 'Âm Nhạc', slug: 'am-nhac' },
    { name: 'Học Đường', slug: 'hoc-duong' }, { name: 'Thần Thoại', slug: 'than-thoai' }
  ];
}

/**
 * 1.6 CRAWLER: Lấy danh sách quốc gia từ PhimAPI
 */
async function crawlCountries() {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/v1/api/quoc-gia`);
    const json = await res.json();
    const items = json.data?.items || json.data || json || [];
    if (Array.isArray(items) && items.length > 0) {
      return items.map(i => ({ name: i.name, slug: i.slug }));
    }
  } catch (e) {
    // Fallback nếu API nguồn lỗi
  }
  return [
    { name: 'Trung Quốc', slug: 'trung-quoc' }, { name: 'Hàn Quốc', slug: 'han-quoc' }, { name: 'Nhật Bản', slug: 'nhat-ban' },
    { name: 'Thái Lan', slug: 'thai-lan' }, { name: 'Âu Mỹ', slug: 'au-my' }, { name: 'Pháp', slug: 'phap' },
    { name: 'Quốc Gia Khác', slug: 'quoc-gia-khac' }, { name: 'Đài Loan', slug: 'dai-loan' }, { name: 'Hồng Kông', slug: 'hong-kong' },
    { name: 'Ấn Độ', slug: 'an-do' }, { name: 'Indonesia', slug: 'indonesia' }, { name: 'Philippines', slug: 'philippines' },
    { name: 'Ý', slug: 'y' }, { name: 'Singapore', slug: 'singapore' }, { name: 'Việt Nam', slug: 'viet-nam' }
  ];
}

/**
 * 1.7 CRAWLER: Lấy ảnh chất lượng cao từ TMDB
 */
async function crawlMovieImages(slug, fallbackThumb, fallbackPoster) {
  if (!slug) return { thumb_url: fallbackThumb, poster_url: fallbackPoster };
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/v1/api/phim/${slug}/images`);
    const json = await res.json();
    if (json.status_code === 200 && json.data && json.data.images) {
      const images = json.data.images;
      const sizes = json.data.image_sizes;
      const backdrop = images.find(i => i.type === 'backdrop');
      const poster = images.find(i => i.type === 'poster');

      let thumb_url = fallbackThumb;
      let poster_url = fallbackPoster;

      if (backdrop && sizes?.backdrop?.original) {
        thumb_url = `${sizes.backdrop.original}${backdrop.file_path}`;
      }
      if (poster && sizes?.poster?.original) {
        poster_url = `${sizes.poster.original}${poster.file_path}`;
      } else if (backdrop && sizes?.backdrop?.original) {
        poster_url = thumb_url;
      }
      return { thumb_url, poster_url };
    }
  } catch (e) {
    // fallback
  }
  return { thumb_url: fallbackThumb, poster_url: fallbackPoster };
}

/**
 * 1.8 CRAWLER: Lấy danh sách phim theo phân loại, phân trang và bộ lọc từ PhimAPI
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

    if (hasFilterCategory && targetType === "the-loai") {
      targetSlug = filters.category.trim();
    } else if (hasFilterCountry && targetType === "quoc-gia") {
      targetSlug = filters.country.trim();
    } else if (hasFilterYear && targetType === "nam") {
      targetSlug = filters.year.trim();
    }

    let url = "";
    if (targetType === "films" || targetSlug.includes("phim-moi-cap-nhat-v3")) {
      url = `${base}/danh-sach/${targetSlug}?page=${page}`;
    } else {
      const queryParams = {
        page: page,
        limit: LIMIT,
        sort_field: filters?.sort_field || "modified.time",
        sort_type: filters?.sort_type || "desc"
      };

      if (filters?.sort_lang) {
        queryParams.sort_lang = filters.sort_lang;
      }
      if (hasFilterCategory && targetType !== "the-loai") {
        queryParams.category = filters.category.trim();
      }
      if (hasFilterCountry && targetType !== "quoc-gia") {
        queryParams.country = filters.country.trim();
      }
      if (hasFilterYear && targetType !== "nam") {
        queryParams.year = filters.year.trim();
      }

      const qs = buildQueryString(queryParams);
      if (targetSlug === "phim-moi" || (targetType === "danh-sach" && !targetSlug)) {
        url = `${base}/v1/api/danh-sach?${qs}`;
      } else {
        const apiPrefix = targetType === "danh-sach" ? "danh-sach" : targetType;
        url = `${base}/v1/api/${apiPrefix}/${targetSlug}?${qs}`;
      }
    }

    const res = await fetch(url);
    const text = await res.text();
    if (text.trim().startsWith("<")) {
      return { rawItems: [], pagination: {}, cdnDomain: getCdnDomain() };
    }

    const data = JSON.parse(text);
    const rawItems = data.data?.items || data.items || [];
    const pagination = data.data?.params?.pagination || data.pagination || {};
    const cdnDomain = data.data?.APP_DOMAIN_CDN_IMAGE || data.data?.pathImage || data.pathImage || getCdnDomain();

    return { rawItems, pagination, cdnDomain };
  } catch (e) {
    return { rawItems: [], pagination: {}, cdnDomain: getCdnDomain() };
  }
}

/**
 * 1.9 CRAWLER: Tìm kiếm phim theo từ khoá từ PhimAPI
 */
async function crawlSearch(keyword, page = 1) {
  try {
    const base = getBaseUrl();
    const qs = buildQueryString({
      keyword: keyword,
      page: page,
      limit: 24
    });
    const url = `${base}/v1/api/tim-kiem?${qs}`;
    const res = await fetch(url);
    const text = await res.text();
    if (text.trim().startsWith("<")) {
      return { rawItems: [], pagination: {}, cdnDomain: getCdnDomain() };
    }

    const data = JSON.parse(text);
    const rawItems = data.data?.items || [];
    const pagination = data.data?.params?.pagination || {};
    const cdnDomain = data.data?.APP_DOMAIN_CDN_IMAGE || data.data?.pathImage || data.pathImage || getCdnDomain();

    return { rawItems, pagination, cdnDomain };
  } catch (e) {
    return { rawItems: [], pagination: {}, cdnDomain: getCdnDomain() };
  }
}

/**
 * 1.10 CRAWLER: Lấy thông tin chi tiết phim & danh sách tập từ PhimAPI
 */
async function crawlDetail(slug) {
  const base = getBaseUrl();
  const url = `${base}/phim/${slug}`;
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok || text.trim().startsWith("<")) {
    throw new Error(`KKPhim: Không tìm thấy dữ liệu cho phim ${slug}`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`KKPhim: Dữ liệu API không hợp lệ cho phim ${slug}`);
  }

  if (!data.status || !data.movie) {
    throw new Error(`KKPhim: Không tìm thấy dữ liệu cho phim ${slug}`);
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
 * 2.1 HELPER: Chuẩn hoá item raw từ PhimAPI thành MovieItem của JKHX Player
 */
function formatMovieItem(item, cdnDomain = getCdnDomain()) {
  let epCurrent = item.episode_current;
  if (typeof epCurrent === "string") {
    epCurrent = epCurrent.trim();
  } else {
    epCurrent = null;
  }

  // Nếu epCurrent thiếu hoặc là "Tập mới", thử trích xuất từ last_episodes
  if ((!epCurrent || epCurrent.toLowerCase() === "tập mới" || epCurrent.toLowerCase() === "tap moi") &&
      Array.isArray(item.last_episodes) && item.last_episodes.length > 0) {
    const last = item.last_episodes[0];
    if (last && typeof last.name === "string" && last.name.trim()) {
      epCurrent = last.name.trim();
    }
  }

  // Tuyệt đối không giữ chuỗi "Tập mới"
  if (epCurrent && (epCurrent.toLowerCase() === "tập mới" || epCurrent.toLowerCase() === "tap moi")) {
    epCurrent = null;
  }

  return {
    slug: item.slug,
    name: item.name,
    originName: item.origin_name || item.name,
    thumbUrl: buildImageUrl(item.thumb_url, cdnDomain),
    posterUrl: buildImageUrl(item.poster_url || item.thumb_url, cdnDomain),
    year: item.year ? parseInt(item.year) : null,
    type: item.type || "single",
    quality: item.quality || "HD",
    language: item.lang || "Vietsub",
    category: extractFirstCategory(item),
    providerId: "kkphim",
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
  return [
    { name: 'Phim Mới', slug: 'phim-moi' },
    { name: 'Phim Bộ', slug: 'phim-bo' },
    { name: 'Phim Lẻ', slug: 'phim-le' },
    { name: 'Hoạt Hình', slug: 'hoat-hinh' },
    { name: 'Phim Chiếu Rạp', slug: 'phim-chieu-rap' },
    { name: 'TV Shows', slug: 'tv-shows' },
    { name: 'Phim Vietsub', slug: 'phim-vietsub' },
    { name: 'Phim Thuyết Minh', slug: 'phim-thuyet-minh' },
    { name: 'Phim Lồng Tiếng', slug: 'phim-long-tieng' },
    { name: 'Phim Bộ Đang Chiếu', slug: 'phim-bo-dang-chieu' },
    { name: 'Phim Bộ Hoàn Thành', slug: 'phim-bo-hoan-thanh' },
    { name: 'Subteam', slug: 'subteam' }
  ];
}

/**
 * 2.4 METADATA: Danh sách sắp xếp
 */
function getSorts() {
  return [
    { name: "Mới cập nhật", slug: "modified.time" },
    { name: "Năm phát hành", slug: "year" },
    { name: "Mới đăng lên", slug: "_id" }
  ];
}

function getSortTypes() {
  return [
    { name: "Giảm dần", slug: "desc" },
    { name: "Tăng dần", slug: "asc" }
  ];
}

/**
 * 2.5 PLAYER INTERFACE: Lấy danh sách thể loại cho Player
 */
async function getGenres() {
  return await crawlGenres();
}

/**
 * 2.6 PLAYER INTERFACE: Lấy danh sách quốc gia cho Player
 */
async function getCountries() {
  return await crawlCountries();
}

/**
 * 2.7 PLAYER INTERFACE (TÙY CHỌN): Cấu trúc bộ lọc tổng hợp cho MovieListScreen của Player
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
    sortFields: getSorts(),
    sortTypes: getSortTypes()
  };
}

/**
 * 2.8 PLAYER INTERFACE (BẮT BUỘC): Cấu trúc menu trên cùng cho HomeScreen của Player
 * (Gồm các tab trực tiếp và các menu dạng dropdown: Thể loại, Danh sách, Quốc gia, Năm)
 */
async function getMenu() {
  const [genres, countries] = await Promise.all([
    crawlGenres(),
    crawlCountries()
  ]);

  return [
    { title: 'KK Cập Nhật', isDropdown: false, prefix: 'films', slug: 'phim-moi-cap-nhat-v3' },
    { title: 'Phim Bộ', isDropdown: false, prefix: 'danh-sach', slug: 'phim-bo' },
    { title: 'Phim Lẻ', isDropdown: false, prefix: 'danh-sach', slug: 'phim-le' },
    { title: 'Hoạt Hình', isDropdown: false, prefix: 'danh-sach', slug: 'hoat-hinh' },
    { title: 'Thể loại', isDropdown: true, prefix: 'the-loai', items: genres },
    { title: 'KK Danh Sách', isDropdown: true, prefix: 'danh-sach', items: getListCategories() },
    { title: 'Quốc gia', isDropdown: true, prefix: 'quoc-gia', items: countries },
    { title: 'Năm', isDropdown: true, prefix: 'nam', items: getYears() }
  ];
}

/**
 * 2.9 PLAYER INTERFACE (BẮT BUỘC): Dữ liệu các row và quick category buttons cho HomeScreen của Player
 */
async function getHome() {
  const homeSectionsConfig = [
    { title: "Phim Mới Cập Nhật", type: "danh-sach", slug: "phim-moi" },
    { title: "Phim Hàn Quốc", type: "quoc-gia", slug: "han-quoc" },
    { title: "Phim Chiếu Rạp", type: "danh-sach", slug: "phim-chieu-rap" },
    { title: "Phim Kinh Dị", type: "the-loai", slug: "kinh-di" },
    { title: "Phim Bộ", type: "danh-sach", slug: "phim-bo" },
    { title: "Phim Lẻ", type: "danh-sach", slug: "phim-le" },
    { title: "Hoạt Hình", type: "danh-sach", slug: "hoat-hinh" }
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
 * 2.10 PLAYER INTERFACE (BẮT BUỘC): Lấy danh sách phim phân trang & bộ lọc cho MovieListScreen của Player
 */
async function getList(type, slug, page = 1, filters = {}) {
  const LIMIT = 24;
  const { rawItems, pagination, cdnDomain } = await crawlList(type, slug, page, filters);
  const items = rawItems.map(item => formatMovieItem(item, cdnDomain));

  const totalPages = pagination.totalPages
    ? Number(pagination.totalPages)
    : (pagination.totalItems ? Math.ceil(Number(pagination.totalItems) / LIMIT) : 1);

  return {
    items: items,
    page: page,
    hasNext: page < totalPages,
    totalPages: totalPages,
    totalItems: pagination.totalItems ? Number(pagination.totalItems) : items.length
  };
}

/**
 * 2.11 PLAYER INTERFACE (BẮT BUỘC): Tìm kiếm phim cho SearchScreen của Player
 */
async function search(keyword, page = 1) {
  const { rawItems, pagination, cdnDomain } = await crawlSearch(keyword, page);
  const items = rawItems.map(item => formatMovieItem(item, cdnDomain));
  const totalItems = pagination.totalItems || 0;
  const totalPages = Math.ceil(totalItems / 24) || 1;

  return {
    items: items,
    page: page,
    hasNext: page < totalPages
  };
}

/**
 * 2.12 PLAYER INTERFACE (BẮT BUỘC): Chi tiết phim & danh sách tập cho DetailScreen của Player
 */
async function getDetail(slug) {
  const { movie, episodes, pathImage } = await crawlDetail(slug);
  const cdnDomain = pathImage || getCdnDomain();
  const oldThumb = buildImageUrl(movie.thumb_url, cdnDomain);
  const oldPoster = buildImageUrl(movie.poster_url || movie.thumb_url, cdnDomain);
  const images = await crawlMovieImages(slug, oldThumb, oldPoster);

  const episodeServers = (episodes || []).map((server, sIdx) => ({
    serverName: server.server_name || `Server ${sIdx + 1}`,
    episodes: (server.server_data || []).map((item, eIdx) => ({
      id: item.slug || `ep-${eIdx + 1}`,
      name: item.name || `Tập ${eIdx + 1}`,
      slug: item.slug || `tap-${eIdx + 1}`,
      number: eIdx + 1,
      serverName: server.server_name || "Vietsub",
      data: {
        m3u8: item.link_m3u8 || "",
        embed: item.link_embed || ""
      }
    }))
  }));

  return {
    slug: movie.slug,
    name: movie.name,
    originName: movie.origin_name || movie.name,
    thumbUrl: images.thumb_url,
    posterUrl: images.poster_url,
    backdropUrl: images.thumb_url,
    year: movie.year ? parseInt(movie.year) : null,
    type: movie.type || "series",
    status: movie.status || "ongoing",
    quality: movie.quality || "HD",
    language: movie.lang || "Vietsub",
    duration: movie.time || "",
    currentEpisode: movie.episode_current || "",
    totalEpisodes: movie.episode_total || "",
    description: movie.content ? movie.content.replace(/<[^>]+>/g, '').trim() : "",
    actors: movie.actor || [],
    directors: movie.director || [],
    genres: (movie.category || []).map(c => c.name),
    countries: (movie.country || []).map(c => c.name),
    rating: movie.tmdb?.vote_average || null,
    tmdbId: movie.tmdb?.id ? String(movie.tmdb.id) : null,
    imdbId: movie.imdb?.id ? String(movie.imdb.id) : null,
    episodes: episodeServers
  };
}

/**
 * 2.13 PLAYER INTERFACE (BẮT BUỘC): Luồng phát video trực tiếp cho ExoPlayer/Media3 của Player
 * Hỗ trợ tự động giải mã link embed qua thư viện Extractor trong QuickJS Sandbox trước khi fallback
 */
async function getStream(episodeData) {
  const data = episodeData.data || {};

  // 1. Luồng phát HLS (m3u8) trực tiếp
  if (data.m3u8) {
    return {
      type: "m3u8",
      url: data.m3u8,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": `${getBaseUrl()}/`
      },
      subtitles: []
    };
  }

  // 2. Link player Embed: Thử giải mã bằng thư viện Extractor trong QuickJS Sandbox
  if (data.embed) {
    if (typeof globalThis !== 'undefined' && globalThis.extractors) {
      try {
        if (typeof globalThis.extractors.auto === 'function') {
          const resolved = await globalThis.extractors.auto(data.embed);
          if (resolved && resolved.url) {
            return {
              type: resolved.type || "m3u8",
              url: resolved.url,
              headers: resolved.headers || {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": `${getBaseUrl()}/`
              },
              subtitles: resolved.subtitles || []
            };
          }
        }
      } catch (e) {
        // Fallback về embed nếu không giải mã được
      }
    }

    return {
      type: "embed",
      url: data.embed,
      headers: {},
      subtitles: []
    };
  }

  throw new Error(`KKPhim: Không tìm thấy luồng phát cho tập ${episodeData.name}`);
}

/**
 * 2.14 PLAYER INTERFACE (TÙY CHỌN): Kiểm tra trạng thái hoạt động của nguồn PhimAPI
 */
async function checkHealth() {
  try {
    const start = Date.now();
    const res = await fetch(`${getBaseUrl()}/v1/api/the-loai`);
    const latency = Date.now() - start;
    if (res.ok) {
      return { status: "ok", message: "Kết nối máy chủ PhimAPI ổn định", latencyMs: latency };
    }
    return { status: "degraded", message: `PhimAPI phản hồi mã ${res.status}`, latencyMs: latency };
  } catch (e) {
    return { status: "blocked", message: "Không thể kết nối đến máy chủ PhimAPI (có thể bị chặn mạng)", latencyMs: null };
  }
}

/**
 * 2.15 PLAYER INTERFACE (TÙY CHỌN): Cung cấp các thiết lập cấu hình của Plugin
 */
async function getSettings() {
  const currentBase = getBaseUrl();
  const currentCdn = getCdnDomain();
  return [
    {
      key: "base_url",
      title: "Tên miền API (Base URL)",
      description: "Thay đổi tên miền API khi phimapi.com bị nhà mạng chặn",
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
  id: "kkphim",
  name: "KKPhim",
  version: "1.0.2",

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
  // CÁC HÀM METADATA BỔ TRỢ
  // ==========================================
  getGenres,
  getCountries,
  getYears,
  getListCategories,
  getSorts,
  getSortTypes
};
