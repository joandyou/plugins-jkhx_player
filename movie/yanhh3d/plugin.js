// plugins/movie/yanhh3d/plugin.js
// YanHH3D Provider for JKHX Player (yanhh3d.chat)
// Hoạt Hình Trung Quốc 3D/4K/2D Thuyết Minh & Vietsub
// Tuân thủ kiến trúc phân tầng chuẩn & quy tắc phát triển trong PROJECT_RULES.md:
//   - Nhóm 1: Các hàm phục vụ crawl & phân giải luồng từ nguồn YanHH3D (Crawler Layer)
//   - Nhóm 2: Các hàm phục vụ fill data lên JKHX Player (Player Contract Layer: Bắt buộc & Tùy chọn)
// Định danh thể loại: types = ["movie", "tv"], isAdult = false

// ============================================================================
// CẤU HÌNH & HẰNG SỐ NGUỒN YANHH3D
// ============================================================================
const DEFAULT_DOMAIN = "https://yanhh3d.chat";
const DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Polyfill an toàn cho QuickJS Sandbox nếu thiếu setTimeout
if (typeof setTimeout === "undefined") {
  globalThis.setTimeout = function(fn) {
    if (typeof fn === "function") {
      try { fn(); } catch (e) {}
    }
    return { unref: function() {}, ref: function() {} };
  };
  globalThis.clearTimeout = function() {};
}

/**
 * Lấy Web Domain linh hoạt: ưu tiên context storage -> CUSTOM_DOMAIN -> mặc định
 */
function getDomain() {
  if (typeof globalThis !== "undefined") {
    const saved = globalThis.context?.storage?.get("yanhh3d_domain");
    if (saved && saved.trim()) return saved.trim().replace(/\/+$/, "");
    if (globalThis.CUSTOM_DOMAIN && globalThis.CUSTOM_DOMAIN.trim()) return globalThis.CUSTOM_DOMAIN.trim().replace(/\/+$/, "");
    if (globalThis.BASE_URL && globalThis.BASE_URL.trim()) return globalThis.BASE_URL.trim().replace(/\/+$/, "");
  }
  return DEFAULT_DOMAIN;
}

/**
 * HTTP Client tiện ích cho QuickJS Sandbox
 */
async function httpGet(url, customHeaders = {}) {
  const headers = {
    "User-Agent": DEFAULT_UA,
    "Referer": `${getDomain()}/`,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "vi,en-US;q=0.9,en;q=0.8",
    ...customHeaders
  };

  const response = await fetch(url, { method: "GET", headers });
  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers || {},
    body: text
  };
}

/**
 * Dữ liệu hạt nhân dự phòng (Seed Data từ DevTools)
 */
const SEED_MOVIES = [
  {
    slug: "dau-la-dai-luc-2-tuyet-the-duong-mon",
    name: "Đấu La Đại Lục 2 - Tuyệt Thế Đường Môn",
    originName: "Soul Land 2: The Unrivaled Tang Sect",
    thumbUrl: "https://yanhh3d.chat/storage/movies/dau-la-dai-luc-2-tuyet-the-duong-mon-1787905335.png",
    posterUrl: "https://yanhh3d.chat/storage/movies/dau-la-dai-luc-2-tuyet-the-duong-mon-1787905335.png",
    year: 2023,
    type: "tv",
    status: "ongoing",
    quality: "4K TM-VS",
    currentEpisode: "175/182 [4K]"
  },
  {
    slug: "thuong-nguyen-do",
    name: "Thương Nguyên Đồ",
    originName: "The Demon Hunter",
    thumbUrl: "https://yanhh3d.chat/storage/movies/thuong-nguyen-do-1784281032.jpg",
    posterUrl: "https://yanhh3d.chat/storage/movies/thuong-nguyen-do-1784281032.jpg",
    year: 2023,
    type: "tv",
    status: "ongoing",
    quality: "4K TM-VS",
    currentEpisode: "99/124 [4K]"
  },
  {
    slug: "dai-chua-te-3d",
    name: "Đại Chúa Tể 3D",
    originName: "The Great Ruler 3D",
    thumbUrl: "https://yanhh3d.chat/storage/movies/dai-chua-te-3d-1780629293.jpg",
    posterUrl: "https://yanhh3d.chat/storage/movies/dai-chua-te-3d-1780629293.jpg",
    year: 2023,
    type: "tv",
    status: "ongoing",
    quality: "4K TM-VS",
    currentEpisode: "95/104 [4K]"
  },
  {
    slug: "tru-tien-thuyet-minh",
    name: "Tru Tiên",
    originName: "Jade Dynasty",
    thumbUrl: "https://yanhh3d.chat/storage/movies/tru-tien-full-1787205032.png",
    posterUrl: "https://yanhh3d.chat/storage/movies/tru-tien-full-1787205032.png",
    year: 2022,
    type: "tv",
    status: "ongoing",
    quality: "4K TM-VS",
    currentEpisode: "89/104 [4K]"
  },
  {
    slug: "pham-nhan-tu-tien",
    name: "Phàm Nhân Tu Tiên",
    originName: "A Record of a Mortal's Journey to Immortality",
    thumbUrl: "https://yanhh3d.chat/storage/movies/pham-nhan-tu-tien-1782552683.jpg",
    posterUrl: "https://yanhh3d.chat/storage/movies/pham-nhan-tu-tien-1782552683.jpg",
    year: 2020,
    type: "tv",
    status: "ongoing",
    quality: "4K TM-VS",
    currentEpisode: "Trailer 196/... Trưa T7"
  },
  {
    slug: "quan-am-chi-ngoai",
    name: "Quang Âm Chi Ngoại",
    originName: "Beyond the Time",
    thumbUrl: "https://yanhh3d.chat/storage/movies/quang-am-chi-ngoai-1791597856.jpg",
    posterUrl: "https://yanhh3d.chat/storage/movies/quang-am-chi-ngoai-1791597856.jpg",
    year: 2024,
    type: "tv",
    status: "ongoing",
    quality: "4K TM-VS",
    currentEpisode: "Trailer 44/78 Trưa T7"
  },
  {
    slug: "dau-pha-thuong-khung-phan-5-thuyet-minh-new",
    name: "Đấu Phá Thương Khung Phần 5-6",
    originName: "Battle Through the Heavens Season 5",
    thumbUrl: "https://yanhh3d.chat/storage/movies/dau-pha-thuong-khung-phan-5-6-1791693464.jpg",
    posterUrl: "https://yanhh3d.chat/storage/movies/dau-pha-thuong-khung-phan-5-6-1791693464.jpg",
    year: 2022,
    type: "tv",
    status: "ongoing",
    quality: "4K TM-VS",
    currentEpisode: "Trailer 215/219 Tối T7"
  },
  {
    slug: "tien-nghich",
    name: "Tiên Nghịch",
    originName: "Renegade Immortal",
    thumbUrl: "https://yanhh3d.chat/storage/movies/tien-nghich-1791744294.png",
    posterUrl: "https://yanhh3d.chat/storage/movies/tien-nghich-1791744294.png",
    year: 2023,
    type: "tv",
    status: "ongoing",
    quality: "4K TM-VS",
    currentEpisode: "162/180 [4K]"
  },
  {
    slug: "gia-thien",
    name: "Già Thiên",
    originName: "Shrouding the Heavens",
    thumbUrl: "https://yanhh3d.chat/storage/movies/gia-thien-1782129259.jpg",
    posterUrl: "https://yanhh3d.chat/storage/movies/gia-thien-1782129259.jpg",
    year: 2023,
    type: "tv",
    status: "ongoing",
    quality: "4K TM-VS",
    currentEpisode: "185/208 [4K]"
  },
  {
    slug: "thon-phe-tinh-khong",
    name: "Thôn Phệ Tinh Không",
    originName: "Swallowed Star",
    thumbUrl: "https://yanhh3d.chat/storage/movies/thon-phe-tinh-khong-1782129200.jpg",
    posterUrl: "https://yanhh3d.chat/storage/movies/thon-phe-tinh-khong-1782129200.jpg",
    year: 2020,
    type: "tv",
    status: "ongoing",
    quality: "4K TM-VS",
    currentEpisode: "245/260 [4K]"
  }
];

// ============================================================================
// NHÓM 1: CÁC HÀM PARSER NGUỒN YANHH3D (CRAWLER LAYER)
// ============================================================================

/**
 * Trích xuất thuộc tính HTML an toàn bằng Regex
 */
function extractAttr(htmlTag, attrName) {
  const reg = new RegExp(`${attrName}\\s*=\\s*["']([^"']+)["']`, "i");
  const match = htmlTag.match(reg);
  return match ? match[1] : "";
}

/**
 * Loại bỏ thẻ HTML và khoảng trắng thừa
 */
function cleanText(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Phân tích danh sách MovieItem từ chuỗi HTML dạng .flw-item
 */
function parseFlwItems(html) {
  const items = [];
  const flwBlocks = html.split(/<div\s+class=["'][^"']*flw-item[^"']*["']/i);

  for (let i = 1; i < flwBlocks.length; i++) {
    const block = flwBlocks[i].split(/<\/div>\s*<\/div>\s*<div\s+class=["']clearfix["']/i)[0] || flwBlocks[i];

    // 1. Lấy link và slug
    const aMatch = block.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*film-poster-ahref[^"']*["'][^>]*>/i)
      || block.match(/<h3\s+class=["']film-name["']>\s*<a\s+[^>]*href=["']([^"']+)["'][^>]*>/i);
    if (!aMatch) continue;

    const href = aMatch[1];
    let slug = href.replace(/^https?:\/\/[^\/]+/, "").replace(/^\/+/, "").replace(/\/+$/, "");

    // 2. Lấy tiêu đề
    let name = "";
    const nameMatch = block.match(/<h3\s+class=["']film-name["'][^>]*>([\s\S]*?)<\/h3>/i);
    if (nameMatch) {
      name = cleanText(nameMatch[1]);
    } else {
      const titleAttr = extractAttr(aMatch[0], "title");
      if (titleAttr) name = cleanText(titleAttr);
    }
    if (!name) {
      const h4Match = block.match(/<h4>([\s\S]*?)<\/h4>/i);
      if (h4Match) name = cleanText(h4Match[1]);
    }
    if (!name) continue;

    // 3. Lấy ảnh thumbnail / poster
    let thumbUrl = "";
    const imgMatch = block.match(/<img\s+[^>]*class=["'][^"']*film-poster-img[^"']*["'][^>]*>/i)
      || block.match(/<img\s+[^>]*>/i);
    if (imgMatch) {
      thumbUrl = extractAttr(imgMatch[0], "data-src") || extractAttr(imgMatch[0], "src");
      if (thumbUrl && thumbUrl.startsWith("/")) {
        thumbUrl = `${getDomain()}${thumbUrl}`;
      }
    }

    // 4. Lấy episode badge và quality
    let currentEpisode = "";
    const tickRateMatch = block.match(/<div\s+class=["'][^"']*tick-rate[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (tickRateMatch) {
      currentEpisode = cleanText(tickRateMatch[1]);
    }

    let quality = "HD";
    const tickDubMatch = block.match(/<div\s+class=["'][^"']*tick-dub[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (tickDubMatch) {
      quality = cleanText(tickDubMatch[1]);
    }

    items.push({
      slug: slug,
      name: name,
      originName: "",
      thumbUrl: thumbUrl,
      posterUrl: thumbUrl,
      year: 2024,
      type: "tv",
      status: "ongoing",
      quality: quality,
      currentEpisode: currentEpisode
    });
  }

  return items;
}

/**
 * Phân tích danh sách MovieItem từ sidebar #top-viewed-day .item-top
 */
function parseTopItems(html) {
  const items = [];
  const topBlocks = html.split(/<li\s+class=["'][^"']*item-top[^"']*["']/i);

  for (let i = 1; i < topBlocks.length; i++) {
    const block = topBlocks[i].split(/<\/li>/i)[0];

    const aMatch = block.match(/<h3\s+class=["']film-name["']>\s*<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!aMatch) continue;

    const href = aMatch[1];
    const name = cleanText(aMatch[2]);
    const slug = href.replace(/^https?:\/\/[^\/]+/, "").replace(/^\/+/, "").replace(/\/+$/, "");

    let thumbUrl = "";
    const imgMatch = block.match(/<img\s+[^>]*>/i);
    if (imgMatch) {
      thumbUrl = extractAttr(imgMatch[0], "data-src") || extractAttr(imgMatch[0], "src");
      if (thumbUrl && thumbUrl.startsWith("/")) {
        thumbUrl = `${getDomain()}${thumbUrl}`;
      }
    }

    let currentEpisode = "";
    const fdiMatch = block.match(/<span\s+class=["']fdi-item["'][^>]*>([\s\S]*?)<\/span>/i);
    if (fdiMatch) {
      currentEpisode = cleanText(fdiMatch[1]);
    }

    items.push({
      slug: slug,
      name: name,
      originName: "",
      thumbUrl: thumbUrl,
      posterUrl: thumbUrl,
      year: 2024,
      type: "tv",
      status: "ongoing",
      quality: "Full HD 4K",
      currentEpisode: currentEpisode
    });
  }

  return items;
}

// ============================================================================
// NHÓM 2: CÁC HÀM GIAO DIỆN CHUẨN JKHX PLAYER (PLAYER CONTRACT LAYER)
// ============================================================================

/**
 * 2.1 PLAYER INTERFACE (BẮT BUỘC): Trang chủ
 * Tải đồng thời các chuyên mục phong phú và gán slug để người dùng bấm xem phân trang
 */
async function getHome() {
  try {
    const [pHome, p3D, p4K, pOngoing, pAI] = await Promise.allSettled([
      httpGet(getDomain()),
      httpGet(`${getDomain()}/hoat-hinh-3d`),
      httpGet(`${getDomain()}/hoat-hinh-4k`),
      httpGet(`${getDomain()}/dang-chieu`),
      httpGet(`${getDomain()}/hoat-hinh-ai`)
    ]);

    const homeHtml = pHome.status === "fulfilled" && pHome.value.status === 200 ? pHome.value.body : "";
    const html3D = p3D.status === "fulfilled" && p3D.value.status === 200 ? p3D.value.body : "";
    const html4K = p4K.status === "fulfilled" && p4K.value.status === 200 ? p4K.value.body : "";
    const htmlOngoing = pOngoing.status === "fulfilled" && pOngoing.value.status === 200 ? pOngoing.value.body : "";
    const htmlAI = pAI.status === "fulfilled" && pAI.value.status === 200 ? pAI.value.body : "";

    const sections = [];

    // Section 1: Top Thịnh Hành Slider
    let trendingItems = [];
    if (homeHtml) {
      const trendingMatch = homeHtml.match(/<div\s+class=["'][^"']*trending-list[^"']*["'][\s\S]*?<\/section>/i);
      if (trendingMatch) trendingItems = parseFlwItems(trendingMatch[0]);
    }
    if (trendingItems.length > 0) {
      sections.push({
        title: "🔥 Top Thịnh Hành",
        type: "banner",
        items: trendingItems
      });
    }

    // Section 2: Mới Cập Nhật Grid (có slug /moi-cap-nhat để mở phân trang)
    let latestItems = [];
    if (homeHtml) {
      const latestMatch = homeHtml.match(/<div\s+class=["']block_area-content block_area-list film_list film_list-grid\s*["'][\s\S]*?<\/div>\s*<\/div>\s*<div\s+class=["']d-block["']/i);
      if (latestMatch) {
        latestItems = parseFlwItems(latestMatch[0]);
      } else {
        latestItems = parseFlwItems(homeHtml);
      }
    }
    if (latestItems.length > 0) {
      sections.push({
        title: "✨ Mới Cập Nhật",
        type: "grid",
        slug: "/moi-cap-nhat",
        items: latestItems
      });
    }

    // Section 3: Hoạt Hình 3D (có slug /hoat-hinh-3d để mở phân trang)
    let items3D = [];
    if (html3D) items3D = parseFlwItems(html3D);
    if (items3D.length > 0) {
      sections.push({
        title: "⚔️ Hoạt Hình 3D",
        type: "horizontal",
        slug: "/hoat-hinh-3d",
        items: items3D.slice(0, 16)
      });
    }

    // Section 4: Hoạt Hình 4K Siêu Nét (có slug /hoat-hinh-4k để mở phân trang)
    let items4K = [];
    if (html4K) items4K = parseFlwItems(html4K);
    if (items4K.length > 0) {
      sections.push({
        title: "💎 Hoạt Hình 4K Siêu Nét",
        type: "horizontal",
        slug: "/hoat-hinh-4k",
        items: items4K.slice(0, 16)
      });
    }

    // Section 5: Hoạt Hình Đang Chiếu (có slug /dang-chieu để mở phân trang)
    let itemsOngoing = [];
    if (htmlOngoing) itemsOngoing = parseFlwItems(htmlOngoing);
    if (itemsOngoing.length > 0) {
      sections.push({
        title: "⚡ Hoạt Hình Đang Chiếu",
        type: "horizontal",
        slug: "/dang-chieu",
        items: itemsOngoing.slice(0, 16)
      });
    }

    // Section 6: Hoạt Hình AI Độc Quyền (có slug /hoat-hinh-ai để mở phân trang)
    let itemsAI = [];
    if (htmlAI) itemsAI = parseFlwItems(htmlAI);
    if (itemsAI.length > 0) {
      sections.push({
        title: "🤖 Hoạt Hình AI Độc Quyền",
        type: "horizontal",
        slug: "/hoat-hinh-ai",
        items: itemsAI.slice(0, 16)
      });
    }

    // Section 7: Bảng Xếp Hạng Sidebar
    let topItems = [];
    if (homeHtml) {
      const topMatch = homeHtml.match(/<div\s+id=["']top-viewed-day["'][\s\S]*?<\/div>/i);
      if (topMatch) topItems = parseTopItems(topMatch[0]);
    }
    if (topItems.length > 0) {
      sections.push({
        title: "🏆 Bảng Xếp Hạng",
        type: "horizontal",
        items: topItems
      });
    }

    if (sections.length > 0) {
      return { sections };
    }
  } catch (e) {
    console.error("[YanHH3D getHome Error]:", e.message);
  }

  // Fallback: Sử dụng Seed Data hạt nhân dự phòng
  return {
    sections: [
      {
        title: "🔥 Top Thịnh Hành",
        type: "banner",
        items: SEED_MOVIES.slice(0, 5)
      },
      {
        title: "✨ Mới Cập Nhật",
        type: "grid",
        slug: "/moi-cap-nhat",
        items: SEED_MOVIES
      }
    ]
  };
}

/**
 * 2.2 PLAYER INTERFACE (BẮT BUỘC): Menu danh mục
 * Yêu cầu riêng: Menu Trang chủ đổi tên thành "YanHH3d" để dễ nhận diện plugin
 */
async function getMenu() {
  return [
    { id: "home", title: "YanHH3d", slug: "/" },
    { id: "latest", title: "Mới Cập Nhật", slug: "/moi-cap-nhat" },
    { id: "3d", title: "Hoạt Hình 3D", slug: "/hoat-hinh-3d" },
    { id: "4k", title: "Hoạt Hình 4K", slug: "/hoat-hinh-4k" },
    { id: "2d", title: "Hoạt Hình 2D", slug: "/hoat-hinh-2d" },
    { id: "ai", title: "Hoạt Hình AI", slug: "/hoat-hinh-ai" },
    { id: "ongoing", title: "Đang Chiếu", slug: "/dang-chieu" },
    { id: "completed", title: "Đã Hoàn Thành", slug: "/hoan-thanh" },
    { id: "movie", title: "Phim Lẻ | OVA", slug: "/phim-le" }
  ];
}

/**
 * 2.3 PLAYER INTERFACE (BẮT BUỘC): Danh sách phim theo chuyên mục & phân trang
 * Hỗ trợ đa hình chữ ký hàm:
 *   - Từ Kotlin: getList(type, slug, page, filters)
 *   - Từ Test Runner: getList(slug, page, filters)
 */
async function getList(...args) {
  let type = "";
  let slug = "";
  let page = 1;
  let filters = {};

  if (args.length >= 3) {
    type = args[0] || "";
    slug = args[1] || "";
    page = parseInt(args[2], 10) || 1;
    filters = args[3] || {};
  } else if (args.length === 2) {
    slug = args[0] || "";
    page = parseInt(args[1], 10) || 1;
  } else if (args.length === 1) {
    slug = args[0] || "";
  }

  // Nếu slug rỗng hoặc là "/" nhưng type có giá trị đường dẫn hợp lệ:
  if (!slug || slug === "/") {
    if (type && type.startsWith("/")) {
      slug = type;
    } else {
      slug = "/moi-cap-nhat";
    }
  }

  let cleanSlug = slug.trim();
  if (!cleanSlug.startsWith("/")) cleanSlug = "/" + cleanSlug;

  // Xây dựng URL phân trang chuẩn của YanHH3D: /moi-cap-nhat?page=2
  let url = `${getDomain()}${cleanSlug}`;
  if (page > 1) {
    url += (url.includes("?") ? "&" : "?") + `page=${page}`;
  }

  try {
    const res = await httpGet(url);
    if (res.status === 200 && res.body) {
      const items = parseFlwItems(res.body);
      const hasNext = res.body.includes(`page=${page + 1}`) || items.length >= 12;

      return {
        items: items,
        page: page,
        hasNext: hasNext,
        hasMore: hasNext,
        totalPages: hasNext ? page + 1 : page
      };
    }
  } catch (e) {
    console.error("[YanHH3D getList Error]:", e.message);
  }

  // Fallback Seed Data
  return {
    items: page === 1 ? SEED_MOVIES : [],
    page: page,
    hasNext: false,
    hasMore: false,
    totalPages: 1
  };
}

/**
 * 2.4 PLAYER INTERFACE (BẮT BUỘC): Tìm kiếm phim
 */
async function search(query, page = 1) {
  try {
    const q = (query || "").trim();
    if (!q) return { items: [], page: 1, hasNext: false, totalPages: 1 };

    let url = `${getDomain()}/search?keysearch=${encodeURIComponent(q)}`;
    if (page > 1) {
      url += `&page=${page}`;
    }

    const res = await httpGet(url);
    if (res.status === 200 && res.body) {
      const items = parseFlwItems(res.body);
      const hasNext = res.body.includes(`page=${page + 1}`) || items.length >= 12;

      return {
        items: items,
        page: page,
        hasNext: hasNext,
        hasMore: hasNext,
        totalPages: hasNext ? page + 1 : page
      };
    }
  } catch (e) {
    console.error("[YanHH3D search Error]:", e.message);
  }

  // Fallback tìm kiếm từ Seed Data
  const filtered = SEED_MOVIES.filter(m => 
    m.name.toLowerCase().includes((query || "").toLowerCase()) ||
    m.originName.toLowerCase().includes((query || "").toLowerCase())
  );
  return {
    items: filtered,
    page: page,
    hasNext: false,
    hasMore: false,
    totalPages: 1
  };
}

/**
 * 2.5 PLAYER INTERFACE (BẮT BUỘC): Chi tiết phim & danh sách tập
 */
async function getDetail(movieSlug) {
  const cleanSlug = (movieSlug || "").replace(/^https?:\/\/[^\/]+/, "").replace(/^\/+/, "").replace(/\/+$/, "");
  const pageUrl = `${getDomain()}/${cleanSlug}`;

  try {
    const res = await httpGet(pageUrl);
    if (res.status === 200 && res.body) {
      const html = res.body;

      // 1. Tiêu đề phim
      let title = "";
      const titleMatch = html.match(/<h1\s+class=["']film-name[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
      if (titleMatch) title = cleanText(titleMatch[1]);
      if (!title) {
        const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
        if (ogTitle) title = cleanText(ogTitle[1]);
      }

      // 2. Poster & Backdrop
      let posterUrl = "";
      const imgMatch = html.match(/<div\s+class=["']anisc-poster["'][\s\S]*?<img\s+[^>]*>/i);
      if (imgMatch) {
        posterUrl = extractAttr(imgMatch[0], "data-src") || extractAttr(imgMatch[0], "src");
      }
      if (!posterUrl) {
        const ogImg = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
        if (ogImg) posterUrl = ogImg[1];
      }

      // 3. Mô tả
      let description = "";
      const descMatch = html.match(/<div\s+class=["']film-description[^"']*["'][\s\S]*?<div\s+class=["']text["']>([\s\S]*?)<\/div>/i);
      if (descMatch) description = cleanText(descMatch[1]);
      if (!description) {
        const metaDesc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
        if (metaDesc) description = cleanText(metaDesc[1]);
      }

      // 4. Thể loại
      const genres = [];
      const genreMatches = html.matchAll(/href=["']https?:\/\/[^\/]*\/the-loai\/[^"']+["'][^>]*>([^<]+)<\/a>/gi);
      for (const m of genreMatches) {
        const gName = cleanText(m[1]);
        if (gName && !genres.includes(gName)) genres.push(gName);
      }

      // 5. Năm phát hành & Trạng thái
      let year = 2024;
      const jsonLdMatch = html.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
      if (jsonLdMatch) {
        try {
          const ld = JSON.parse(jsonLdMatch[1]);
          if (ld.datePublished) year = parseInt(ld.datePublished) || 2024;
        } catch (_) {}
      }

      // 6. Tìm các server thực tế từ trang chi tiết (Thuyết Minh / Vietsub / Lồng Tiếng)
      const serverEntries = [];
      const btnRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let btnMatch;
      while ((btnMatch = btnRegex.exec(html)) !== null) {
        const rawHref = btnMatch[1];
        const text = cleanText(btnMatch[2]);
        if (!rawHref || rawHref.startsWith("javascript") || rawHref.includes("/user/")) continue;

        let fullHref = rawHref.trim();
        if (!fullHref.startsWith("http")) {
          fullHref = `${getDomain()}${fullHref.startsWith("/") ? "" : "/"}${fullHref}`;
        }

        if (/thuyết minh/i.test(text)) {
          const tmUrl = fullHref.replace("/sever2/", "/");
          if (!serverEntries.some(s => s.serverName.includes("Thuyết Minh"))) {
            serverEntries.push({ serverKey: "tm", serverName: "🎙️ Thuyết Minh", watchUrl: tmUrl });
          }
        } else if (/vietsub|phụ đề/i.test(text) || rawHref.includes("/sever2/")) {
          let vsUrl = fullHref;
          if (!vsUrl.includes("/sever2/")) {
            vsUrl = vsUrl.replace(getDomain(), `${getDomain()}/sever2`);
          }
          if (!serverEntries.some(s => s.serverName.includes("Vietsub"))) {
            serverEntries.push({ serverKey: "vs", serverName: "📝 Vietsub", watchUrl: vsUrl });
          }
        } else if (/lồng tiếng/i.test(text)) {
          if (!serverEntries.some(s => s.serverName.includes("Lồng Tiếng"))) {
            serverEntries.push({ serverKey: "lt", serverName: "🗣️ Lồng Tiếng", watchUrl: fullHref });
          }
        }
      }

      // Nếu không tìm thấy nút nào theo tên, tìm nút .btn-play mặc định
      if (serverEntries.length === 0) {
        const playBtnMatch = html.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*btn-play[^"']*["'][^>]*>/i);
        const defaultWatchUrl = playBtnMatch ? playBtnMatch[1] : `${pageUrl}/tap-1`;
        const fullDefaultUrl = defaultWatchUrl.startsWith("http") ? defaultWatchUrl : `${getDomain()}${defaultWatchUrl.startsWith("/") ? "" : "/"}${defaultWatchUrl}`;
        serverEntries.push({ serverKey: "tm", serverName: "🎙️ Thuyết Minh", watchUrl: fullDefaultUrl });
      }

      // 7. Nạp song song trang tập cho từng server để bóc tách danh sách tập phim chuẩn
      const serverFetchPromises = serverEntries.map(s => httpGet(s.watchUrl));
      const serverResults = await Promise.allSettled(serverFetchPromises);

      const servers = [];
      let maxEpisodeCount = 0;

      for (let i = 0; i < serverEntries.length; i++) {
        const sEntry = serverEntries[i];
        const resObj = serverResults[i];
        let watchHtml = (resObj && resObj.status === "fulfilled" && resObj.value?.status === 200) ? resObj.value.body : "";

        const isSever2 = sEntry.watchUrl.includes("/sever2/") || sEntry.serverKey === "vs" || /vietsub/i.test(sEntry.serverName);

        // Nếu trang xem ban đầu chưa có container tập và watchUrl chưa có /tap-, thử thêm /tap-1
        if ((!watchHtml || !watchHtml.includes("ep-item")) && !sEntry.watchUrl.includes("/tap-")) {
          const retryUrl = `${sEntry.watchUrl.replace(/\/+$/, "")}/tap-1`;
          try {
            const retryRes = await httpGet(retryUrl);
            if (retryRes.status === 200 && retryRes.body && retryRes.body.includes("ep-item")) {
              watchHtml = retryRes.body;
            }
          } catch (_) {}
        }

        const episodeList = [];
        if (watchHtml) {
          const epRegex = /<a\s+class=["'][^"']*ep-item[^"']*["']\s+href=["']([^"']+)["']\s+title=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
          const seenHrefs = new Set();
          let match;

          while ((match = epRegex.exec(watchHtml)) !== null) {
            let epHref = match[1].trim();
            if (!epHref || epHref.startsWith("javascript")) continue;

            // Chuẩn hóa epHref thành URL đầy đủ
            if (!epHref.startsWith("http")) {
              epHref = `${getDomain()}${epHref.startsWith("/") ? "" : "/"}${epHref}`;
            }

            // Chuẩn hóa triệt để theo server context:
            if (isSever2) {
              // Server Vietsub: Bắt buộc phải có tiền tố /sever2/
              if (!epHref.includes("/sever2/")) {
                epHref = epHref.replace(getDomain(), `${getDomain()}/sever2`);
                if (!epHref.includes("/sever2/")) {
                  epHref = `${getDomain()}/sever2${epHref.replace(getDomain(), "")}`;
                }
              }
            } else {
              // Server Thuyết Minh: Không được chứa /sever2/
              if (epHref.includes("/sever2/")) {
                epHref = epHref.replace("/sever2/", "/");
              }
            }

            if (seenHrefs.has(epHref)) continue;
            seenHrefs.add(epHref);

            let epName = cleanText(match[2]);
            if (!epName) {
              const orderMatch = match[3].match(/<div\s+class=["']ssli-order["'][^>]*>([\s\S]*?)<\/div>/i);
              if (orderMatch) epName = cleanText(orderMatch[1]);
            }
            if (!epName) epName = `Tập ${episodeList.length + 1}`;

            const displayName = /^\d+/.test(epName) ? `Tập ${epName}` : epName;

            episodeList.push({
              id: `${sEntry.serverKey}_${epHref}`,
              name: displayName,
              slug: epHref.replace(/^https?:\/\/[^\/]+/, ""),
              data: {
                watchUrl: epHref,
                movieSlug: cleanSlug,
                epName: displayName,
                embed: epHref,
                serverName: sEntry.serverName
              }
            });
          }
        }

        // Nếu không parse được danh sách tập từ watchHtml, tạo ít nhất 1 tập mặc định
        if (episodeList.length === 0) {
          const fallbackWatchUrl = sEntry.watchUrl;
          episodeList.push({
            id: `${sEntry.serverKey}_${fallbackWatchUrl}`,
            name: "Tập 1",
            slug: fallbackWatchUrl.replace(/^https?:\/\/[^\/]+/, ""),
            data: {
              watchUrl: fallbackWatchUrl,
              movieSlug: cleanSlug,
              epName: "Tập 1",
              embed: fallbackWatchUrl,
              serverName: sEntry.serverName
            }
          });
        }

        if (episodeList.length > maxEpisodeCount) {
          maxEpisodeCount = episodeList.length;
        }

        servers.push({
          serverName: sEntry.serverName,
          episodes: episodeList
        });
      }

      return {
        slug: cleanSlug,
        name: title || cleanSlug,
        originName: "",
        thumbUrl: posterUrl,
        posterUrl: posterUrl,
        backdropUrl: posterUrl,
        year: year,
        type: "tv",
        status: "ongoing",
        quality: "Full HD 4K",
        language: servers.map(s => s.serverName.replace(/^[^\w\s]+\s*/, "")).join(" & ") || "Thuyết Minh & Vietsub",
        duration: "20 phút / tập",
        currentEpisode: `${maxEpisodeCount} Tập`,
        totalEpisodes: `${maxEpisodeCount} Tập`,
        description: description || title,
        actors: [],
        directors: [],
        genres: genres.length > 0 ? genres : ["Hoạt Hình 3D", "Tu Tiên", "Huyền Huyễn"],
        countries: ["Trung Quốc"],
        episodes: servers
      };
    }
  } catch (e) {
    console.error("[YanHH3D getDetail Error]:", e.message);
  }

  // Fallback từ Seed Data nếu có
  const seed = SEED_MOVIES.find(m => m.slug === cleanSlug) || SEED_MOVIES[0];
  const fallbackServers = [
    {
      serverName: "🎙️ Thuyết Minh",
      episodes: [
        {
          id: `tm_${getDomain()}/${seed.slug}/tap-1`,
          name: "Tập 1",
          slug: `${seed.slug}/tap-1`,
          data: {
            watchUrl: `${getDomain()}/${seed.slug}/tap-1`,
            movieSlug: seed.slug,
            epName: "Tập 1",
            embed: `${getDomain()}/${seed.slug}/tap-1`,
            serverName: "🎙️ Thuyết Minh"
          }
        }
      ]
    },
    {
      serverName: "📝 Vietsub",
      episodes: [
        {
          id: `vs_${getDomain()}/sever2/${seed.slug}/tap-1`,
          name: "Tập 1",
          slug: `sever2/${seed.slug}/tap-1`,
          data: {
            watchUrl: `${getDomain()}/sever2/${seed.slug}/tap-1`,
            movieSlug: seed.slug,
            epName: "Tập 1",
            embed: `${getDomain()}/sever2/${seed.slug}/tap-1`,
            serverName: "📝 Vietsub"
          }
        }
      ]
    }
  ];
  return {
    slug: seed.slug,
    name: seed.name,
    originName: seed.originName || "",
    thumbUrl: seed.thumbUrl,
    posterUrl: seed.posterUrl,
    backdropUrl: seed.posterUrl,
    year: seed.year || 2024,
    type: "tv",
    status: seed.status || "ongoing",
    quality: seed.quality || "4K",
    language: "Thuyết Minh & Vietsub",
    duration: "20 phút",
    currentEpisode: seed.currentEpisode || "1 Tập",
    totalEpisodes: seed.currentEpisode || "1 Tập",
    description: seed.name,
    actors: [],
    directors: [],
    genres: ["Hoạt Hình 3D", "Huyền Huyễn"],
    countries: ["Trung Quốc"],
    episodes: fallbackServers
  };
}

/**
 * Chuyển chuỗi UTF-8 sang Base64 chuẩn trong QuickJS Sandbox
 */
function toBase64(str) {
  if (typeof globalThis !== "undefined" && typeof globalThis.btoa === "function") {
    try {
      return globalThis.btoa(unescape(encodeURIComponent(str)));
    } catch (_) {}
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  const utf8Bytes = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 128) utf8Bytes.push(c);
    else if (c < 2048) utf8Bytes.push((c >> 6) | 192, (c & 63) | 128);
    else utf8Bytes.push((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128);
  }
  let out = "";
  for (let i = 0; i < utf8Bytes.length; i += 3) {
    const b1 = utf8Bytes[i], b2 = utf8Bytes[i + 1], b3 = utf8Bytes[i + 2];
    out += chars[b1 >> 2];
    out += chars[((b1 & 3) << 4) | (b2 ? b2 >> 4 : 0)];
    out += b2 !== undefined ? chars[((b2 & 15) << 2) | (b3 ? b3 >> 6 : 0)] : "=";
    out += b3 !== undefined ? chars[b3 & 63] : "=";
  }
  return out;
}

/**
 * Giải mã chuỗi Base64 sang UTF-8
 */
function base64Decode(str) {
  if (typeof globalThis !== "undefined" && typeof globalThis.atob === "function") {
    try {
      return decodeURIComponent(escape(globalThis.atob(str)));
    } catch (_) {
      try { return globalThis.atob(str); } catch (__) {}
    }
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "base64").toString("utf-8");
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  str = String(str).replace(/=+$/, "");
  for (let bc = 0, bs = 0, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}

/**
 * Trích xuất luồng phát đa năng (Direct HLS & MP4 Extractor)
 * Hỗ trợ toàn diện 4 họ máy chủ của YanHH3D / streamrpt1.site:
 *   1. Họ direct .m3u8: Chuyển sang /stream/m3u8/{uuid}.m3u8 và lấy playlist
 *   2. Họ data-obf: Giải mã pU (stream-plain) và lấy playlist
 *   3. Họ JWPlayer HTML: Bóc tách cccc, m3u8Url hoặc sources m3u8/mp4
 *   4. Link MP4 trực tiếp (Facebook CDN...)
 */
async function extractDirectHls(dataSrc, domain) {
  try {
    if (!dataSrc) return null;

    // 1. Nhánh Direct M3U8: dataSrc có đuôi .m3u8
    // Cú pháp: .../o1/v/t2/f2/m366/{uuid}.m3u8 -> .../stream/m3u8/{uuid}.m3u8
    if (dataSrc.includes(".m3u8")) {
      const convertedUrl = dataSrc.replace(/(https?:\/\/[^\/]+)\/[^]+?\/([^\/]+\.m3u8)$/, "$1/stream/m3u8/$2");
      try {
        const r1 = await httpGet(convertedUrl, { "Referer": dataSrc });
        if (r1.status === 200 && r1.body && r1.body.includes("#EXTM3U")) {
          // Kiểm tra: Nếu playlist chứa tiktokcdn.com (thường bị nhà mạng VN chặn socket trên ExoPlayer) -> bỏ qua để ưu tiên server khác
          if (r1.body.includes("tiktokcdn.com")) {
            console.warn("[YanHH3D] Bỏ qua m3u8 chứa tiktokcdn.com (dễ bị chặn mạng di động VN)");
            return null;
          }
          return {
            type: "m3u8",
            url: "data:application/vnd.apple.mpegurl;base64," + toBase64(r1.body),
            headers: { "User-Agent": DEFAULT_UA },
            subtitles: []
          };
        }
      } catch (_) {}
    }

    // 2. Tải nội dung trang player / embed của dataSrc
    const resEmbed = await httpGet(dataSrc, {
      "Referer": `${domain}/`
    });

    if (resEmbed.status !== 200 || !resEmbed.body) return null;
    const html = resEmbed.body;

    // Lấy cookie stream_session nếu máy chủ set-cookie
    let sessionCookie = "";
    const rawSetCookie = (resEmbed.headers && (resEmbed.headers["set-cookie"] || resEmbed.headers["Set-Cookie"])) || "";
    if (rawSetCookie) {
      const m = rawSetCookie.match(/stream_session=([^;]+)/i);
      if (m) sessionCookie = m[1];
    }

    // 2.1: Nhánh data-obf (Phim thế hệ mới: Phàm Nhân Tu Tiên, Đấu La Đại Lục 2, Thương Nguyên Đồ...)
    const obfMatch = html.match(/data-obf=["']([^"']+)["']/i);
    if (obfMatch) {
      try {
        const decoded = base64Decode(obfMatch[1]);
        const parsed = JSON.parse(decoded);
        if (parsed && parsed.pU) {
          const reqHeaders = { "Referer": dataSrc, "User-Agent": DEFAULT_UA };
          if (sessionCookie) reqHeaders["Cookie"] = `stream_session=${sessionCookie}`;
          const resPlain = await httpGet(parsed.pU, reqHeaders);
          if (resPlain.status === 200 && resPlain.body && resPlain.body.includes("#EXTM3U")) {
            if (resPlain.body.includes("tiktokcdn.com")) {
              console.warn("[YanHH3D] Bỏ qua data-obf chứa tiktokcdn.com");
              return null;
            }
            return {
              type: "m3u8",
              url: "data:application/vnd.apple.mpegurl;base64," + toBase64(resPlain.body),
              headers: { "User-Agent": DEFAULT_UA },
              subtitles: []
            };
          }
        }
      } catch (_) {}
    }

    // 2.2: Nhánh JWPlayer: Bóc tách var cccc = "...", m3u8Url, hoặc sources: [{ file: "..." }]
    const ccccMatch = html.match(/var\s+cccc\s*=\s*["']([^"']+)["']/i);
    const m3u8VarMatch = html.match(/(?:const|var|let)\s+m3u8Url\s*=\s*[`"']([^`"']+\.m3u8[^`"']*)[`"']/i);
    const sourcesMatch = html.match(/sources\s*:\s*\[\s*\{\s*["']?file["']?\s*:\s*["']([^"']+)["']/i);
    const anyM3u8InHtml = html.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/i);

    let candidate = (ccccMatch && ccccMatch[1])
      || (m3u8VarMatch && m3u8VarMatch[1].replace("${storage}", "drive"))
      || (sourcesMatch && sourcesMatch[1])
      || (anyM3u8InHtml && anyM3u8InHtml[0]);

    if (candidate) {
      // Trường hợp link MP4 trực tiếp (như server HD trên Facebook CDN)
      if (candidate.includes(".mp4")) {
        return {
          type: "mp4",
          url: candidate,
          headers: { "User-Agent": DEFAULT_UA, "Referer": dataSrc },
          subtitles: []
        };
      }

      // Trường hợp link M3U8
      const reqHeaders = { "Referer": dataSrc, "User-Agent": DEFAULT_UA };
      if (sessionCookie) reqHeaders["Cookie"] = `stream_session=${sessionCookie}`;
      const resCand = await httpGet(candidate, reqHeaders);
      if (resCand.status === 200 && resCand.body && resCand.body.includes("#EXTM3U")) {
        if (resCand.body.includes("tiktokcdn.com")) {
          console.warn("[YanHH3D] Bỏ qua JWPlayer m3u8 chứa tiktokcdn.com");
          return null;
        }
        return {
          type: "m3u8",
          url: "data:application/vnd.apple.mpegurl;base64," + toBase64(resCand.body),
          headers: { "User-Agent": DEFAULT_UA },
          subtitles: []
        };
      }
    }
  } catch (e) {
    console.warn("[YanHH3D Universal Extractor]", e.message);
  }
  return null;
}

/**
 * Tiện ích Headless WebView Sniffer bóc tách luồng HLS ngầm
 */
async function sniffWithHeadless(watchUrl, quality) {
  if (typeof globalThis === "undefined" || !globalThis.context?.webview?.sniff) return null;

  const snifferScript = `
    (function() {
      if (window.__sniffer_injected) return;
      window.__sniffer_injected = true;

      function sendResult(data) {
        if (window.__sniffer_reported) return;
        window.__sniffer_reported = true;
        if (window.__sniffer_bridge && typeof window.__sniffer_bridge.postMessage === 'function') {
          window.__sniffer_bridge.postMessage(JSON.stringify(data));
        }
      }

      const origFetch = window.fetch;
      if (origFetch) {
        window.fetch = async function(...args) {
          const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
          if (url && (url.includes('.m3u8') || url.includes('stream-plain') || url.includes('/stream?'))) {
            try {
              const resp = await origFetch.apply(this, args);
              const clone = resp.clone();
              const text = await clone.text();
              if (text && text.includes('#EXTM3U')) {
                sendResult({ type: 'm3u8_content', content: text, url: url });
              } else {
                sendResult({ type: 'm3u8_url', url: url });
              }
              return resp;
            } catch (e) {}
          }
          return origFetch.apply(this, args);
        };
      }

      const origOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url) {
        if (url && (url.includes('.m3u8') || url.includes('stream-plain') || url.includes('/stream?'))) {
          this.addEventListener('load', function() {
            if (this.responseText && this.responseText.includes('#EXTM3U')) {
              sendResult({ type: 'm3u8_content', content: this.responseText, url: url });
            } else {
              sendResult({ type: 'm3u8_url', url: url });
            }
          });
        }
        return origOpen.apply(this, arguments);
      };

      setTimeout(function() {
        const svBtns = document.querySelectorAll('#list_sv .btn3dsv');
        for (let i = 0; i < svBtns.length; i++) {
          const btn = svBtns[i];
          const text = (btn.textContent || '').trim().toUpperCase();
          if (text === '${quality}') {
            btn.click();
            break;
          }
        }
      }, 500);
    })();
  `;

  try {
    const rawResult = await globalThis.context.webview.sniff({
      url: watchUrl,
      injectJs: snifferScript,
      timeoutMs: 8000,
      headers: {
        "User-Agent": DEFAULT_UA,
        "Referer": `${getDomain()}/`
      }
    });

    const parsed = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;
    if (parsed) {
      if (parsed.content && parsed.content.includes("#EXTM3U")) {
        return {
          type: "m3u8",
          url: "data:application/vnd.apple.mpegurl;base64," + toBase64(parsed.content),
          headers: { "User-Agent": DEFAULT_UA },
          subtitles: []
        };
      }
      if (parsed.url) {
        return {
          type: "m3u8",
          url: parsed.url,
          headers: { "User-Agent": DEFAULT_UA, "Referer": watchUrl },
          subtitles: []
        };
      }
    }
  } catch (e) {
    console.warn("[YanHH3D Sniff Error]:", e.message);
  }
  return null;
}

/**
 * 2.6 PLAYER INTERFACE (BẮT BUỘC): Luồng phát video trực tiếp cho JKHX Player
 * Bóc tách 4 luồng HLS trực tiếp từ YanHH3D phát qua ExoPlayer Native (type: "m3u8" / "mp4")
 */
async function getStream(episodeData) {
  const data = (episodeData && episodeData.data) || {};
  const watchUrl = data.watchUrl || (typeof episodeData === "string" ? episodeData : "");
  const targetQuality = (data.quality || "4K").toUpperCase();

  if (!watchUrl) {
    return {
      type: "embed",
      url: `${getDomain()}/`,
      headers: { "User-Agent": DEFAULT_UA, "Referer": `${getDomain()}/` },
      subtitles: []
    };
  }

  let finalEmbedUrl = watchUrl;

  try {
    // 1. Tải trang xem tập để trích xuất danh sách server #list_sv
    const resWatch = await httpGet(watchUrl);
    if (resWatch.status === 200 && resWatch.body) {
      const html = resWatch.body;

      // Tìm tất cả server buttons trong #list_sv
      const svMatches = Array.from(html.matchAll(/<a\s+[^>]*class=["'][^"']*btn3dsv[^"']*["'][^>]*data-src=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi));
      const serverList = svMatches.map(m => ({
        quality: cleanText(m[2]).toUpperCase(),
        dataSrc: m[1]
      }));

      // Sắp xếp các server theo độ ưu tiên an toàn, ưu tiên CDN streamrpt1 sạch trước tiktokcdn:
      function getQualityScore(q) {
        if (q === targetQuality) return 100;
        if (q === "4K") return 95;
        if (q === "1080") return 90;
        if (q === "1080+") return 85; // Cụm streamrpt1.site sạch 100%
        if (q === "HD") return 80;    // Cụm Facebook CDN MP4 sạch 100%
        if (q === "4K-") return 70;
        if (q === "1080-") return 30; // TikTok CDN (dễ bị chặn mạng di động VN)
        return 20;
      }

      const sortedServers = [...serverList].sort((a, b) => getQualityScore(b.quality) - getQualityScore(a.quality));

      if (sortedServers.length > 0) {
        finalEmbedUrl = sortedServers[0].dataSrc || watchUrl;

        // Thử lần lượt các server theo thứ tự ưu tiên cho đến khi lấy được luồng HLS/MP4 sạch
        for (const s of sortedServers) {
          try {
            const directStream = await extractDirectHls(s.dataSrc, getDomain());
            if (directStream) {
              return directStream;
            }
          } catch (extErr) {
            console.warn(`[YanHH3D] Server ${s.quality} direct extraction failed:`, extErr.message);
          }
        }

        // Phương án 2: Thử Headless Webview Sniffer với server ưu tiên
        try {
          const sniffedStream = await sniffWithHeadless(watchUrl, sortedServers[0].quality);
          if (sniffedStream) {
            return sniffedStream;
          }
        } catch (sniffErr) {
          console.warn("[YanHH3D] Sniffer failed:", sniffErr.message);
        }
      }
    }
  } catch (e) {
    console.error("[YanHH3D getStream Error]:", e.message);
  }

  // Fallback an toàn: Trả về trang player embed gốc của máy chủ để chạy trong WebView mode
  return {
    type: "embed",
    url: finalEmbedUrl,
    headers: {
      "User-Agent": DEFAULT_UA,
      "Referer": `${getDomain()}/`
    },
    subtitles: []
  };
}

/**
 * 2.7 PLAYER INTERFACE (TÙY CHỌN): Bộ lọc cho MovieListScreen
 */
async function getFilters() {
  return {
    genres: [
      { name: "Tất cả thể loại", slug: "all" },
      { name: "Huyền Huyễn", slug: "/the-loai/huyen-huyen" },
      { name: "Xuyên Không", slug: "/the-loai/xuyen-khong" },
      { name: "Trùng Sinh", slug: "/the-loai/trung-sinh" },
      { name: "Tiên Hiệp", slug: "/the-loai/tien-hiep" },
      { name: "Cổ Trang", slug: "/the-loai/co-trang" },
      { name: "Hài Hước", slug: "/the-loai/hai-huoc" },
      { name: "Kiếm Hiệp", slug: "/the-loai/kiem-hiep" },
      { name: "Hiện Đại", slug: "/the-loai/hien-dai" }
    ],
    countries: [
      { name: "Trung Quốc", slug: "cn" }
    ],
    years: [
      { name: "Tất cả", slug: "all" },
      { name: "2026", slug: "2026" },
      { name: "2025", slug: "2025" },
      { name: "2024", slug: "2024" },
      { name: "2023", slug: "2023" }
    ],
    sortFields: [],
    sortTypes: []
  };
}

/**
 * 2.8 PLAYER INTERFACE (TÙY CHỌN): Cài đặt plugin
 */
function getSettings() {
  let currentDomain = DEFAULT_DOMAIN;
  if (typeof globalThis !== "undefined") {
    const saved = globalThis.context?.storage?.get("yanhh3d_domain");
    if (saved) currentDomain = saved;
  }
  return [
    {
      key: "yanhh3d_domain",
      title: "Tên miền YanHH3D",
      description: "Địa chỉ website chính thức (mặc định: https://yanhh3d.chat)",
      type: "text",
      defaultValue: DEFAULT_DOMAIN,
      currentValue: currentDomain
    }
  ];
}

/**
 * 2.9 PLAYER INTERFACE (TÙY CHỌN): Kiểm tra tình trạng kết nối tới nguồn
 */
async function checkHealth() {
  const start = Date.now();
  try {
    const res = await httpGet(getDomain());
    const latency = Date.now() - start;
    if (res.status === 200) {
      return {
        status: "ok",
        message: `Kết nối máy chủ YanHH3D ổn định (${latency}ms) - Hoạt hình 3D/4K thuyết minh`,
        latencyMs: latency
      };
    }
    return {
      status: "degraded",
      message: `Phản hồi mã trạng thái HTTP ${res.status} (${latency}ms)`,
      latencyMs: latency
    };
  } catch (e) {
    return {
      status: "error",
      message: "Lỗi kết nối máy chủ YanHH3D: " + e.message,
      latencyMs: Date.now() - start
    };
  }
}

// ============================================================================
// EXPORT DEFAULT PLUGIN OBJECT
// ============================================================================
export default {
  id: "yanhh3d",
  name: "YanHH3D",
  version: "1.0.6",
  types: ["movie", "tv"],
  isAdult: false,

  // Nhóm hàm giao diện bắt buộc
  getHome,
  getMenu,
  getList,
  search,
  getDetail,
  getStream,

  // Nhóm hàm giao diện tùy chọn
  getFilters,
  getSettings,
  checkHealth
};
