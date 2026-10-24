// plugins/movie/film4k/plugin.js
// Film4k Provider for JKHX Player (https://film4k.net / https://fiml4k.fun)
// Tuân thủ kiến trúc phân tầng chuẩn & quy tắc phát triển trong PROJECT_RULES.md & README.md:
//   - Nhóm 1: Các hàm phục vụ crawl & bóc tách JSON API / HLS Stream từ nguồn Film4k (Crawler Layer)
//   - Nhóm 2: Các hàm phục vụ fill data lên JKHX Player (Player Contract Layer: Bắt buộc & Tùy chọn)
// Định danh thể loại: types = ["movie", "tv"], isAdult = false

// ============================================================================
// CẤU HÌNH & HẰNG SỐ NGUỒN FILM4K
// ============================================================================

/** Tên miền hoạt động ổn định (fiml4k.fun là mirror chính thức không bị chặn tại Việt Nam) */
const DEFAULT_PRIMARY_DOMAIN = "https://fiml4k.fun";
const FALLBACK_DOMAINS = [
  "https://fiml4k.fun",
  "https://film4k.net"
];

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const EMBED_USER_AGENT = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 Film4kEmbed/1.0";

// Polyfill an toàn cho QuickJS Sandbox nếu thiếu setTimeout / clearTimeout
if (typeof setTimeout === "undefined") {
  globalThis.setTimeout = function(fn) {
    if (typeof fn === "function") {
      try { fn(); } catch (e) {}
    }
    return { unref: function() {}, ref: function() {} };
  };
  globalThis.clearTimeout = function() {};
}

// Polyfill an toàn cho QuickJS Sandbox nếu thiếu URL
if (typeof URL === "undefined") {
  globalThis.URL = class URL {
    constructor(url, base) {
      let full = String(url || "");
      if (base && !full.startsWith("http://") && !full.startsWith("https://")) {
        full = String(base).replace(/\/+$/, "") + "/" + full.replace(/^\/+/, "");
      }
      this.href = full;
      const match = full.match(/^(https?:\/\/[^\/?#]+)?(\/[^?#]*)?(\?[^#]*)?(#.*)?$/i) || [];
      this.origin = match[1] || "";
      this.pathname = match[2] || "/";
      this.search = match[3] || "";
      this.hash = match[4] || "";
    }
    toString() { return this.href; }
  };
}

/**
 * Hiển thị Toast thông báo lỗi tới người dùng qua Native Bridge của Core Player
 */
function showToast(msg) {
  try {
    if (typeof globalThis !== "undefined" && globalThis.context?.ui?.showToast) {
      globalThis.context.ui.showToast(String(msg), false);
    }
  } catch (e) {
    console.warn("[Film4k toast error]", e);
  }
}

/**
 * Lấy Base Domain hiện hành: ưu tiên context storage -> CUSTOM_DOMAIN -> BASE_URL -> mặc định
 */
function getBaseUrl() {
  if (typeof globalThis !== "undefined") {
    const saved = globalThis.context?.storage?.get("film4k_domain");
    if (saved && saved.trim()) return saved.trim().replace(/\/+$/, "");
    if (globalThis.CUSTOM_DOMAIN && globalThis.CUSTOM_DOMAIN.trim()) {
      return globalThis.CUSTOM_DOMAIN.trim().replace(/\/+$/, "");
    }
    if (globalThis.BASE_URL && globalThis.BASE_URL.trim()) {
      return globalThis.BASE_URL.trim().replace(/\/+$/, "");
    }
  }
  return DEFAULT_PRIMARY_DOMAIN;
}

/**
 * Làm sạch chuỗi văn bản
 */
function cleanText(str) {
  if (!str) return "";
  return String(str)
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Trích xuất chuỗi đa ngôn ngữ ({ vi, en } hoặc string)
 */
function extractLocalized(val) {
  if (!val) return "";
  if (typeof val === "string") return cleanText(val);
  if (typeof val === "object") {
    return cleanText(val.vi || val.en || "");
  }
  return cleanText(String(val));
}

// ============================================================================
// NHÓM 1: CÁC HÀM CRAWLER & XỬ LÝ REST API (CRAWLER LAYER)
// ============================================================================

/**
 * Gọi HTTP GET với cơ chế tự động thử domain dự phòng nếu domain chính bị chặn
 */
async function apiGet(path) {
  const primaryDomain = getBaseUrl();
  const domainsToTry = [primaryDomain];

  // Thêm các domain dự phòng nếu chưa có trong danh sách
  for (const d of FALLBACK_DOMAINS) {
    if (!domainsToTry.includes(d)) domainsToTry.push(d);
  }

  let lastError = null;

  for (let i = 0; i < domainsToTry.length; i++) {
    const domain = domainsToTry[i];
    const fullUrl = domain + (path.startsWith("/") ? path : "/" + path);

    try {
      let res;
      if (typeof fetch === "function") {
        res = await fetch(fullUrl, {
          headers: {
            "User-Agent": USER_AGENT,
            "Accept": "application/json, text/plain, */*",
            "Referer": domain + "/"
          }
        });
      } else if (globalThis.context?.http?.get) {
        res = await globalThis.context.http.get(fullUrl, {
          "User-Agent": USER_AGENT,
          "Accept": "application/json, text/plain, */*",
          "Referer": domain + "/"
        });
      } else {
        throw new Error("Môi trường thiếu HTTP client");
      }

      if (!res) throw new Error("Phản hồi rỗng từ máy chủ");

      let json;
      if (typeof res.json === "function") {
        json = await res.json();
      } else if (res.body) {
        json = typeof res.body === "string" ? JSON.parse(res.body) : res.body;
      } else if (typeof res === "string") {
        json = JSON.parse(res);
      } else {
        json = res;
      }

      // Lưu lại domain hoạt động thành công
      if (i > 0 && typeof globalThis !== "undefined" && globalThis.context?.storage?.set) {
        try {
          globalThis.context.storage.set("film4k_domain", domain);
        } catch (e) {}
      }

      return { data: json, domain: domain };
    } catch (err) {
      lastError = err;
      console.warn(`[Film4k API error on ${domain}] ${path}:`, err.message || err);
      // Tiếp tục thử domain dự phòng tiếp theo
    }
  }

  // Đẩy toast thông báo lỗi cho người dùng
  const errMsg = lastError?.message || "Không thể kết nối máy chủ";
  showToast(`Lỗi kết nối Film4k: ${errMsg}`);
  throw lastError;
}

/**
 * Chuẩn hóa đối tượng phim từ API thành Card Item chuẩn MovieItem cho JKHX Player
 * BẮT BUỘC: phải có trường `name` và `slug` để tương thích 100% với Kotlin @Serializable MovieItem
 */
function mapCardItem(item, rank = null) {
  if (!item || !item.slug) return null;

  const slug = item.slug;
  const title = extractLocalized(item.title) || slug;
  const originName = (item.title && typeof item.title === "object" && item.title.en)
    ? cleanText(item.title.en)
    : title;

  // Ảnh poster TMDB
  let thumbUrl = "";
  if (item.poster) {
    if (typeof item.poster === "string") thumbUrl = item.poster;
    else if (typeof item.poster === "object") thumbUrl = item.poster.vi || item.poster.en || "";
  }
  if (!thumbUrl && item.backdrop) {
    thumbUrl = item.backdrop;
  }

  // Độ phân giải (4K, 2K, 1080p, 720p, SD)
  const quality = item.maxRes ? String(item.maxRes).toUpperCase() : "HD";

  // Nhãn thuyết minh / phụ đề
  let lang = "";
  if (item.viDub && item.viSubs) lang = "TM & Phụ Đề";
  else if (item.viDub) lang = "Thuyết Minh";
  else if (item.viSubs) lang = "Phụ Đề";

  // Nhãn số tập
  let episodeTag = "";
  if (item.mediaType === "tv") {
    if (item.epTotal) episodeTag = `Full ${item.epTotal}/${item.epTotal}`;
    else episodeTag = "Phim Bộ";
  } else {
    episodeTag = "Full";
  }

  // Điểm TMDB
  let score = null;
  if (typeof item.score === "number" && item.score > 0) {
    score = parseFloat(item.score.toFixed(1));
  }

  // Năm phát hành (số nguyên)
  let yearNum = null;
  if (typeof item.year === "number") yearNum = item.year;
  else if (item.year) yearNum = parseInt(item.year, 10) || null;

  // Dòng mô tả meta: Năm phát hành · Thể loại chính
  const metaParts = [];
  if (item.year) metaParts.push(String(item.year));
  if (item.genres) {
    const genresList = Array.isArray(item.genres) ? item.genres : (item.genres.vi || item.genres.en || []);
    if (Array.isArray(genresList) && genresList.length > 0) {
      metaParts.push(extractLocalized(genresList[0]));
    }
  }

  return {
    id: slug,
    slug: slug,
    name: title,        // BẮT BUỘC cho Kotlin MovieItem
    title: title,       // Tương thích ngược JS
    originName: originName,
    thumbUrl: thumbUrl,
    posterUrl: thumbUrl,
    year: yearNum,
    type: item.mediaType || "movie",
    quality: quality,
    language: lang || "Vietsub",
    category: metaParts.length > 1 ? metaParts[1] : (metaParts[0] || null),
    providerId: "film4k",
    episodeCurrent: episodeTag || null,
    rating: score,
    tmdbId: item.tmdbId ? String(item.tmdbId) : null,
    country: item.country ? extractLocalized(item.country) : null,
    score: score,
    episode: episodeTag,
    description: metaParts.join(" · "),
    rank: rank || undefined,
    mediaType: item.mediaType || "movie"
  };
}

/**
 * Chuẩn hóa danh sách Hero Banner
 * BẮT BUỘC: phải có trường `name` và `slug` để tương thích 100% với Kotlin @Serializable MovieItem
 */
function mapHeroBanner(heroList) {
  if (!Array.isArray(heroList) || heroList.length === 0) return [];

  return heroList.map(item => {
    const slug = item.slug;
    const title = extractLocalized(item.title) || slug;
    const originName = (item.title && typeof item.title === "object" && item.title.en)
      ? cleanText(item.title.en)
      : title;
    const backdrop = item.backdrop || (typeof item.poster === "string" ? item.poster : (item.poster?.vi || item.poster?.en || ""));
    const poster = typeof item.poster === "string" ? item.poster : (item.poster?.vi || item.poster?.en || backdrop);

    const genresList = Array.isArray(item.genres) ? item.genres : (item.genres?.vi || item.genres?.en || []);
    const genreNames = Array.isArray(genresList) ? genresList.map(g => extractLocalized(g)).filter(Boolean) : [];

    let yearNum = null;
    if (typeof item.year === "number") yearNum = item.year;
    else if (item.year) yearNum = parseInt(item.year, 10) || null;

    let score = null;
    if (typeof item.score === "number" && item.score > 0) {
      score = parseFloat(item.score.toFixed(1));
    }

    const lang = (item.viDub && item.viSubs)
      ? "TM & Phụ Đề"
      : (item.viDub ? "Thuyết Minh" : (item.viSubs ? "Phụ Đề" : "Vietsub"));

    return {
      id: slug,
      slug: slug,
      name: title,       // BẮT BUỘC cho Kotlin MovieItem
      title: title,      // Tương thích ngược JS
      originName: originName,
      thumbUrl: backdrop || poster,
      posterUrl: poster,
      backdropUrl: backdrop,
      description: extractLocalized(item.overview),
      year: yearNum,
      genres: genreNames,
      mediaType: item.mediaType || "movie",
      type: item.mediaType || "movie",
      quality: item.maxRes ? String(item.maxRes).toUpperCase() : "4K",
      language: lang,
      providerId: "film4k",
      rating: score
    };
  });
}

// ============================================================================
// NHÓM 2: PLAYER CONTRACT LAYER (JKHX PLAYER INTERFACE)
// ============================================================================

/**
 * 2.1 PLAYER INTERFACE (BẮT BUỘC): Trang chủ (HomeScreen)
 * Bao gồm Hero Banner, Top 10 hôm nay, Phim bộ/Phim lẻ mới cập nhật và các chuyên mục
 */
async function getHome() {
  const { data } = await apiGet("/api/home");

  if (!data) {
    showToast("Không tìm thấy dữ liệu trên trang chủ Film4k");
    throw new Error("Dữ liệu trang chủ Film4k rỗng");
  }

  const sections = [];

  // 1. Hero Banner trượt ngang (Section banner đầu tiên)
  if (Array.isArray(data.hero) && data.hero.length > 0) {
    const heroItems = mapHeroBanner(data.hero);
    if (heroItems.length > 0) {
      sections.push({
        title: "Nổi Bật",
        type: "banner",
        slug: "banner",
        items: heroItems
      });
    }
  }

  // 2. Top 10 hôm nay
  if (Array.isArray(data.top) && data.top.length > 0) {
    const topItems = data.top
      .map((item, idx) => mapCardItem(item, idx + 1))
      .filter(Boolean);

    if (topItems.length > 0) {
      sections.push({
        title: "Top 10 hôm nay",
        type: "horizontal",
        slug: "top-10",
        items: topItems
      });
    }
  }

  // 3. Phim bộ mới cập nhật
  if (Array.isArray(data.newSeries) && data.newSeries.length > 0) {
    const seriesItems = data.newSeries.map(item => mapCardItem(item)).filter(Boolean);
    if (seriesItems.length > 0) {
      sections.push({
        title: "Phim bộ mới cập nhật",
        type: "horizontal",
        slug: "phim-bo",
        items: seriesItems
      });
    }
  }

  // 4. Phim lẻ mới cập nhật
  if (Array.isArray(data.newMovies) && data.newMovies.length > 0) {
    const moviesItems = data.newMovies.map(item => mapCardItem(item)).filter(Boolean);
    if (moviesItems.length > 0) {
      sections.push({
        title: "Phim lẻ mới cập nhật",
        type: "horizontal",
        slug: "phim-le",
        items: moviesItems
      });
    }
  }

  // 5. Toàn bộ phim mới cập nhật (Grid)
  if (Array.isArray(data.list) && data.list.length > 0) {
    const listItems = data.list.map(item => mapCardItem(item)).filter(Boolean);
    if (listItems.length > 0) {
      sections.push({
        title: "Mới cập nhật",
        type: "grid",
        slug: "phim-moi",
        items: listItems
      });
    }
  }

  // Phân loại nhanh các danh mục lọc tiện ích
  const quickCategories = [
    { title: "💎 Phim 4K", type: "danh-sach", slug: "4k" },
    { title: "🎬 Phim Lẻ", type: "danh-sach", slug: "phim-le" },
    { title: "📺 Phim Bộ", type: "danh-sach", slug: "phim-bo" },
    { title: "🎙️ Thuyết Minh", type: "danh-sach", slug: "thuyet-minh" },
    { title: "📝 Phụ Đề", type: "danh-sach", slug: "phu-de" }
  ];

  return {
    sections: sections,
    quickCategories: quickCategories
  };
}

/**
 * 2.2 PLAYER INTERFACE (BẮT BUỘC): Menu điều hướng trên cùng của HomeScreen
 * Mục đầu tiên mang tên "Film4k" theo chỉ đạo bắt buộc của người dùng
 */
async function getMenu() {
  return [
    {
      title: "Film4k",
      slug: "home",
      isDropdown: false,
      type: "home"
    },
    {
      title: "Khám Phá",
      slug: "browse",
      isDropdown: false,
      type: "danh-sach"
    },
    {
      title: "Phim Lẻ",
      slug: "phim-le",
      isDropdown: false,
      type: "danh-sach"
    },
    {
      title: "Phim Bộ",
      slug: "phim-bo",
      isDropdown: false,
      type: "danh-sach"
    },
    {
      title: "Thể Loại",
      slug: "the-loai",
      isDropdown: true,
      type: "dropdown",
      children: [
        { title: "Action & Adventure", slug: "Action & Adventure", type: "the-loai" },
        { title: "Chương Trình Truyền Hình", slug: "Chương Trình Truyền Hình", type: "the-loai" },
        { title: "Kids", slug: "Kids", type: "the-loai" },
        { title: "Phim Bí Ẩn", slug: "Phim Bí Ẩn", type: "the-loai" },
        { title: "Phim Chiến Tranh", slug: "Phim Chiến Tranh", type: "the-loai" },
        { title: "Phim Chính Kịch", slug: "Phim Chính Kịch", type: "the-loai" },
        { title: "Phim Gia Đình", slug: "Phim Gia Đình", type: "the-loai" },
        { title: "Phim Giả Tượng", slug: "Phim Giả Tượng", type: "the-loai" },
        { title: "Phim Gây Cấn", slug: "Phim Gây Cấn", type: "the-loai" },
        { title: "Phim Hoạt Hình", slug: "Phim Hoạt Hình", type: "the-loai" },
        { title: "Phim Hài", slug: "Phim Hài", type: "the-loai" },
        { title: "Phim Hành Động", slug: "Phim Hành Động", type: "the-loai" },
        { title: "Phim Hình Sự", slug: "Phim Hình Sự", type: "the-loai" },
        { title: "Phim Khoa Học Viễn Tưởng", slug: "Phim Khoa Học Viễn Tưởng", type: "the-loai" },
        { title: "Phim Kinh Dị", slug: "Phim Kinh Dị", type: "the-loai" },
        { title: "Phim Lãng Mạn", slug: "Phim Lãng Mạn", type: "the-loai" },
        { title: "Phim Lịch Sử", slug: "Phim Lịch Sử", type: "the-loai" },
        { title: "Phim Miền Tây", slug: "Phim Miền Tây", type: "the-loai" },
        { title: "Phim Nhạc", slug: "Phim Nhạc", type: "the-loai" },
        { title: "Phim Phiêu Lưu", slug: "Phim Phiêu Lưu", type: "the-loai" },
        { title: "Phim Tài Liệu", slug: "Phim Tài Liệu", type: "the-loai" },
        { title: "Reality", slug: "Reality", type: "the-loai" },
        { title: "Sci-Fi & Fantasy", slug: "Sci-Fi & Fantasy", type: "the-loai" },
        { title: "Soap", slug: "Soap", type: "the-loai" },
        { title: "Talk", slug: "Talk", type: "the-loai" },
        { title: "War & Politics", slug: "War & Politics", type: "the-loai" }
      ]
    },
    {
      title: "Quốc Gia",
      slug: "quoc-gia",
      isDropdown: true,
      type: "dropdown",
      children: [
        { title: "Âu Mỹ", slug: "au-my", type: "quoc-gia" },
        { title: "Hàn Quốc", slug: "han-quoc", type: "quoc-gia" },
        { title: "Trung Quốc", slug: "trung-quoc", type: "quoc-gia" },
        { title: "Nhật Bản", slug: "nhat-ban", type: "quoc-gia" },
        { title: "Thái Lan", slug: "thai-lan", type: "quoc-gia" },
        { title: "Việt Nam", slug: "viet-nam", type: "quoc-gia" },
        { title: "Hồng Kông", slug: "hong-kong", type: "quoc-gia" },
        { title: "Đài Loan", slug: "dai-loan", type: "quoc-gia" },
        { title: "Ấn Độ", slug: "an-do", type: "quoc-gia" },
        { title: "Anh", slug: "anh", type: "quoc-gia" },
        { title: "Pháp", slug: "phap", type: "quoc-gia" },
        { title: "Khác", slug: "other", type: "quoc-gia" }
      ]
    },
    {
      title: "Độ Phân Giải",
      slug: "do-phan-giai",
      isDropdown: true,
      type: "dropdown",
      children: [
        { title: "4K UHD", slug: "4k", type: "danh-sach" },
        { title: "2K QHD", slug: "2k", type: "danh-sach" },
        { title: "1080p FHD", slug: "1080p", type: "danh-sach" },
        { title: "720p HD", slug: "720p", type: "danh-sach" },
        { title: "SD Tiêu Chuẩn", slug: "sd", type: "danh-sach" }
      ]
    },
    {
      title: "Âm Thanh",
      slug: "am-thanh",
      isDropdown: true,
      type: "dropdown",
      children: [
        { title: "Thuyết Minh", slug: "thuyet-minh", type: "danh-sach" },
        { title: "Phụ Đề (Vietsub)", slug: "phu-de", type: "danh-sach" },
        { title: "Cả Thuyết Minh & Phụ Đề", slug: "tm-pd", type: "danh-sach" }
      ]
    }
  ];
}

/**
 * 2.3 PLAYER INTERFACE (BẮT BUỘC): Danh sách phân trang và lọc phim (ListScreen)
 * Hỗ trợ đa hình chữ ký: getList(type, slug, page, filters) hoặc getList(slug, page)
 */
async function getList(arg1, arg2, arg3, arg4) {
  let type = "danh-sach";
  let slug = "browse";
  let page = 1;
  let filters = {};

  if (typeof arg1 === "string" && typeof arg2 === "number") {
    slug = arg1;
    page = arg2;
    filters = arg3 || {};
  } else if (typeof arg1 === "string" && typeof arg2 === "string") {
    type = arg1;
    slug = arg2;
    page = typeof arg3 === "number" ? arg3 : 1;
    filters = arg4 || {};
  } else if (typeof arg1 === "number") {
    page = arg1;
    filters = arg2 || {};
  }

  // Xây dựng tham số query cho REST API: /api/home?browse=1&...
  const params = new URLSearchParams();
  params.set("browse", "1");
  if (page > 1) {
    params.set("page", String(page));
  }

  // Phân loại theo slug
  if (slug === "phim-le") {
    params.set("type", "movie");
  } else if (slug === "phim-bo") {
    params.set("type", "tv");
  } else if (slug === "4k") {
    params.set("res", "4K");
  } else if (slug === "2k") {
    params.set("res", "2K");
  } else if (slug === "1080p") {
    params.set("res", "1080p");
  } else if (slug === "720p") {
    params.set("res", "720p");
  } else if (slug === "sd") {
    params.set("res", "SD");
  } else if (slug === "thuyet-minh" || slug === "tm") {
    params.set("track", "tm");
  } else if (slug === "phu-de" || slug === "pd") {
    params.set("track", "pd");
  } else if (slug === "tm-pd" || slug === "both") {
    params.set("track", "both");
  } else if (type === "the-loai" || filters.genre) {
    params.set("genre", filters.genre || slug);
  } else if (type === "quoc-gia" || filters.country) {
    params.set("country", filters.country || slug);
  }

  // Áp dụng filters bổ sung từ UI
  if (filters.type && !params.has("type")) params.set("type", filters.type);
  if (filters.genre && !params.has("genre")) params.set("genre", filters.genre);
  if (filters.country && !params.has("country")) params.set("country", filters.country);
  if (filters.year) params.set("year", filters.year);
  if (filters.res && !params.has("res")) params.set("res", filters.res);
  if (filters.track && !params.has("track")) params.set("track", filters.track);
  if (filters.sort) params.set("sort", filters.sort);

  const queryPath = `/api/home?${params.toString()}`;
  const { data } = await apiGet(queryPath);

  if (!data || !Array.isArray(data.list)) {
    return {
      items: [],
      page: page,
      totalPages: 1,
      totalItems: 0,
      hasMore: false,
      hasNext: false
    };
  }

  const items = data.list.map(item => mapCardItem(item)).filter(Boolean);
  const total = typeof data.total === "number" ? data.total : (items.length * page);
  const limit = 24;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasMore = data.more === true || page < totalPages;

  return {
    items: items,
    page: page,
    totalPages: totalPages,
    totalItems: total,
    hasMore: hasMore,
    hasNext: hasMore
  };
}

/**
 * 2.4 PLAYER INTERFACE (BẮT BUỘC): Tìm kiếm phim (SearchScreen)
 */
async function search(query, page = 1) {
  if (!query || !query.trim()) {
    return {
      items: [],
      page: 1,
      totalPages: 1,
      totalItems: 0,
      hasMore: false,
      hasNext: false
    };
  }

  const p = page > 1 ? page : 1;
  const queryPath = `/api/home?q=${encodeURIComponent(query.trim())}&page=${p}`;
  const { data } = await apiGet(queryPath);

  if (!data || !Array.isArray(data.list)) {
    return {
      items: [],
      page: p,
      totalPages: 1,
      totalItems: 0,
      hasMore: false,
      hasNext: false
    };
  }

  const items = data.list.map(item => mapCardItem(item)).filter(Boolean);
  const total = typeof data.total === "number" ? data.total : (items.length * p);
  const limit = 24;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasMore = data.more === true || p < totalPages;

  return {
    items: items,
    page: p,
    totalPages: totalPages,
    totalItems: total,
    hasMore: hasMore,
    hasNext: hasMore
  };
}

/**
 * 2.5 PLAYER INTERFACE (BẮT BUỘC): Chi tiết phim (DetailScreen)
 * Lấy siêu dữ liệu TMDB, danh sách tập theo đúng chuẩn kiến trúc JKHX Player:
 *   - CHỈ RENDER 1 SERVER CHUẨN (💎 VIP 4K), KHÔNG RENDER SERVER WEBVIEW TRÊN CHI TIẾT PHIM
 *   - Trường data của mỗi tập chứa Object { url, m3u8, embed } để PlayerScreen tự động kích hoạt Fallback WebView
 */
async function getDetail(movieSlug) {
  if (!movieSlug) throw new Error("movieSlug không hợp lệ");

  const cleanSlug = String(movieSlug)
    .replace(/^\/+/, "")
    .replace(/^movie\//, "")
    .replace(/^watch\//, "")
    .replace(/\/+$/, "");

  const { data, domain } = await apiGet(`/api/title/${encodeURIComponent(cleanSlug)}`);

  if (!data || !data.movie) {
    showToast("Không tìm thấy thông tin chi tiết phim trên Film4k");
    throw new Error(`Không tìm thấy phim: ${cleanSlug}`);
  }

  const m = data.movie;
  const title = extractLocalized(m.title) || cleanSlug;
  const originalTitle = m.title?.en || "";

  // Poster & Backdrop từ TMDB
  let thumbUrl = "";
  if (m.poster) {
    if (typeof m.poster === "string") thumbUrl = m.poster;
    else if (typeof m.poster === "object") thumbUrl = m.poster.vi || m.poster.en || "";
  }
  const backdropUrl = m.backdrop || thumbUrl;
  if (!thumbUrl && backdropUrl) thumbUrl = backdropUrl;

  const description = extractLocalized(m.overview);
  let yearNum = null;
  if (typeof m.year === "number") yearNum = m.year;
  else if (m.year) yearNum = parseInt(m.year, 10) || null;

  const score = typeof m.score === "number" && m.score > 0 ? parseFloat(m.score.toFixed(1)) : null;
  const quality = m.maxRes ? String(m.maxRes).toUpperCase() : "4K";

  // Thể loại
  const genresList = Array.isArray(m.genres) ? m.genres : (m.genres?.vi || m.genres?.en || []);
  const genres = Array.isArray(genresList) ? genresList.map(g => extractLocalized(g)).filter(Boolean) : [];

  // Quốc gia
  const country = extractLocalized(m.country) || (m.countryCode === "US" ? "Âu Mỹ" : m.countryCode || "");

  // Định danh TMDB để Core Player map đa nguồn phát
  const tmdbId = m.tmdbId ? String(m.tmdbId) : null;

  // Bóc tách danh sách tập & cấu hình Server phát chuẩn EpisodeServer của Kotlin
  const isMovie = m.mediaType === "movie" || !Array.isArray(data.episodes) || data.episodes.length === 0;
  const servers = [];

  if (isMovie) {
    // Phim lẻ: 1 server duy nhất với 1 tập Full
    const hlsPath = m.hlsUrl || "";
    const hlsFull = hlsPath ? (hlsPath.startsWith("http") ? hlsPath : `${domain}${hlsPath.startsWith("/") ? "" : "/"}${hlsPath}`) : "";
    const embedUrl = `${domain}/watch/${cleanSlug}?from=0`;

    servers.push({
      serverName: "💎 VIP 4K",
      name: "💎 VIP 4K",
      serverKey: "vip_4k",
      episodes: [
        {
          id: "full",
          name: "Full HD/4K",
          title: "Bản Đầy Đủ 4K",
          slug: "full",
          number: 1,
          season: 1,
          serverName: "💎 VIP 4K",
          data: {
            url: hlsFull,
            m3u8: hlsFull,
            embed: embedUrl
          }
        }
      ]
    });
  } else {
    // Phim bộ: 1 server duy nhất với danh sách tập đầy đủ
    const seriesEpisodes = [];

    data.episodes.forEach((ep, idx) => {
      const sIndex = ep.season || 1;
      const epNum = ep.episode || (idx + 1);
      const epId = `s${sIndex}-e${epNum}`;
      const epName = `Tập ${epNum}`;
      const epTitle = ep.title ? `Tập ${epNum}: ${ep.title}` : `Tập ${epNum} (Mùa ${sIndex})`;
      const sourceUrl = (Array.isArray(ep.sources) && ep.sources.length > 0 && ep.sources[0].url) ? ep.sources[0].url : "";
      const hlsFull = sourceUrl ? (sourceUrl.startsWith("http") ? sourceUrl : `${domain}${sourceUrl.startsWith("/") ? "" : "/"}${sourceUrl}`) : "";
      const embedUrl = `${domain}/watch/${cleanSlug}?from=0&s=${sIndex}&e=${epNum}`;

      seriesEpisodes.push({
        id: epId,
        name: epName,
        title: epTitle,
        slug: epId,
        number: epNum,
        season: sIndex,
        serverName: "💎 VIP 4K",
        data: {
          url: hlsFull,
          m3u8: hlsFull,
          embed: embedUrl
        }
      });
    });

    servers.push({
      serverName: "💎 VIP 4K",
      name: "💎 VIP 4K",
      serverKey: "vip_4k",
      episodes: seriesEpisodes
    });
  }

  const lang = (m.viDub && m.viSubs)
    ? "TM & Phụ Đề"
    : (m.viDub ? "Thuyết Minh" : (m.viSubs ? "Phụ Đề" : "Vietsub"));

  return {
    id: cleanSlug,
    slug: cleanSlug,
    name: title,        // BẮT BUỘC cho Kotlin MovieDetail
    title: title,       // Tương thích ngược JS
    originName: originalTitle || title,
    thumbUrl: thumbUrl,
    posterUrl: thumbUrl,
    backdropUrl: backdropUrl,
    description: description,
    year: yearNum,
    rating: score,
    score: score,
    quality: quality,
    language: lang,
    genres: genres,
    countries: country ? [country] : [],
    country: country,
    tmdbId: tmdbId,
    type: isMovie ? "single" : "series",
    status: isMovie ? "completed" : (m.epTotal ? "ongoing" : "completed"),
    currentEpisode: isMovie ? "Full" : (m.epTotal ? `Full ${m.epTotal}` : null),
    totalEpisodes: m.epTotal ? String(m.epTotal) : null,
    episodes: servers,  // BẮT BUỘC cho Kotlin MovieDetail
    servers: servers    // Tương thích ngược JS
  };
}

/**
 * 2.6 PLAYER INTERFACE (BẮT BUỘC): Lấy luồng phát video (PlayerScreen)
 * Kiểm tra tính toàn vẹn của playlist HLS: nếu rỗng (chưa transcode) tự động fallback sang embed
 * để PlayerScreen tự động kích hoạt WebView Player fallback mượt mà.
 */
async function getStream(episodeData) {
  if (!episodeData) throw new Error("episodeData không hợp lệ");

  const domain = getBaseUrl();
  let m3u8Url = "";
  let embedUrl = "";

  // 1. Phân giải linh hoạt tham số từ episodeData
  if (typeof episodeData === "object" && episodeData !== null) {
    const dataObj = (typeof episodeData.data === "object" && episodeData.data !== null)
      ? episodeData.data
      : (typeof episodeData.data === "string" && episodeData.data.startsWith("{")
          ? JSON.parse(episodeData.data)
          : episodeData);

    m3u8Url = dataObj.m3u8 || dataObj.url || "";
    embedUrl = dataObj.embed || "";

    if (!embedUrl && typeof episodeData.data === "string" && episodeData.data.includes("/watch/")) {
      embedUrl = episodeData.data;
    }
  } else if (typeof episodeData === "string") {
    if (episodeData.startsWith("{")) {
      try {
        const parsed = JSON.parse(episodeData);
        m3u8Url = parsed.m3u8 || parsed.url || "";
        embedUrl = parsed.embed || "";
      } catch (e) {}
    } else if (episodeData.includes("/api/hls/") || episodeData.includes(".m3u8")) {
      m3u8Url = episodeData;
    } else if (episodeData.includes("/watch/")) {
      embedUrl = episodeData;
    }
  }

  // Chuẩn hóa URL tuyệt đối
  if (m3u8Url && !m3u8Url.startsWith("http")) {
    m3u8Url = `${domain}${m3u8Url.startsWith("/") ? "" : "/"}${m3u8Url}`;
  }
  if (embedUrl && !embedUrl.startsWith("http")) {
    embedUrl = `${domain}${embedUrl.startsWith("/") ? "" : "/"}${embedUrl}`;
  }

  // 2. Kiểm tra tính hợp lệ của luồng m3u8 (tránh lỗi ERROR_CODE_PARSING_MANIFEST_MALFORMED do manifest rỗng)
  if (m3u8Url) {
    let isValidM3u8 = false;
    try {
      let testRes;
      if (typeof fetch === "function") {
        testRes = await fetch(m3u8Url, {
          headers: {
            "User-Agent": USER_AGENT,
            "Referer": domain + "/"
          }
        });
      } else if (globalThis.context?.http?.get) {
        testRes = await globalThis.context.http.get(m3u8Url, {
          "User-Agent": USER_AGENT,
          "Referer": domain + "/"
        });
      }

      if (testRes) {
        let content = "";
        if (typeof testRes.text === "function") {
          content = await testRes.text();
        } else if (typeof testRes.body === "string") {
          content = testRes.body;
        } else if (typeof testRes === "string") {
          content = testRes;
        }

        // Playlist HLS hợp lệ bắt buộc phải bắt đầu bằng #EXTM3U
        if (content && content.trim().startsWith("#EXTM3U")) {
          isValidM3u8 = true;
        }
      }
    } catch (e) {
      console.warn("[Film4k m3u8 check failed]", e.message);
    }

    if (isValidM3u8) {
      return {
        type: "m3u8",
        url: m3u8Url,
        headers: {
          "User-Agent": USER_AGENT,
          "Referer": domain + "/",
          "Origin": domain
        },
        fallbackUrl: embedUrl
      };
    }
  }

  // 3. Fallback sang WebView Player nếu m3u8 rỗng hoặc chưa sẵn sàng
  if (embedUrl) {
    return {
      type: "embed",
      url: embedUrl,
      headers: {
        "User-Agent": EMBED_USER_AGENT,
        "Referer": domain + "/"
      }
    };
  }

  // 4. Dự phòng khẩn cấp
  return {
    type: "embed",
    url: `${domain}/?from=0`,
    headers: {
      "User-Agent": EMBED_USER_AGENT,
      "Referer": domain + "/"
    }
  };
}

/**
 * 2.7 PLAYER INTERFACE (TÙY CHỌN): Bộ lọc tiêu chí cho ListScreen
 */
async function getFilters() {
  return [
    {
      id: "type",
      name: "Phân loại",
      options: [
        { name: "Tất cả", value: "" },
        { name: "Phim Lẻ", value: "movie" },
        { name: "Phim Bộ", value: "tv" }
      ]
    },
    {
      id: "res",
      name: "Độ phân giải",
      options: [
        { name: "Tất cả", value: "" },
        { name: "4K UHD", value: "4K" },
        { name: "2K QHD", value: "2K" },
        { name: "1080p FHD", value: "1080p" },
        { name: "720p HD", value: "720p" },
        { name: "SD Tiêu chuẩn", value: "SD" }
      ]
    },
    {
      id: "track",
      name: "Âm thanh / Phụ đề",
      options: [
        { name: "Tất cả", value: "" },
        { name: "Thuyết minh (TM)", value: "tm" },
        { name: "Phụ đề (PD)", value: "pd" },
        { name: "Cả TM & PD", value: "both" }
      ]
    },
    {
      id: "sort",
      name: "Sắp xếp",
      options: [
        { name: "Mới nhất", value: "" },
        { name: "Xem nhiều nhất", value: "views" },
        { name: "Điểm TMDB cao", value: "score" },
        { name: "Năm phát hành", value: "year" }
      ]
    },
    {
      id: "country",
      name: "Quốc gia",
      options: [
        { name: "Tất cả quốc gia", value: "" },
        { name: "Âu Mỹ", value: "au-my" },
        { name: "Hàn Quốc", value: "han-quoc" },
        { name: "Trung Quốc", value: "trung-quoc" },
        { name: "Nhật Bản", value: "nhat-ban" },
        { name: "Thái Lan", value: "thai-lan" },
        { name: "Việt Nam", value: "viet-nam" },
        { name: "Hồng Kông", value: "hong-kong" },
        { name: "Đài Loan", value: "dai-loan" },
        { name: "Ấn Độ", value: "an-do" },
        { name: "Anh", value: "anh" },
        { name: "Pháp", value: "phap" },
        { name: "Khác", value: "other" }
      ]
    },
    {
      id: "genre",
      name: "Thể loại",
      options: [
        { name: "Tất cả thể loại", value: "" },
        { name: "Action & Adventure", value: "Action & Adventure" },
        { name: "Chương Trình Truyền Hình", value: "Chương Trình Truyền Hình" },
        { name: "Kids", value: "Kids" },
        { name: "Phim Bí Ẩn", value: "Phim Bí Ẩn" },
        { name: "Phim Chiến Tranh", value: "Phim Chiến Tranh" },
        { name: "Phim Chính Kịch", value: "Phim Chính Kịch" },
        { name: "Phim Gia Đình", value: "Phim Gia Đình" },
        { name: "Phim Giả Tượng", value: "Phim Giả Tượng" },
        { name: "Phim Gây Cấn", value: "Phim Gây Cấn" },
        { name: "Phim Hoạt Hình", value: "Phim Hoạt Hình" },
        { name: "Phim Hài", value: "Phim Hài" },
        { name: "Phim Hành Động", value: "Phim Hành Động" },
        { name: "Phim Hình Sự", value: "Phim Hình Sự" },
        { name: "Phim Khoa Học Viễn Tưởng", value: "Phim Khoa Học Viễn Tưởng" },
        { name: "Phim Kinh Dị", value: "Phim Kinh Dị" },
        { name: "Phim Lãng Mạn", value: "Phim Lãng Mạn" },
        { name: "Phim Lịch Sử", value: "Phim Lịch Sử" },
        { name: "Phim Miền Tây", value: "Phim Miền Tây" },
        { name: "Phim Nhạc", value: "Phim Nhạc" },
        { name: "Phim Phiêu Lưu", value: "Phim Phiêu Lưu" },
        { name: "Phim Tài Liệu", value: "Phim Tài Liệu" },
        { name: "Reality", value: "Reality" },
        { name: "Sci-Fi & Fantasy", value: "Sci-Fi & Fantasy" },
        { name: "Soap", value: "Soap" },
        { name: "Talk", value: "Talk" },
        { name: "War & Politics", value: "War & Politics" }
      ]
    },
    {
      id: "year",
      name: "Năm phát hành",
      options: [
        { name: "Tất cả các năm", value: "" },
        { name: "2026", value: "2026" },
        { name: "2025", value: "2025" },
        { name: "2024", value: "2024" },
        { name: "2023", value: "2023" },
        { name: "2022", value: "2022" },
        { name: "2021", value: "2021" },
        { name: "2020", value: "2020" },
        { name: "2019", value: "2019" },
        { name: "2015-2018", value: "2015-2018" },
        { name: "2010-2014", value: "2010-2014" },
        { name: "Trước 2010", value: "<2010" }
      ]
    }
  ];
}

/**
 * 2.8 PLAYER INTERFACE (TÙY CHỌN): Cấu hình plugin
 */
async function getSettings() {
  const currentDomain = getBaseUrl();
  return [
    {
      key: "film4k_domain",
      title: "Tên miền máy chủ Film4k",
      description: "Tên miền dự phòng khi nhà mạng chặn truy cập film4k.net (Mặc định: https://fiml4k.fun)",
      type: "select",
      defaultValue: DEFAULT_PRIMARY_DOMAIN,
      value: currentDomain
      // options: [
      //   { label: "fiml4k.fun (Khuyên dùng - Không bị chặn)", value: "https://fiml4k.fun" },
      //   { label: "film4k.net (Tên miền gốc)", value: "https://film4k.net" }
      // ]
    }
  ];
}

/**
 * 2.9 PLAYER INTERFACE (TÙY CHỌN): Kiểm tra tình trạng kết nối máy chủ
 */
async function checkHealth() {
  const domain = getBaseUrl();
  const startTime = Date.now();
  try {
    const { data } = await apiGet("/api/home");
    const latency = Date.now() - startTime;
    const ok = !!(data && (data.list || data.top));
    return {
      ok: ok,
      latency: latency,
      message: ok ? `Kết nối máy chủ Film4k (${domain}) hoàn hảo (${latency}ms)` : `Máy chủ trả về dữ liệu rỗng (${domain})`
    };
  } catch (e) {
    const latency = Date.now() - startTime;
    return {
      ok: false,
      latency: latency,
      message: `Không thể kết nối đến máy chủ Film4k (${domain}): ${e.message || "Timeout"}`
    };
  }
}

// Xuất các hàm công khai cho QuickJS-NG Sandbox
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getHome,
    getMenu,
    getList,
    search,
    getDetail,
    getStream,
    getFilters,
    getSettings,
    checkHealth
  };
}
