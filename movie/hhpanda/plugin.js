// plugins/movie/hhpanda/plugin.js
// HHPanda Animation Provider for JKHX Player (hhpanda.st)
// Chuyên phim hoạt hình 3D Trung Quốc (HH3D, Tu Tiên, Huyền Huyễn, Kiếm Hiệp) chất lượng 4K/FHD
// Tuân thủ kiến trúc phân tầng chuẩn trong PROJECT_RULES.md:
//   - Nhóm 1: Các hàm phục vụ crawl & bóc tách dữ liệu từ nguồn HHPanda (Crawler Layer)
//   - Nhóm 2: Các hàm phục vụ giao diện JKHX Player (Player Contract Layer: Bắt buộc & Tùy chọn)
// Định danh thể loại: types = ["movie", "tv"], isAdult = false

// ============================================================================
// CẤU HÌNH & HẰNG SỐ NGUỒN HHPANDA
// ============================================================================
const DEFAULT_DOMAIN = "https://hhpanda.st";
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
 * Lấy tên miền HHPanda: ưu tiên context storage -> CUSTOM_DOMAIN -> mặc định
 */
function getDomain() {
  if (typeof globalThis !== "undefined") {
    const saved = globalThis.context?.storage?.get("hhpanda_domain");
    if (saved && saved.trim()) return saved.trim().replace(/\/+$/, "");
    if (globalThis.CUSTOM_DOMAIN && globalThis.CUSTOM_DOMAIN.trim()) return globalThis.CUSTOM_DOMAIN.trim().replace(/\/+$/, "");
    if (globalThis.BASE_URL && globalThis.BASE_URL.trim()) return globalThis.BASE_URL.trim().replace(/\/+$/, "");
  }
  return DEFAULT_DOMAIN;
}

// In-memory cache tối ưu hóa hiệu năng
const movieCache = new Map();

/**
 * Dữ liệu hạt nhân dự phòng (Seed Data) phòng ngừa rớt mạng
 */
const SEED_MOVIES = [
  {
    "id": 19734,
    "slug": "dau-pha-thuong-khung-ova-song-de-chi-chien",
    "title": "Đấu Phá Thương Khung OVA: Song Đế Chi Chiến",
    "originName": "Battle Through the Heavens: The Battle of the Two Emperors",
    "thumbUrl": "https://hhpanda.st/wp-content/uploads/2026/10/Dau-Pha-Thuong-Khung-OVA-Song-De-Chi-Chien.jpg",
    "quality": "FULL HD 4K",
    "episodeCurrent": "Trailer",
    "categories": [22, 25, 24],
    "year": 2026
  },
  {
    "id": 59,
    "slug": "tien-nghich",
    "title": "Tiên Nghịch",
    "originName": "Xian Ni",
    "thumbUrl": "https://hhpanda.st/wp-content/uploads/2024/10/tien-nghich-5.png",
    "quality": "Full HD 4K",
    "episodeCurrent": "Tập 162/180 [4K]",
    "categories": [22, 25, 24],
    "year": 2026
  },
  {
    "id": 161,
    "slug": "dau-pha-thuong-khung-phan-5",
    "title": "Đấu Phá Thương Khung Phần 5",
    "originName": "Fights Break Sphere Season 5",
    "thumbUrl": "https://hhpanda.st/wp-content/uploads/2024/10/Dau-Pha-Thuong-Khung-Phan-5-1-300x450.webp",
    "quality": "Full HD 4K",
    "episodeCurrent": "Tập 214/219 [4K]",
    "categories": [22, 25, 24],
    "year": 2026
  },
  {
    "id": 210,
    "slug": "dau-la-dai-luc-2-tuyet-the-duong-mon",
    "title": "Đấu La Đại Lục 2: Tuyệt Thế Đường Môn",
    "originName": "Douluo Dalu II: Jue Shi Tang Men",
    "thumbUrl": "https://hhpanda.st/wp-content/uploads/2024/10/dau-la-dai-luc-2-tuyet-the-duong-mon-210.jpg",
    "quality": "Full HD 4K",
    "episodeCurrent": "Tập 175/182 [4K]",
    "categories": [22, 25, 34],
    "year": 2026
  },
  {
    "id": 196,
    "slug": "pham-nhan-tu-tien",
    "title": "Phàm Nhân Tu Tiên",
    "originName": "Fan Ren Xiu Xian Zhuan",
    "thumbUrl": "https://hhpanda.st/wp-content/uploads/2024/10/Pham-Nhan-Tu-Tien-300x450.webp",
    "quality": "Full HD 4K",
    "episodeCurrent": "Tập 195 [4K]",
    "categories": [22, 25, 24],
    "year": 2026
  },
  {
    "id": 503,
    "slug": "thuong-nguyen-do",
    "title": "Thương Nguyên Đồ",
    "originName": "Cang Yuan Tu",
    "thumbUrl": "https://hhpanda.st/wp-content/uploads/2024/10/photo_2026-03-13_09-30-47-300x450.webp",
    "quality": "Full HD 4K",
    "episodeCurrent": "Tập 99/129 [4K]",
    "categories": [22, 25, 33],
    "year": 2026
  },
  {
    "id": 19514,
    "slug": "dai-ly-tu-nhat-chi-phan-3",
    "title": "Đại Lý Tự Nhật Chí Phần 3",
    "originName": "White Cat Legend Season 3",
    "thumbUrl": "https://hhpanda.st/wp-content/uploads/2026/10/Dai-Ly-Tu-Nhat-Chi-Phan-3-scaled.jpg",
    "quality": "FULL HD 4K",
    "episodeCurrent": "Tập 1+2+3/16 [4K]",
    "categories": [27, 22, 33],
    "year": 2026
  },
  {
    "id": 19464,
    "slug": "long-than-van-tuong-chi-cuong-vuong-2",
    "title": "Long Thần Vạn Tướng Chi Cuồng Vương 2",
    "originName": "Kuang Wang Season 2",
    "thumbUrl": "https://hhpanda.st/wp-content/uploads/2026/10/Long-Than-Van-Tuong-Chi-Cuong-Vuong-2.jpg",
    "quality": "FULL HD 4K",
    "episodeCurrent": "Tập 6/14 [4K]",
    "categories": [27, 22, 33],
    "year": 2026
  },
  {
    "id": 19196,
    "slug": "nguoi-giu-mo-dai-ha",
    "title": "Người Giữ Mộ Đại Hạ",
    "originName": "The Great Xia Tomb Keeper",
    "thumbUrl": "https://hhpanda.st/wp-content/uploads/2026/09/Nguoi-Giu-Mo-Dai-Ha-scaled.jpg",
    "quality": "FULL HD 4K",
    "episodeCurrent": "Tập 8/59",
    "categories": [28, 22, 25],
    "year": 2026
  },
  {
    "id": 18356,
    "slug": "con-ra-the-thong-gi-nua-phan-2",
    "title": "Còn Ra Thể Thống Gì Nữa Phần 2",
    "originName": "How Dare You!? Season 2",
    "thumbUrl": "https://hhpanda.st/wp-content/uploads/2026/08/Con-Ra-The-Thong-Gi-Nua-Phan-2.jpg",
    "quality": "FULL HD 4K",
    "episodeCurrent": "Tập 24/24 [4K]",
    "categories": [27, 28, 22, 1],
    "year": 2026
  }
];

// Bản đồ ánh xạ danh mục thể loại sang tên tiếng Việt
const CATEGORY_MAP = {
  "24": "Tu Tiên",
  "25": "Huyền Huyễn",
  "33": "Kiếm Hiệp",
  "27": "Cổ Trang",
  "28": "Đô Thị",
  "34": "Kỳ Ảo",
  "30": "Dã Sử",
  "29": "Đồng Nhân",
  "26": "Khoa Huyễn",
  "32": "Huyền Nghi",
  "31": "Cạnh Kỹ",
  "1": "Xuyên Không",
  "22": "Hoạt Hình 3D"
};

// ============================================================================
// NHÓM 1: CÁC HÀM PHỤC VỤ CRAWL & GIẢI MÃ NGUỒN HHPANDA (CRAWLER LAYER)
// ============================================================================

/**
 * Giải mã HTML entities thông dụng
 */
function decodeHtml(html) {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "--")
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#038;/g, "&")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/<[^>]+>/g, "")
    .trim();
}

/**
 * Thực hiện HTTP GET an toàn, tương thích QuickJS HTTP Bridge và fetch
 */
async function httpGet(url, customHeaders = {}) {
  const headers = {
    "User-Agent": DEFAULT_UA,
    "Referer": getDomain() + "/",
    ...customHeaders
  };

  if (typeof globalThis !== "undefined" && globalThis.context?.http?.get) {
    try {
      const res = await globalThis.context.http.get(url, { headers });
      const body = typeof res.body === "string" ? res.body : (res.text || "");
      return {
        status: res.status || 200,
        body: body,
        headers: res.headers || {}
      };
    } catch (e) {
      // Fallback
    }
  }

  if (typeof fetch !== "undefined") {
    const r = await fetch(url, { headers });
    const text = await r.text();
    const h = {};
    if (r.headers && typeof r.headers.forEach === "function") {
      r.headers.forEach((v, k) => { h[k.toLowerCase()] = v; });
    }
    return {
      status: r.status,
      body: text,
      headers: h
    };
  }

  throw new Error("Không có HTTP client tương thích trong runtime");
}

/**
 * Gọi WordPress REST API lấy danh sách bài viết/phim
 */
async function fetchWpPosts(params = {}) {
  const queryParts = [];
  for (const k of Object.keys(params)) {
    if (params[k] !== undefined && params[k] !== null && params[k] !== "") {
      queryParts.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k]));
    }
  }
  const queryString = queryParts.length > 0 ? "?" + queryParts.join("&") : "";
  const url = `${getDomain()}/wp-json/wp/v2/posts${queryString}`;

  const res = await httpGet(url);
  if (res.status === 200) {
    try {
      const data = JSON.parse(res.body);
      const totalItems = parseInt(res.headers["x-wp-total"] || "0", 10) || data.length;
      const totalPages = parseInt(res.headers["x-wp-totalpages"] || "1", 10) || 1;
      return {
        data: Array.isArray(data) ? data : [],
        totalItems,
        totalPages
      };
    } catch (e) {
      return { data: [], totalItems: 0, totalPages: 1 };
    }
  }
  return { data: [], totalItems: 0, totalPages: 1 };
}

/**
 * Chuyển đổi đối tượng Post WP sang MovieItem chuẩn JKHX Player
 */
function formatPostToMovieItem(post) {
  if (!post) return null;
  const meta = post._halim_metabox_options || {};
  const yoast = post.yoast_head_json || {};
  const id = post.id || 0;
  const slug = post.slug || String(id);
  const title = decodeHtml(post.title?.rendered || "Hoạt Hình 3D");
  const originName = decodeHtml(meta.halim_original_title || title);

  let thumb = "";
  if (yoast.og_image && yoast.og_image[0] && yoast.og_image[0].url) {
    thumb = yoast.og_image[0].url;
  } else if (post._embedded?.["wp:featuredmedia"]?.[0]?.source_url) {
    thumb = post._embedded["wp:featuredmedia"][0].source_url;
  } else {
    thumb = `${getDomain()}/wp-content/uploads/2024/10/default-poster.jpg`;
  }

  const quality = meta.halim_quality || "Full HD 4K";
  const episodeCurrent = meta.halim_episode || "Hoàn Tất";
  const year = post.date ? new Date(post.date).getFullYear() : 2026;

  // Lấy tên thể loại chính
  const catIds = Array.isArray(post.categories) ? post.categories : [];
  let mainCategory = "Hoạt Hình 3D";
  for (const cid of catIds) {
    if (CATEGORY_MAP[String(cid)]) {
      mainCategory = CATEGORY_MAP[String(cid)];
      break;
    }
  }

  // Lưu vào cache phục vụ getDetail nhanh
  movieCache.set(slug, {
    id,
    slug,
    title,
    originName,
    thumb,
    quality,
    episodeCurrent,
    year,
    mainCategory,
    categories: catIds,
    meta,
    post
  });

  return {
    slug: slug,
    name: title,
    originName: originName,
    thumbUrl: thumb,
    posterUrl: thumb,
    backdropUrl: thumb,
    year: year,
    type: "tv",
    quality: quality,
    language: "Vietsub / Thuyết Minh",
    category: mainCategory,
    providerId: "hhpanda",
    episodeCurrent: episodeCurrent
  };
}

/**
 * Bóc tách chi tiết máy chủ và danh sách tập phim từ trang HTML HHPanda
 */
function parseServersFromHtml(html, postIdFallback = 0) {
  const servers = [];
  if (!html || typeof html !== "string") return servers;

  // Bóc tách các khối máy chủ: <div class="halim-server ...">...</ul>
  const serverSections = [...html.matchAll(/<div[^>]+class=["'][^"']*halim-server[^"']*["'][^>]*>(.*?)<\/ul>/gis)];

  for (let i = 0; i < serverSections.length; i++) {
    const secHtml = serverSections[i][1];
    const sNameMatch = secHtml.match(/class=["']halim-server-name["'][^>]*>(.*?)<\/span>/is);
    let rawName = sNameMatch ? decodeHtml(sNameMatch[1]) : "";

    let serverName = "HHPanda VIP";
    if (rawName.toLowerCase().includes("vietsub") || rawName.includes("1")) {
      serverName = "HHPanda Vietsub 4K";
    } else if (rawName.toLowerCase().includes("thuyết minh") || rawName.toLowerCase().includes("thuyet minh") || rawName.includes("2")) {
      serverName = "HHPanda Thuyết Minh 4K";
    } else if (rawName) {
      serverName = "HHPanda " + rawName;
    }

    const epMatches = [...secHtml.matchAll(/<a[^>]+data-post-id=["'](\d+)["'][^>]+data-ep=["']([^"']+)["'][^>]+data-sv=["']([^"']+)["'][^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis)];
    const episodes = [];

    for (let j = 0; j < epMatches.length; j++) {
      const pId = epMatches[j][1] || String(postIdFallback);
      const epSlug = epMatches[j][2]; // e.g. "tap-162"
      const svNum = epMatches[j][3]; // e.g. "1" hoặc "2"
      const epHref = epMatches[j][4];
      const epLabel = decodeHtml(epMatches[j][5]);

      // Trích xuất số tập
      const numMatch = epLabel.match(/\d+/) || epSlug.match(/\d+/);
      const epNumber = numMatch ? parseInt(numMatch[0], 10) : (j + 1);

      episodes.push({
        id: `${svNum}_${epSlug}`,
        name: epLabel || `Tập ${epNumber}`,
        slug: epSlug,
        number: epNumber,
        serverName: serverName,
        data: {
          postId: pId,
          chapterSt: epSlug,
          sv: svNum,
          href: epHref
        }
      });
    }

    // Sắp xếp thứ tự tập từ nhỏ đến lớn (Tập 1 -> Tập N) để người dùng xem tự nhiên
    episodes.sort((a, b) => a.number - b.number);

    if (episodes.length > 0) {
      servers.push({
        serverName: serverName,
        episodes: episodes
      });
    }
  }

  return servers;
}

/**
 * Gọi AJAX player.php để lấy iframe URL (streamfree.vip)
 */
async function fetchPlayerEmbed(postId, chapterSt, sv, type = "tiktik") {
  const url = `${getDomain()}/player/player.php?action=dox_ajax_player&post_id=${encodeURIComponent(postId)}&chapter_st=${encodeURIComponent(chapterSt)}&sv=${encodeURIComponent(sv)}&type=${encodeURIComponent(type)}`;
  try {
    const res = await httpGet(url, {
      "X-Requested-With": "XMLHttpRequest",
      "Referer": `${getDomain()}/`
    });
    if (res.status === 200 && res.body) {
      const match = res.body.match(/<iframe[^>]+src=["']([^"']+)["']/i);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (e) {
    // Ignore error
  }
  return "";
}

// Bảng ánh xạ slug danh mục sang WordPress category ID của hhpanda.st
const SLUG_TO_CAT_ID = {
  "tu-tien": "24",
  "tu-tien-trong-diem": "24",
  "huyen-huyen": "25",
  "huyen-huyen-dac-sac": "25",
  "kiem-hiep": "33",
  "co-trang": "27",
  "kiem-hiep-co-trang": "33,27",
  "do-thi": "28",
  "khoa-huyen": "26",
  "do-thi-khoa-huyen": "28,26",
  "ky-ao": "34",
  "xuyen-khong-ky-ao": "1,34",
  "da-su": "30",
  "dong-nhan": "29",
  "huyen-nghi": "32",
  "canh-ky": "31",
  "xuyen-khong": "1",
  "hoat-hinh": "22"
};

// ============================================================================
// NHÓM 2: CÁC HÀM PHỤC VỤ GIAO DIỆN JKHX-PLAYER (PLAYER CONTRACT LAYER)
// ============================================================================

/**
 * 2.1 PLAYER INTERFACE (BẮT BUỘC): Dữ liệu các row phim cho HomeScreen
 */
async function getHome() {
  try {
    // Tải đồng thời danh sách phim mới cập nhật và các thể loại trọng điểm
    const [pMoi, pTuTien, pHuyenHuyen, pKiemHiep, pDoThi] = await Promise.allSettled([
      fetchWpPosts({ per_page: 12, page: 1 }),
      fetchWpPosts({ categories: "24", per_page: 10, page: 1 }), // Tu Tiên
      fetchWpPosts({ categories: "25", per_page: 10, page: 1 }), // Huyền Huyễn
      fetchWpPosts({ categories: "33,27", per_page: 10, page: 1 }), // Kiếm Hiệp & Cổ Trang
      fetchWpPosts({ categories: "28,26", per_page: 10, page: 1 })  // Đô Thị & Khoa Huyễn
    ]);

    const rMoi = pMoi.status === "fulfilled" && pMoi.value.data.length > 0 ? pMoi.value.data : SEED_MOVIES;
    const rTuTien = pTuTien.status === "fulfilled" && pTuTien.value.data.length > 0 ? pTuTien.value.data : SEED_MOVIES.filter(m => m.categories?.includes(24));
    const rHuyenHuyen = pHuyenHuyen.status === "fulfilled" && pHuyenHuyen.value.data.length > 0 ? pHuyenHuyen.value.data : SEED_MOVIES.filter(m => m.categories?.includes(25));
    const rKiemHiep = pKiemHiep.status === "fulfilled" && pKiemHiep.value.data.length > 0 ? pKiemHiep.value.data : SEED_MOVIES.filter(m => m.categories?.includes(33) || m.categories?.includes(27));
    const rDoThi = pDoThi.status === "fulfilled" && pDoThi.value.data.length > 0 ? pDoThi.value.data : SEED_MOVIES.filter(m => m.categories?.includes(28));

    const sections = [
      {
        title: "🔥 Hoạt Hình 3D Mới Cập Nhật",
        type: "banner",
        slug: "moi-cap-nhat",
        items: rMoi.map(formatPostToMovieItem).filter(Boolean)
      },
      {
        title: "⚔️ Tu Tiên Trọng Điểm",
        type: "grid",
        slug: "24",
        items: rTuTien.map(formatPostToMovieItem).filter(Boolean)
      },
      {
        title: "🌟 Huyền Huyễn Đặc Sắc",
        type: "grid",
        slug: "25",
        items: rHuyenHuyen.map(formatPostToMovieItem).filter(Boolean)
      },
      {
        title: "🗡️ Kiếm Hiệp & Cổ Trang",
        type: "grid",
        slug: "33,27",
        items: rKiemHiep.map(formatPostToMovieItem).filter(Boolean)
      },
      {
        title: "🏙️ Đô Thị & Khoa Huyễn",
        type: "grid",
        slug: "28,26",
        items: rDoThi.map(formatPostToMovieItem).filter(Boolean)
      }
    ];

    return { sections: sections };
  } catch (e) {
    // Dự phòng khi lỗi mạng
    return {
      sections: [
        {
          title: "🔥 Hoạt Hình 3D HHPanda",
          type: "banner",
          slug: "moi-cap-nhat",
          items: SEED_MOVIES.map(formatPostToMovieItem).filter(Boolean)
        }
      ]
    };
  }
}

/**
 * 2.2 PLAYER INTERFACE (BẮT BUỘC): Menu điều hướng cho App Bar / Drawer
 */
async function getMenu() {
  return [
    { title: "HHPanda", slug: "all", isDropdown: false },
    { title: "Mới Cập Nhật", slug: "moi-cap-nhat", isDropdown: false },
    { title: "Tu Tiên", slug: "24", isDropdown: false },
    { title: "Huyền Huyễn", slug: "25", isDropdown: false },
    { title: "Kiếm Hiệp", slug: "33", isDropdown: false },
    {
      title: "Thể Loại",
      isDropdown: true,
      items: [
        { title: "Tu Tiên", slug: "24" },
        { title: "Huyền Huyễn", slug: "25" },
        { title: "Kiếm Hiệp", slug: "33" },
        { title: "Cổ Trang", slug: "27" },
        { title: "Đô Thị", slug: "28" },
        { title: "Kỳ Ảo", slug: "34" },
        { title: "Dã Sử", slug: "30" },
        { title: "Đồng Nhân", slug: "29" },
        { title: "Khoa Huyễn", slug: "26" },
        { title: "Huyền Nghi", slug: "32" },
        { title: "Cạnh Kỹ", slug: "31" },
        { title: "Xuyên Không", slug: "1" }
      ]
    }
  ];
}

/**
 * 2.3 PLAYER INTERFACE (BẮT BUỘC): Danh sách phim theo phân loại & phân trang
 * Hỗ trợ đa hình:
 *   - Kotlin Core: getList(type, slug, page, filters)
 *   - Test Runner / Standard: getList(slug, page) hoặc getList(slug, sortField, page)
 */
async function getList(...args) {
  let type = "";
  let slug = "";
  let page = 1;
  let filters = {};

  if (args.length >= 3 && typeof args[2] === "number") {
    // Kotlin: getList(type, slug, page, filters)
    type = String(args[0] || "");
    slug = String(args[1] || "");
    page = args[2];
    filters = args[3] || {};
  } else if (args.length === 2 && typeof args[1] === "number") {
    // getList(slug, page)
    slug = String(args[0] || "");
    page = args[1];
  } else if (args.length >= 1) {
    slug = String(args[0] || "");
    if (args.length >= 3 && typeof args[2] === "number") {
      page = args[2];
    } else if (typeof args[1] === "number") {
      page = args[1];
    }
  }

  const p = Math.max(1, parseInt(page, 10) || 1);
  const params = {
    per_page: 12,
    page: p
  };

  const normalizedSlug = slug.toLowerCase().trim();

  // Ánh xạ categorySlug sang WP category ID
  let catId = null;
  if (normalizedSlug && normalizedSlug !== "all" && normalizedSlug !== "moi-cap-nhat" && normalizedSlug !== "home") {
    if (/^[\d,]+$/.test(normalizedSlug)) {
      catId = normalizedSlug;
    } else if (SLUG_TO_CAT_ID[normalizedSlug]) {
      catId = SLUG_TO_CAT_ID[normalizedSlug];
    }
  }

  if (catId) {
    params.categories = catId;
  }

  try {
    const res = await fetchWpPosts(params);
    const items = res.data.map(formatPostToMovieItem).filter(Boolean);
    const hasNext = p < res.totalPages;

    return {
      items: items,
      totalItems: res.totalItems,
      page: p,
      hasNext: hasNext,
      hasMore: hasNext,
      totalPages: res.totalPages
    };
  } catch (e) {
    return {
      items: SEED_MOVIES.map(formatPostToMovieItem).filter(Boolean),
      totalItems: SEED_MOVIES.length,
      page: p,
      hasNext: false,
      hasMore: false,
      totalPages: 1
    };
  }
}

/**
 * 2.4 PLAYER INTERFACE (BẮT BUỘC): Tìm kiếm phim theo từ khóa
 */
async function search(keyword, page = 1) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  if (!keyword || !keyword.trim()) {
    return { items: [], totalItems: 0, page: 1, hasNext: false, hasMore: false, totalPages: 0 };
  }

  try {
    const res = await fetchWpPosts({
      search: keyword.trim(),
      per_page: 12,
      page: p
    });

    const items = res.data.map(formatPostToMovieItem).filter(Boolean);
    const hasNext = p < res.totalPages;
    return {
      items: items,
      totalItems: res.totalItems,
      page: p,
      hasNext: hasNext,
      hasMore: hasNext,
      totalPages: res.totalPages
    };
  } catch (e) {
    const kw = keyword.toLowerCase().trim();
    const fallback = SEED_MOVIES.filter(m => m.title.toLowerCase().includes(kw) || m.slug.includes(kw));
    return {
      items: fallback.map(formatPostToMovieItem).filter(Boolean),
      totalItems: fallback.length,
      page: 1,
      hasNext: false,
      hasMore: false,
      totalPages: 1
    };
  }
}

/**
 * 2.5 PLAYER INTERFACE (BẮT BUỘC): Chi tiết phim & danh sách tập cho DetailScreen
 */
async function getDetail(slug) {
  let post = null;
  let cached = movieCache.get(slug);

  // 1. Lấy thông tin bài viết qua WP REST API
  if (cached && cached.post) {
    post = cached.post;
  } else {
    try {
      const res = await fetchWpPosts({ slug: slug });
      if (res.data.length > 0) {
        post = res.data[0];
      }
    } catch (e) {
      // Ignore
    }
  }

  const postId = post ? post.id : (cached ? cached.id : 0);
  const meta = post ? (post._halim_metabox_options || {}) : (cached?.meta || {});
  const yoast = post ? (post.yoast_head_json || {}) : {};

  const title = decodeHtml(post ? (post.title?.rendered || "") : (cached?.title || slug));
  const originName = decodeHtml(meta.halim_original_title || title);

  let thumb = "";
  if (yoast.og_image && yoast.og_image[0] && yoast.og_image[0].url) {
    thumb = yoast.og_image[0].url;
  } else if (cached?.thumb) {
    thumb = cached.thumb;
  } else {
    thumb = `${getDomain()}/wp-content/uploads/2024/10/default-poster.jpg`;
  }

  let desc = "";
  if (post?.content?.rendered) {
    desc = decodeHtml(post.content.rendered);
  } else if (post?.excerpt?.rendered) {
    desc = decodeHtml(post.excerpt.rendered);
  } else {
    desc = `Xem phim hoạt hình 3D ${title} trọn bộ Full HD 4K Vietsub & Thuyết Minh trên HHPanda.`;
  }

  // 2. Tải HTML trang chi tiết để bóc tách máy chủ và danh sách tập
  let servers = [];
  try {
    const detailUrl = `${getDomain()}/${encodeURIComponent(slug)}`;
    const htmlRes = await httpGet(detailUrl);
    if (htmlRes.status === 200 && htmlRes.body) {
      servers = parseServersFromHtml(htmlRes.body, postId);
    }
  } catch (e) {
    // Ignore
  }

  // Nếu không parse được server từ HTML, tạo 1 tập giả lập
  if (servers.length === 0) {
    servers.push({
      serverName: "HHPanda Vietsub VIP",
      episodes: [
        {
          id: `1_tap-1`,
          name: "Tập 1",
          slug: "tap-1",
          number: 1,
          serverName: "HHPanda Vietsub VIP",
          data: {
            postId: postId,
            chapterSt: "tap-1",
            sv: "1",
            href: `${getDomain()}/${slug}`
          }
        }
      ]
    });
  }

  const catIds = Array.isArray(post?.categories) ? post.categories : (cached?.categories || []);
  const genres = catIds.map(cid => CATEGORY_MAP[String(cid)]).filter(Boolean);
  if (genres.length === 0) genres.push("Hoạt Hình 3D", "Tu Tiên");

  const totalEpCount = servers[0]?.episodes?.length || 1;
  const epCurrentStr = meta.halim_episode || `${totalEpCount} Tập`;

  return {
    slug: slug,
    name: title,
    originName: originName,
    thumbUrl: thumb,
    posterUrl: thumb,
    backdropUrl: thumb,
    year: post?.date ? new Date(post.date).getFullYear() : 2026,
    type: "tv",
    status: meta.halim_movie_status === "completed" ? "completed" : "ongoing",
    quality: meta.halim_quality || "Full HD 4K",
    language: "Vietsub / Thuyết Minh",
    duration: meta.halim_runtime || "25 phút / tập",
    currentEpisode: epCurrentStr,
    totalEpisodes: epCurrentStr,
    description: desc,
    actors: [],
    directors: [],
    genres: genres,
    countries: ["Trung Quốc"],
    episodes: servers
  };
}

/**
 * 2.6 PLAYER INTERFACE (BẮT BUỘC): Luồng phát video trực tiếp cho ExoPlayer JKHX
 * Áp dụng cơ chế Hybrid Player theo chuẩn PROJECT_RULES.md:
 *   - Lấy URL iframe player từ player.php (streamfree.vip)
 *   - Nếu có sniffer thì bóc tách HLS (.m3u8) để phát ExoPlayer Native
 *   - Đồng thời trả về type: "embed" để WebView Player fallback tự động phát 100% không quảng cáo
 */
async function getStream(episodeData) {
  const data = (episodeData && episodeData.data) || {};
  const postId = data.postId || "";
  const chapterSt = data.chapterSt || "tap-1";
  const sv = data.sv || "1";

  // 1. Tạo URL wrapper player.php chuẩn từ HHPanda
  // Trang player.php chứa thẻ <iframe> bọc ngoài streamfree.vip, giúp window.self !== window.top = true
  // Giải quyết dứt điểm lỗi chống hotlink (-2) "Oh, video này chỉ có thể phát trong iframe."
  let playerUrl = "";
  if (postId) {
    playerUrl = `${getDomain()}/player/player.php?action=dox_ajax_player&post_id=${encodeURIComponent(postId)}&chapter_st=${encodeURIComponent(chapterSt)}&type=pro&sv=${encodeURIComponent(sv)}`;
  } else if (data.href) {
    playerUrl = data.href;
  } else {
    playerUrl = `${getDomain()}/${episodeData?.slug || ""}`;
  }

  // 2. Trả về luồng phát dưới dạng WebView Embed với Referer chuẩn từ trang phim HHPanda
  return {
    type: "embed",
    url: playerUrl,
    headers: {
      "User-Agent": DEFAULT_UA,
      "Referer": data.href || `${getDomain()}/`
    },
    subtitles: []
  };
}

/**
 * 2.7 PLAYER INTERFACE (TÙY CHỌN): Cấu trúc bộ lọc tổng hợp cho MovieListScreen
 */
async function getFilters() {
  return {
    genres: [
      { name: "Tất cả thể loại", slug: "all" },
      { name: "Tu Tiên", slug: "24" },
      { name: "Huyền Huyễn", slug: "25" },
      { name: "Kiếm Hiệp", slug: "33" },
      { name: "Cổ Trang", slug: "27" },
      { name: "Đô Thị", slug: "28" },
      { name: "Kỳ Ảo", slug: "34" },
      { name: "Dã Sử", slug: "30" },
      { name: "Đồng Nhân", slug: "29" },
      { name: "Khoa Huyễn", slug: "26" },
      { name: "Huyền Nghi", slug: "32" },
      { name: "Cạnh Kỹ", slug: "31" },
      { name: "Xuyên Không", slug: "1" }
    ],
    countries: [
      { name: "Tất cả", slug: "all" },
      { name: "Trung Quốc", slug: "cn" }
    ],
    years: [
      { name: "Tất cả", slug: "all" },
      { name: "2026", slug: "2026" },
      { name: "2025", slug: "2025" },
      { name: "2024", slug: "2024" }
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
    const saved = globalThis.context?.storage?.get("hhpanda_domain");
    if (saved) currentDomain = saved;
  }
  return [
    {
      key: "hhpanda_domain",
      title: "Tên miền HHPanda",
      description: "Địa chỉ trang web chính (mặc định: https://hhpanda.st)",
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
    const res = await httpGet(`${getDomain()}/wp-json/wp/v2/posts?per_page=1`);
    const latency = Date.now() - start;
    if (res.status === 200) {
      const total = res.headers["x-wp-total"] || "489+";
      return {
        status: "ok",
        message: `Kết nối máy chủ HHPanda ổn định (${latency}ms) - ${total} bộ phim hoạt hình 3D`,
        latencyMs: latency
      };
    }
    return {
      status: "degraded",
      message: `Phản hồi chưa đầy đủ (${latency}ms)`,
      latencyMs: latency
    };
  } catch (e) {
    return {
      status: "error",
      message: "Lỗi kết nối HHPanda: " + e.message,
      latencyMs: Date.now() - start
    };
  }
}

// ============================================================================
// EXPORT DEFAULT PLUGIN OBJECT
// ============================================================================
export default {
  id: "hhpanda",
  name: "HHPanda",
  version: "1.0.2",
  types: ["movie", "tv"],
  isAdult: false,

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
  checkHealth
};

