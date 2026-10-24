// plugins/nguonc/plugin.js
// NguonC Provider for JKHX Player using NguonC API (phim.nguonc.com)
// Tuân thủ kiến trúc phân tầng chuẩn mới nhất:
//   - Nhóm 1: Các hàm phục vụ crawl dữ liệu từ nguồn NguonC API (Crawler / Source API Layer)
//   - Nhóm 2: Các hàm phục vụ fill data lên JKHX Player (Player Contract Layer: Bắt buộc & Tùy chọn)

// ============================================================================
// CẤU HÌNH & HẰNG SỐ NGUỒN NGUONC
// ============================================================================
const DEFAULT_BASE_URL = "https://phim.nguonc.com/api";
const DEFAULT_CDN = "https://phim.nguonc.com";

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
 * Lấy CDN Domain linh hoạt
 */
function getCdnDomain() {
  if (typeof globalThis !== 'undefined') {
    const savedCdn = globalThis.context?.storage?.get("cdn_domain");
    if (savedCdn && savedCdn.trim()) return savedCdn.trim().replace(/\/+$/, '');
  }
  return DEFAULT_CDN;
}

/**
 * Bản đồ nhận diện slug chuẩn của NguonC để tự động điều hướng endpoint chính xác
 */
const KNOWN_SLUG_MAP = {
  // 1. Phim mới cập nhật
  "phim-moi-cap-nhat": { type: "films", slug: "phim-moi-cap-nhat" },
  "phim-moi": { type: "films", slug: "phim-moi-cap-nhat" },

  // 2. Danh mục danh sách (/api/films/danh-sach/{slug})
  "phim-bo": { type: "danh-sach", slug: "phim-bo" },
  "phim-le": { type: "danh-sach", slug: "phim-le" },
  "hoat-hinh": { type: "danh-sach", slug: "hoat-hinh" },
  "tv-shows": { type: "danh-sach", slug: "tv-shows" },
  "shows": { type: "danh-sach", slug: "tv-shows" },

  // 3. Thể loại (/api/films/the-loai/{slug})
  "hanh-dong": { type: "the-loai", slug: "hanh-dong" },
  "phieu-luu": { type: "the-loai", slug: "phieu-luu" },
  "hoat-hinh-the-loai": { type: "the-loai", slug: "hoat-hinh" },
  "phim-hai": { type: "the-loai", slug: "phim-hai" },
  "hai": { type: "the-loai", slug: "phim-hai" },
  "hinh-su": { type: "the-loai", slug: "hinh-su" },
  "tai-lieu": { type: "the-loai", slug: "tai-lieu" },
  "chinh-kich": { type: "the-loai", slug: "chinh-kich" },
  "gia-dinh": { type: "the-loai", slug: "gia-dinh" },
  "gia-tuong": { type: "the-loai", slug: "gia-tuong" },
  "lich-su": { type: "the-loai", slug: "lich-su" },
  "kinh-di": { type: "the-loai", slug: "kinh-di" },
  "phim-nhac": { type: "the-loai", slug: "phim-nhac" },
  "nhac": { type: "the-loai", slug: "phim-nhac" },
  "bi-an": { type: "the-loai", slug: "bi-an" },
  "lang-man": { type: "the-loai", slug: "lang-man" },
  "khoa-hoc-vien-tuong": { type: "the-loai", slug: "khoa-hoc-vien-tuong" },
  "gay-can": { type: "the-loai", slug: "gay-can" },
  "chien-tranh": { type: "the-loai", slug: "chien-tranh" },
  "tam-ly": { type: "the-loai", slug: "tam-ly" },
  "tinh-cam": { type: "the-loai", slug: "tinh-cam" },
  "co-trang": { type: "the-loai", slug: "co-trang" },
  "mien-tay": { type: "the-loai", slug: "mien-tay" },
  "phim-18": { type: "the-loai", slug: "phim-18" },

  // 4. Quốc gia (/api/films/quoc-gia/{slug})
  "my": { type: "quoc-gia", slug: "my" },
  "au-my": { type: "quoc-gia", slug: "my" },
  "nhat-ban": { type: "quoc-gia", slug: "nhat-ban" },
  "trung-quoc": { type: "quoc-gia", slug: "trung-quoc" },
  "han-quoc": { type: "quoc-gia", slug: "han-quoc" },
  "anh": { type: "quoc-gia", slug: "anh" },
  "hong-kong": { type: "quoc-gia", slug: "hong-kong" },
  "phap": { type: "quoc-gia", slug: "phap" },
  "canada": { type: "quoc-gia", slug: "canada" },
  "thai-lan": { type: "quoc-gia", slug: "thai-lan" },
  "duc": { type: "quoc-gia", slug: "duc" },
  "an-do": { type: "quoc-gia", slug: "an-do" },
  "tay-ban-nha": { type: "quoc-gia", slug: "tay-ban-nha" },
  "viet-nam": { type: "quoc-gia", slug: "viet-nam" },
  "italy": { type: "quoc-gia", slug: "italy" },
  "y": { type: "quoc-gia", slug: "italy" },
  "dai-loan": { type: "quoc-gia", slug: "dai-loan" },
  "uc": { type: "quoc-gia", slug: "uc" },
  "philippines": { type: "quoc-gia", slug: "philippines" },
  "phi-lip-pin": { type: "quoc-gia", slug: "philippines" },
  "bi": { type: "quoc-gia", slug: "bi" },
  "nga": { type: "quoc-gia", slug: "nga" },
  "brazil": { type: "quoc-gia", slug: "brazil" },
  "bra-xin": { type: "quoc-gia", slug: "brazil" },

  // 5. Ngôn ngữ (/api/films/ngon-ngu/{slug})
  "vietsub": { type: "ngon-ngu", slug: "vietsub" },
  "thuyet-minh": { type: "ngon-ngu", slug: "thuyet-minh" },
  "long-tieng": { type: "ngon-ngu", slug: "long-tieng" }
};

// ============================================================================
// NHÓM 1: CÁC HÀM CRAWL DỮ LIỆU TỪ NGUỒN NGUONC API (phim.nguonc.com)
// ============================================================================

/**
 * 1.1 HELPER: Xử lý link ảnh (hỗ trợ cả đường dẫn tương đối và tuyệt đối)
 */
function buildImageUrl(path, cdnDomain = getCdnDomain()) {
  if (!path) return "";
  if (typeof path === 'object') {
    path = path.url || path.path || path.src || "";
  }
  const strPath = String(path || "").trim();
  if (!strPath || strPath === "[object Object]") return "";
  if (strPath.startsWith("http://") || strPath.startsWith("https://")) return strPath;
  const cleanPath = strPath.replace(/^\/+/, '');
  const cleanCdn = String(cdnDomain || getCdnDomain()).replace(/\/+$/, '');
  return `${cleanCdn}/${cleanPath}`;
}

/**
 * 1.2 HELPER: Trích xuất năm phát hành an toàn
 */
function extractYear(dateRaw) {
  if (!dateRaw) return null;
  const match = String(dateRaw).match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0]) : null;
}

/**
 * 1.3 HELPER: Xác định endpoint URL tương ứng từ type và slug
 */
function resolveEndpoint(type, slug) {
  const base = getBaseUrl();
  const cleanSlug = (slug || "").trim();
  const cleanType = (type || "").trim();

  // 1. Phim mới cập nhật
  if (cleanType === "films" || cleanSlug === "phim-moi-cap-nhat" || cleanSlug === "phim-moi") {
    return `${base}/films/phim-moi-cap-nhat`;
  }

  // 2. Tra cứu qua từ điển KNOWN_SLUG_MAP nếu slug đã biết rõ loại
  if (KNOWN_SLUG_MAP[cleanSlug]) {
    const info = KNOWN_SLUG_MAP[cleanSlug];
    if (info.type === "films") {
      return `${base}/films/phim-moi-cap-nhat`;
    }
    return `${base}/films/${info.type}/${info.slug}`;
  }

  // 3. Nếu truyền type cụ thể
  if (cleanType === "danh-sach" || cleanType === "category") {
    return `${base}/films/danh-sach/${cleanSlug}`;
  }
  if (cleanType === "the-loai" || cleanType === "genre") {
    return `${base}/films/the-loai/${cleanSlug}`;
  }
  if (cleanType === "quoc-gia" || cleanType === "country") {
    return `${base}/films/quoc-gia/${cleanSlug}`;
  }
  if (cleanType === "nam" || cleanType === "nam-phat-hanh" || cleanType === "year") {
    return `${base}/films/nam-phat-hanh/${cleanSlug}`;
  }
  if (cleanType === "ngon-ngu" || cleanType === "language") {
    return `${base}/films/ngon-ngu/${cleanSlug}`;
  }

  // 4. Nếu slug là năm gồm 4 chữ số (ví dụ: "2024", "2025")
  if (/^\d{4}$/.test(cleanSlug)) {
    return `${base}/films/nam-phat-hanh/${cleanSlug}`;
  }

  // 5. Fallback mặc định theo danh mục danh sách
  if (cleanSlug) {
    return `${base}/films/danh-sach/${cleanSlug}`;
  }

  return `${base}/films/phim-moi-cap-nhat`;
}

/**
 * 1.4 CRAWLER: Lấy danh sách phim theo danh mục / thể loại / quốc gia / năm phân trang & bộ lọc
 */
async function crawlList(type, slug, page = 1, filters = {}) {
  try {
    let targetType = (type || "").trim();
    let targetSlug = (slug || "").trim();

    const filterCategory = (filters?.category || "").trim();
    const filterCountry = (filters?.country || "").trim();
    const filterYear = (filters?.year || "").trim();
    const filterLanguage = (filters?.language || "").trim();

    // Điều hướng endpoint chính xác theo tiêu chí lọc người dùng chọn
    if (filterCategory) {
      targetType = "the-loai";
      targetSlug = filterCategory;
    } else if (filterCountry) {
      targetType = "quoc-gia";
      targetSlug = filterCountry;
    } else if (filterYear) {
      targetType = "nam-phat-hanh";
      targetSlug = filterYear;
    } else if (filterLanguage) {
      targetType = "ngon-ngu";
      targetSlug = filterLanguage;
    }

    const endpointUrl = resolveEndpoint(targetType, targetSlug);
    const url = `${endpointUrl}?page=${page}`;
    const res = await fetch(url);
    const text = await res.text();

    if (text.trim().startsWith('<')) {
      return { rawItems: [], pagination: {} };
    }

    const json = JSON.parse(text);
    const rawItems = json.items || json.data?.items || [];
    const pagination = json.paginate || {};

    return { rawItems, pagination };
  } catch (e) {
    return { rawItems: [], pagination: {} };
  }
}

/**
 * 1.5 CRAWLER: Tìm kiếm phim theo từ khóa
 */
async function crawlSearch(keyword, page = 1) {
  try {
    const base = getBaseUrl();
    const url = `${base}/films/search?keyword=${encodeURIComponent(keyword)}&page=${page}`;
    const res = await fetch(url);
    const text = await res.text();

    if (text.trim().startsWith('<')) {
      return { rawItems: [], pagination: {} };
    }

    const json = JSON.parse(text);
    const rawItems = json.items || json.data?.items || [];
    const pagination = json.paginate || {};

    return { rawItems, pagination };
  } catch (e) {
    return { rawItems: [], pagination: {} };
  }
}

/**
 * 1.6 CRAWLER: Lấy chi tiết thông tin và danh sách tập của phim
 */
async function crawlDetail(slug) {
  const base = getBaseUrl();
  const url = `${base}/film/${slug}`;
  const res = await fetch(url);
  const json = await res.json();

  if (json.status !== "success" || !json.movie) {
    throw new Error(`NguonC: Không tìm thấy dữ liệu cho phim ${slug}`);
  }

  return json.movie;
}

const DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const CF_FALLBACK_PROXY = "https://j-proxy-fallback.khx.workers.dev/?url=";
const CODETABS_PROXY = "https://api.codetabs.com/v1/proxy?quest=";

/**
 * 1.7 HELPER: Trích xuất Video Hash từ URL embed chuẩn xác (tương thích Hermes / QuickJS)
 */
function extractVideoHash(urlStr) {
  if (!urlStr) return "";
  const match = urlStr.match(/hash=([a-f0-9]{32})/i) 
             || urlStr.match(/\/([a-f0-9]{32})(?:\/|\.|$|\?)/i)
             || urlStr.match(/([a-f0-9]{32})/i);
  return match ? match[1] : "";
}

/**
 * 1.8 HELPER: Lấy Origin từ URL an toàn
 */
function getOrigin(urlStr) {
  if (!urlStr) return "https://embed.streamc.xyz";
  const match = String(urlStr).match(/^(https?:\/\/[^\/]+)/i);
  return match ? match[1] : "https://embed.streamc.xyz";
}

/**
 * 1.9 HELPER: Tạo AbortSignal timeout an toàn cho môi trường QuickJS Sandbox
 */
function getTimeoutSignal(ms = 5000) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    try {
      return AbortSignal.timeout(ms);
    } catch (e) {}
  }
  if (typeof AbortController !== 'undefined') {
    const controller = new AbortController();
    setTimeout(() => {
      try { controller.abort(); } catch (e) {}
    }, ms);
    return controller.signal;
  }
  return undefined;
}

/**
 * 1.10 CRAWLER / EXTRACTOR: Bóc tách HLS (m3u8) trực tiếp từ StreamC Bootstrap API (100% Zero Proxy - Chuẩn Nuvio)
 * Tự động gọi API bootstrap nội bộ của StreamC với playlist_format = "hls" và dự phòng đa tầng qua Cloudflare Worker / Codetabs / HTML Regex.
 */
async function tryFetchDirectHls(embedUrl) {
  if (!embedUrl) return null;
  const videoHash = extractVideoHash(embedUrl);
  if (!videoHash) return null;

  const origin = getOrigin(embedUrl);
  const postBody = {
    action: "bootstrap",
    referrer: "https://phim.nguonc.com/",
    frame_origins: ["https://phim.nguonc.com"],
    request_grant: true,
    playlist_format: "hls",
    pretty_url: true,
    path_chunks: true,
    bootstrap_format: "json"
  };

  // 1. Thử gọi trực tiếp tại Client qua Bootstrap API (Hỗ trợ HTTP/2 trên cả Node test-runner và QuickJS Sandbox OkHttpClient)
  try {
    // 1.1 Nếu chạy trên Node.js (test-runner)
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const http2 = await import('http2');
        const u = new URL(embedUrl);
        const playlistUrl = await new Promise((resolve) => {
          const client = http2.connect(u.origin);
          client.on("error", () => { client.close(); resolve(null); });
          const req = client.request({
            ":method": "POST",
            ":path": u.pathname + u.search,
            ":authority": u.host,
            ":scheme": "https",
            "user-agent": DEFAULT_UA,
            "referer": embedUrl,
            "origin": origin,
            "content-type": "application/json",
            "accept": "*/*"
          });
          let resData = "";
          req.on("data", (chunk) => { resData += chunk; });
          req.on("end", () => {
            client.close();
            try {
              const json = JSON.parse(resData);
              resolve(json?.preissued?.playlist || json?.playlist || null);
            } catch {
              resolve(null);
            }
          });
          req.on("error", () => { client.close(); resolve(null); });
          req.setTimeout(8000, () => { req.close(); client.close(); resolve(null); });
          req.write(JSON.stringify(postBody));
          req.end();
        });

        if (playlistUrl) {
          const m3u8Text = await new Promise((resolve) => {
            const pu = new URL(playlistUrl);
            const client = http2.connect(pu.origin);
            client.on("error", () => { client.close(); resolve(null); });
            const req = client.request({
              ":method": "GET",
              ":path": pu.pathname + pu.search,
              ":authority": pu.host,
              ":scheme": "https",
              "user-agent": DEFAULT_UA,
              "referer": embedUrl
            });
            let data = "";
            req.on("data", (chunk) => { data += chunk; });
            req.on("end", () => {
              client.close();
              resolve(data);
            });
            req.on("error", () => { client.close(); resolve(null); });
            req.setTimeout(8000, () => { req.close(); client.close(); resolve(null); });
            req.end();
          });

          if (m3u8Text && m3u8Text.includes('#EXTM3U')) {
            return {
              url: playlistUrl,
              content: m3u8Text
            };
          }
          return {
            url: playlistUrl,
            content: null
          };
        }
      } catch (e) {}
    }

    // 1.2 Môi trường Android QuickJS Sandbox (fetch bridge qua OkHttpClient hỗ trợ HTTP/2 natively)
    const res = await fetch(embedUrl, {
      method: "POST",
      headers: {
        "Accept": "*/*",
        "Content-Type": "application/json",
        "Referer": embedUrl,
        "Origin": origin,
        "User-Agent": DEFAULT_UA
      },
      body: JSON.stringify(postBody)
    });
    if (res.ok) {
      const data = await res.json();
      const playlistUrl = data?.preissued?.playlist || data?.playlist || (data?.file && String(data.file).includes('.m3u8') ? data.file : null);
      if (playlistUrl) {
        // Tải nội dung manifest M3U8 từ signed URL
        try {
          const playRes = await fetch(playlistUrl, {
            headers: {
              "User-Agent": DEFAULT_UA,
              "Referer": embedUrl,
              "Origin": origin
            }
          });
          if (playRes.ok) {
            const m3u8Text = await playRes.text();
            if (m3u8Text && m3u8Text.includes('#EXTM3U')) {
              return {
                url: playlistUrl,
                content: m3u8Text
              };
            }
          }
        } catch (e) {}

        return {
          url: playlistUrl,
          content: null
        };
      }
    }
  } catch (e) {}

  // 2. Dự phòng 1: Cloudflare Worker Proxy (khi mạng ISP chặn hoặc Cloudflare Challenge)
  const proxyHeaders = {
    "User-Agent": DEFAULT_UA,
    "Referer": embedUrl,
    "Origin": origin,
    "Content-Type": "application/json"
  };
  try {
    const cfUrl = CF_FALLBACK_PROXY + encodeURIComponent(embedUrl);
    const res = await fetch(cfUrl, {
      method: "POST",
      headers: proxyHeaders,
      body: JSON.stringify(postBody)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.preissued && data.preissued.playlist) {
        return data.preissued.playlist;
      }
      if (data && data.playlist) {
        return data.playlist;
      }
    }
  } catch (e) {}

  // 3. Dự phòng 2: Codetabs Proxy
  try {
    const ctUrl = CODETABS_PROXY + encodeURIComponent(embedUrl);
    const res = await fetch(ctUrl, {
      method: "POST",
      headers: proxyHeaders,
      body: JSON.stringify(postBody)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.preissued && data.preissued.playlist) {
        return data.preissued.playlist;
      }
    }
  } catch (e) {}

  // 4. Dự phòng 3: Regex trích xuất m3u8 từ mã nguồn HTML embed
  try {
    const res = await fetch(embedUrl, {
      headers: {
        "User-Agent": DEFAULT_UA,
        "Referer": "https://phim.nguonc.com/"
      }
    });
    if (res.ok) {
      const html = await res.text();
      const m3u8Regex = /file:\s*["']([^"']+\.m3u8[^"']*)["']|source:\s*["']([^"']+\.m3u8[^"']*)["']|src:\s*["']([^"']+\.m3u8[^"']*)["']|["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/;
      const match = html.match(m3u8Regex);
      if (match) {
        const directUrl = match[1] || match[2] || match[3] || match[4];
        if (directUrl) return directUrl.replace(/\\/g, '');
      }
    }
  } catch (e) {}

  return null;
}

const IPAD_CRIOS_UA = "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1";

/**
 * 1.11 HELPER: Mã hóa chuỗi sang Base64 tương thích đa môi trường (QuickJS-NG, Hermes, Node, Browser)
 */
function toBase64(str) {
  if (typeof btoa === 'function') {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {}
  }
  if (typeof Buffer !== 'undefined') {
    try {
      return Buffer.from(str).toString('base64');
    } catch (e) {}
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const utf8Bytes = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 128) utf8Bytes.push(c);
    else if (c < 2048) utf8Bytes.push((c >> 6) | 192, (c & 63) | 128);
    else utf8Bytes.push((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128);
  }
  let out = '';
  for (let i = 0; i < utf8Bytes.length; i += 3) {
    const b1 = utf8Bytes[i], b2 = utf8Bytes[i + 1], b3 = utf8Bytes[i + 2];
    out += chars[b1 >> 2];
    out += chars[((b1 & 3) << 4) | (b2 ? b2 >> 4 : 0)];
    out += (b2 !== undefined) ? chars[((b2 & 15) << 2) | (b3 ? b3 >> 6 : 0)] : '=';
    out += (b3 !== undefined) ? chars[b3 & 63] : '=';
  }
  return out;
}

/**
 * 1.12 HELPER: Chuyển đổi nội dung playlist M3U8 thành Data URI Base64
 */
function convertM3u8ToDataUri(m3u8Content) {
  return "data:application/vnd.apple.mpegurl;base64," + toBase64(m3u8Content);
}

/**
 * 1.13 HELPER: Chuẩn hóa URL tuyệt đối và tự động cắt bỏ Segment Mồi 0000 của NguonC / StreamC
 * - Nhận diện segment đầu tiên nếu chứa chuỗi mồi 0000 (chặn 403 / bẫy crawler)
 * - Loại bỏ hoàn toàn block #EXTINF và URL của segment mồi 0000
 * - Cập nhật #EXT-X-MEDIA-SEQUENCE tăng lên 1 theo chuẩn RFC 8216 HLS
 * - Bảo toàn 100% các tag mã hóa (#EXT-X-KEY), thông số stream và các segment video thật tiếp theo
 */
function sanitizeNguonCM3u8(content, baseUrl) {
  if (!content) return content;
  const lines = content.split('\n');
  const outputLines = [];
  let foundFirstSegment = false;
  let removedBait = false;
  let mediaSequenceLineIdx = -1;
  let currentExtinf = null;
  let currentTags = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#EXT-X-MEDIA-SEQUENCE:')) {
      mediaSequenceLineIdx = outputLines.length;
      outputLines.push(line);
      continue;
    }

    if (line.startsWith('#')) {
      // Chuẩn hóa URI trong #EXT-X-KEY nếu là relative path
      let processedLine = line;
      if (baseUrl && line.startsWith('#EXT-X-KEY')) {
        processedLine = line.replace(/URI=["']([^"']+)["']/g, (m, uri) => {
          if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:')) return m;
          try {
            return `URI="${new URL(uri, baseUrl).href}"`;
          } catch (e) {
            return m;
          }
        });
      }

      if (line.startsWith('#EXTINF:')) {
        currentExtinf = processedLine;
      } else {
        if (currentExtinf) {
          currentTags.push(processedLine);
        } else {
          outputLines.push(processedLine);
        }
      }
      continue;
    }

    // Dòng URI của segment (không bắt đầu bằng #)
    let segmentUri = line;
    if (baseUrl && !segmentUri.startsWith('http://') && !segmentUri.startsWith('https://') && !segmentUri.startsWith('data:')) {
      try {
        segmentUri = new URL(segmentUri, baseUrl).href;
      } catch (e) {}
    }

    if (!foundFirstSegment) {
      foundFirstSegment = true;
      // NguonC / StreamC luôn đặt segment đầu tiên là mồi bẫy crawler (chặn 403 hoặc corrupt):
      // Ví dụ: streamaaa0000.png, segment_0000.ts, 0000.ts...
      // Bỏ qua hoàn toàn segment đầu tiên và bắt đầu phát chuẩn từ segment 0001
      removedBait = true;
      currentExtinf = null;
      currentTags = [];
      continue;
    }

    // Segment video thật: đẩy vào danh sách
    if (currentExtinf) {
      outputLines.push(currentExtinf);
      currentExtinf = null;
    }
    for (const tag of currentTags) {
      outputLines.push(tag);
    }
    currentTags = [];
    outputLines.push(segmentUri);
  }

  // Nếu đã gỡ bỏ segment mồi, đồng bộ tăng #EXT-X-MEDIA-SEQUENCE lên 1 để ExoPlayer phát chuẩn timeline
  if (removedBait) {
    if (mediaSequenceLineIdx !== -1) {
      const seqMatch = outputLines[mediaSequenceLineIdx].match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/);
      const currentSeq = seqMatch ? parseInt(seqMatch[1], 10) : 0;
      outputLines[mediaSequenceLineIdx] = `#EXT-X-MEDIA-SEQUENCE:${currentSeq + 1}`;
    } else {
      const extm3uIdx = outputLines.findIndex(l => l.startsWith('#EXTM3U'));
      if (extm3uIdx !== -1) {
        outputLines.splice(extm3uIdx + 1, 0, '#EXT-X-MEDIA-SEQUENCE:1');
      }
    }
  }

  return outputLines.join('\n');
}

/**
 * 1.14 HELPER: Chuẩn hóa toàn bộ relative URL của các segment .ts trong file m3u8 thành absolute URL
 */
function makeAbsoluteM3u8(content, baseUrl) {
  return sanitizeNguonCM3u8(content, baseUrl);
}

/**
 * 1.15 HELPER: Chuẩn bị stream HLS sạch từ URL hoặc nội dung M3U8
 */
async function prepareSanitizedHlsStream(streamUrlOrContent, baseUrl, streamHeaders) {
  if (!streamUrlOrContent) return null;

  // Nếu là nội dung chuỗi playlist trực tiếp
  if (typeof streamUrlOrContent === 'string' && streamUrlOrContent.includes('#EXTM3U')) {
    const cleanM3u8 = sanitizeNguonCM3u8(streamUrlOrContent, baseUrl);
    return {
      type: "m3u8",
      url: convertM3u8ToDataUri(cleanM3u8),
      headers: streamHeaders,
      subtitles: []
    };
  }

  // Nếu là URL m3u8
  if (typeof streamUrlOrContent === 'string' && (streamUrlOrContent.startsWith('http://') || streamUrlOrContent.startsWith('https://'))) {
    try {
      const res = await fetch(streamUrlOrContent, {
        headers: streamHeaders,
        signal: getTimeoutSignal(5000)
      });
      if (res.ok) {
        const text = await res.text();
        if (text && text.includes('#EXTM3U') && text.includes('#EXTINF')) {
          const cleanM3u8 = sanitizeNguonCM3u8(text, streamUrlOrContent);
          return {
            type: "m3u8",
            url: convertM3u8ToDataUri(cleanM3u8),
            headers: streamHeaders,
            subtitles: []
          };
        }
      }
    } catch (e) {}

    // Fallback trả về URL gốc
    return {
      type: "m3u8",
      url: streamUrlOrContent,
      headers: streamHeaders,
      subtitles: []
    };
  }

  return null;
}

/**
 * 1.12 CRAWLER / SNIFFER: Bóc tách file m3u8 từ trang embed thông qua Headless WebView Sniffer
 * Giả lập iPad Chrome (CriOS) để StreamC chọn playlist_format = "hls" (Native HLS unencrypted 100%).
 * Tự động hook URL.createObjectURL, streamAccess, jwplayer, video.src, loại trừ 100% API nội bộ conf.php và quảng cáo.
 */
async function sniffDirectHls(embedUrl) {
  if (!embedUrl) return null;
  if (typeof globalThis === 'undefined' || !globalThis.context?.webview?.sniff) return null;

  const snifferScript = `
    (function() {
      if (window.__sniffer_injected) return;
      window.__sniffer_injected = true;

      // 0. Giả lập môi trường iOS/iPad không MSE để StreamC chuyển sang Native HLS
      try {
        delete window.MediaSource;
        delete window.ManagedMediaSource;
        window.MediaSource = undefined;
        window.ManagedMediaSource = undefined;
      } catch (e) {}

      // 1. Giả lập document.referrer trong DOM luôn là phim.nguonc.com
      try {
        Object.defineProperty(document, 'referrer', {
          get: function() { return 'https://phim.nguonc.com/'; },
          configurable: true
        });
      } catch (e) {}

      // Helper kiểm tra URL luồng phát hợp lệ (loại trừ conf.php, embed.php, telemetry, ads)
      function isCandidateStreamUrl(u) {
        if (!u || typeof u !== 'string') return false;
        if (u.includes('conf.php') || u.includes('embed.php') || u.includes('challenges.cloudflare.com') || u.includes('telemetry') || u.includes('/assets/')) return false;
        if (u.endsWith('.js') || u.endsWith('.css') || u.endsWith('.json') || u.endsWith('.png') || u.endsWith('.jpg') || u.endsWith('.svg') || u.endsWith('.ico')) return false;
        // Chấp nhận link m3u8 hoặc luồng StreamC signed playlist token dài >= 80 ký tự
        if (u.includes('.m3u8') || u.includes('/hls/')) return true;
        if (/\\/[A-Za-z0-9_-]{80,}/.test(u)) return true;
        return false;
      }

      // Helper gửi kết quả về app
      function sendReport(payload) {
        if (window.__sniffer_reported) return;
        window.__sniffer_reported = true;
        if (window.__sniffer_bridge && typeof window.__sniffer_bridge.postMessage === 'function') {
          window.__sniffer_bridge.postMessage(JSON.stringify(payload));
        }
      }

      // Helper gửi URL stream m3u8 trực tiếp về app
      function reportDirectUrl(streamUrl) {
        if (!streamUrl || window.__sniffer_reported) return;
        if (!isCandidateStreamUrl(streamUrl)) return;
        let fullUrl = streamUrl;
        try {
          fullUrl = new URL(streamUrl, location.href).href;
        } catch (e) {}
        if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) return;

        sendReport({
          type: 'm3u8_url',
          url: fullUrl
        });
      }

      let pendingMaster = null;

      // Helper gửi nội dung playlist m3u8 về app (ưu tiên playlist chứa #EXTINF để có segment trực tiếp)
      function reportM3u8(content, streamUrl) {
        if (!content || window.__sniffer_reported) return;
        if (typeof content !== 'string' || !content.includes('#EXTM3U')) return;

        // Ưu tiên số 1: Media Playlist chứa các chunk #EXTINF -> Phát trực tiếp không qua mã hóa
        if (content.includes('#EXTINF')) {
          sendReport({
            type: 'm3u8_content',
            content: content,
            url: streamUrl || location.href
          });
          return;
        }

        // Nếu là Master Playlist, lưu lại và đợi 1.5s xem Media Playlist con có được StreamC nạp không
        pendingMaster = { content, url: streamUrl || location.href };
        setTimeout(function() {
          if (!window.__sniffer_reported && pendingMaster) {
            sendReport({
              type: 'm3u8_content',
              content: pendingMaster.content,
              url: pendingMaster.url
            });
          }
        }, 1500);
      }

      // 4. Hook API streamSandbox nội bộ của StreamC
      try {
        window.streamSandbox = {
          playlistResources: function(m3u8Text, streamUrl) {
            if (m3u8Text && m3u8Text.includes('#EXTM3U')) {
              reportM3u8(m3u8Text, streamUrl || location.href);
            }
          },
          pipeline: function(stage) {
            if (stage && stage.playlist && stage.playlist.includes('#EXTM3U')) {
              reportM3u8(stage.playlist, location.href);
            }
          }
        };
      } catch (e) {}

      // 5. Hook HTMLMediaElement.prototype.src để bắt link HLS gán trực tiếp vào thẻ video
      try {
        const origSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
        if (origSrcDescriptor && origSrcDescriptor.set) {
          Object.defineProperty(HTMLMediaElement.prototype, 'src', {
            set: function(val) {
              if (typeof val === 'string' && isCandidateStreamUrl(val)) {
                reportDirectUrl(val);
              }
              return origSrcDescriptor.set.call(this, val);
            },
            get: function() {
              return origSrcDescriptor.get.call(this);
            },
            configurable: true
          });
        }
      } catch (e) {}

      // 6. Hook Element.prototype.setAttribute cho thẻ <source src="...">
      try {
        const origSetAttribute = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name, val) {
          if (name === 'src' && typeof val === 'string' && isCandidateStreamUrl(val)) {
            reportDirectUrl(val);
          }
          return origSetAttribute.apply(this, arguments);
        };
      } catch (e) {}

      // 7. Hook JWPlayer setup, playlistItem & sources
      try {
        let _jwplayer = window.jwplayer;
        Object.defineProperty(window, 'jwplayer', {
          get: function() { return _jwplayer; },
          set: function(fn) {
            _jwplayer = function() {
              const inst = fn.apply(this, arguments);
              try {
                if (inst && typeof inst.setup === 'function') {
                  const origSetup = inst.setup.bind(inst);
                  inst.setup = function(cfg) {
                    if (cfg && cfg.file && isCandidateStreamUrl(cfg.file)) {
                      reportDirectUrl(cfg.file);
                    }
                    return origSetup.apply(this, arguments);
                  };
                }
                if (inst && typeof inst.on === 'function') {
                  inst.on('playlistItem', function(item) {
                    try {
                      if (item && item.file && isCandidateStreamUrl(item.file)) reportDirectUrl(item.file);
                      if (item && item.sources) {
                        for (const s of item.sources) {
                          if (s && s.file && isCandidateStreamUrl(s.file)) reportDirectUrl(s.file);
                        }
                      }
                    } catch (e) {}
                  });
                }
              } catch (e) {}
              return inst;
            };
          },
          configurable: true
        });
      } catch (e) {}

      // 8. ĐÒN HOOK URL.createObjectURL (bắt Blob chứa m3u8)
      try {
        const origCreateObjectURL = URL.createObjectURL;
        URL.createObjectURL = function(blob) {
          try {
            if (blob && typeof blob.text === 'function') {
              blob.text().then(function(text) {
                if (text && text.includes('#EXTM3U')) {
                  reportM3u8(text, location.href);
                }
              }).catch(function() {});
            }
          } catch (e) {}
          return origCreateObjectURL.apply(this, arguments);
        };
      } catch (e) {}

      // 9. ĐÒN HOOK WebCrypto decrypt
      try {
        if (window.crypto && window.crypto.subtle) {
          const proto = Object.getPrototypeOf(window.crypto.subtle);
          const origDecrypt = proto.decrypt.bind(window.crypto.subtle);
          proto.decrypt = async function() {
            const result = await origDecrypt.apply(this, arguments);
            try {
              const text = new TextDecoder('utf-8').decode(result);
              if (text && text.includes('#EXTM3U')) {
                reportM3u8(text, location.href);
              }
            } catch (e) {}
            return result;
          };
        }
      } catch (e) {}

      // 10. ĐÒN HOOK Fetch (bắt URL .m3u8 thực sự)
      try {
        const origFetch = window.fetch;
        window.fetch = async function() {
          const reqUrl = typeof arguments[0] === 'string' ? arguments[0] : (arguments[0]?.url || '');
          if (isCandidateStreamUrl(reqUrl)) {
            reportDirectUrl(reqUrl);
          }
          const res = await origFetch.apply(this, arguments);
          try {
            const clone = res.clone();
            const ct = clone.headers.get('content-type') || '';
            if (isCandidateStreamUrl(reqUrl) || ct.includes('mpegurl')) {
              clone.text().then(function(text) {
                if (text && text.includes('#EXTM3U')) {
                  reportM3u8(text, reqUrl);
                }
              }).catch(function() {});
            }
          } catch (e) {}
          return res;
        };
      } catch (e) {}

      // 11. ĐÒN HOOK XMLHttpRequest
      try {
        const origXhrOpen = XMLHttpRequest.prototype.open;
        const origXhrSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function(method, url) {
          this.__reqUrl = url;
          if (isCandidateStreamUrl(url)) {
            reportDirectUrl(url);
          }
          return origXhrOpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function() {
          this.addEventListener('load', function() {
            try {
              if (this.responseText && this.responseText.includes('#EXTM3U')) {
                reportM3u8(this.responseText, this.__reqUrl);
              }
            } catch (e) {}
          });
          return origXhrSend.apply(this, arguments);
        };
      } catch (e) {}

      // 12. Polling streamAccess.ensure() & getStreamURL()
      setInterval(function() {
        try {
          if (window.streamAccess && typeof window.streamAccess.ensure === 'function') {
            window.streamAccess.ensure().then(function(res) {
              const url = typeof res === 'string' ? res : (res?.playlist || res?.url);
              if (url && isCandidateStreamUrl(url)) reportDirectUrl(url);
            }).catch(function() {});
          }
          if (typeof window.getStreamURL === 'function') {
            window.getStreamURL().then(function(url) {
              if (url && isCandidateStreamUrl(url)) reportDirectUrl(url);
            }).catch(function() {});
          }
        } catch (e) {}
      }, 250);

      // 13. Tự động kích hoạt play trên video/player để StreamC nạp và phục vụ HLS
      setInterval(function() {
        try {
          const videos = document.querySelectorAll('video');
          videos.forEach(function(v) {
            if (v.paused) v.play().catch(function() {});
          });
          const playButtons = document.querySelectorAll('.jw-display-icon-display, .vjs-big-play-button, button[aria-label*="Play"], .play-button, #play, #verification button');
          playButtons.forEach(function(btn) {
            try { btn.click(); } catch (e) {}
          });
        } catch (e) {}
      }, 400);
    })();
  `;

  try {
    const rawResult = await globalThis.context.webview.sniff({
      url: embedUrl,
      injectJs: snifferScript,
      timeoutMs: 5000,
      headers: {
        "User-Agent": IPAD_CRIOS_UA,
        "Referer": "https://phim.nguonc.com/",
        "Origin": "https://phim.nguonc.com"
      }
    });

    const parsed = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;
    if (parsed) {
      const streamBaseUrl = parsed.url || embedUrl;
      const streamOrigin = getOrigin(streamBaseUrl);
      const streamHeaders = {
        "User-Agent": IPAD_CRIOS_UA,
        "Referer": embedUrl,
        "Origin": streamOrigin
      };
      if (parsed.cookies) {
        streamHeaders["Cookie"] = parsed.cookies;
      }

      if (parsed.content && parsed.content.includes('#EXTM3U')) {
        const cleanM3u8 = sanitizeNguonCM3u8(parsed.content, streamBaseUrl);
        return {
          type: "m3u8",
          url: convertM3u8ToDataUri(cleanM3u8),
          headers: streamHeaders,
          subtitles: []
        };
      }
      if (parsed.type === 'm3u8_url' && parsed.url) {
        const sanitizedStream = await prepareSanitizedHlsStream(parsed.url, streamBaseUrl, streamHeaders);
        if (sanitizedStream) return sanitizedStream;
        return {
          type: "m3u8",
          url: parsed.url,
          headers: streamHeaders,
          subtitles: []
        };
      }
    }
  } catch (e) {}

  return null;
}



// ============================================================================
// NHÓM 2: CÁC HÀM PHỤC VỤ FILL DATA LÊN JKHX-PLAYER (JKHX Player Contract)
// ============================================================================

/**
 * 2.1 HELPER: Chuẩn hoá item raw từ NguonC API thành MovieItem cho JKHX Player
 */
function formatMovieItem(item) {
  let categories = [];
  if (item.category) {
    if (typeof item.category === 'object' && !Array.isArray(item.category)) {
      if (item.category['2']?.list) categories = item.category['2'].list.map(c => c.name);
    } else if (Array.isArray(item.category)) {
      categories = item.category.map(c => c.name || c);
    }
  }

  const totalEps = parseInt(item.total_episodes || item.episode_total || "1");
  const currentEp = String(item.current_episode || item.episode_current || "").toLowerCase();
  const movieType = (totalEps > 1 || currentEp.includes("tập") || currentEp.includes("tap")) ? "series" : "single";

  let epCurrent = item.current_episode || item.episode_current || null;
  if (typeof epCurrent === "string") {
    epCurrent = epCurrent.trim();
    if (epCurrent.toLowerCase() === "tập mới" || epCurrent.toLowerCase() === "tap moi") {
      epCurrent = null;
    }
  }

  return {
    slug: item.slug,
    name: item.name,
    originName: item.original_name || item.name,
    thumbUrl: buildImageUrl(item.thumb_url_webp || item.thumb_url),
    posterUrl: buildImageUrl(item.poster_url_webp || item.poster_url || item.thumb_url),
    year: extractYear(item.year || item.created || item.modified),
    type: movieType,
    quality: item.quality || "HD",
    language: item.language || item.lang || "Vietsub",
    category: categories[0] || (movieType === "series" ? "Phim Bộ" : "Phim Lẻ"),
    providerId: "nguonc",
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
    { name: 'Phim Mới Cập Nhật', slug: 'phim-moi-cap-nhat' },
    { name: 'Phim Bộ', slug: 'phim-bo' },
    { name: 'Phim Lẻ', slug: 'phim-le' },
    { name: 'Hoạt Hình', slug: 'hoat-hinh' },
    { name: 'TV Shows', slug: 'tv-shows' }
  ];
}

/**
 * 2.4 METADATA: Danh sách thể loại NguonC chuẩn từ API
 */
function getGenres() {
  return [
    { name: 'Hành Động', slug: 'hanh-dong' },
    { name: 'Phiêu Lưu', slug: 'phieu-luu' },
    { name: 'Hoạt Hình', slug: 'hoat-hinh' },
    { name: 'Hài', slug: 'phim-hai' },
    { name: 'Hình Sự', slug: 'hinh-su' },
    { name: 'Tài Liệu', slug: 'tai-lieu' },
    { name: 'Chính Kịch', slug: 'chinh-kich' },
    { name: 'Gia Đình', slug: 'gia-dinh' },
    { name: 'Giả Tưởng', slug: 'gia-tuong' },
    { name: 'Lịch Sử', slug: 'lich-su' },
    { name: 'Kinh Dị', slug: 'kinh-di' },
    { name: 'Nhạc', slug: 'phim-nhac' },
    { name: 'Bí Ẩn', slug: 'bi-an' },
    { name: 'Lãng Mạn', slug: 'lang-man' },
    { name: 'Khoa Học Viễn Tưởng', slug: 'khoa-hoc-vien-tuong' },
    { name: 'Gây Cấn', slug: 'gay-can' },
    { name: 'Chiến Tranh', slug: 'chien-tranh' },
    { name: 'Tâm Lý', slug: 'tam-ly' },
    { name: 'Tình Cảm', slug: 'tinh-cam' },
    { name: 'Cổ Trang', slug: 'co-trang' },
    { name: 'Miền Tây', slug: 'mien-tay' },
    { name: 'Phim 18+', slug: 'phim-18' }
  ];
}

/**
 * 2.5 METADATA: Danh sách quốc gia NguonC chuẩn từ API
 */
function getCountries() {
  return [
    { name: 'Mỹ', slug: 'my' },
    { name: 'Nhật Bản', slug: 'nhat-ban' },
    { name: 'Trung Quốc', slug: 'trung-quoc' },
    { name: 'Hàn Quốc', slug: 'han-quoc' },
    { name: 'Anh', slug: 'anh' },
    { name: 'Hồng Kông', slug: 'hong-kong' },
    { name: 'Pháp', slug: 'phap' },
    { name: 'Ca-na-đa', slug: 'canada' },
    { name: 'Thái Lan', slug: 'thai-lan' },
    { name: 'Đức', slug: 'duc' },
    { name: 'Ấn Độ', slug: 'an-do' },
    { name: 'Tây Ban Nha', slug: 'tay-ban-nha' },
    { name: 'Việt Nam', slug: 'viet-nam' },
    { name: 'Italy', slug: 'italy' },
    { name: 'Đài Loan', slug: 'dai-loan' },
    { name: 'Úc', slug: 'uc' },
    { name: 'Phi-líp-pin', slug: 'philippines' },
    { name: 'Bỉ', slug: 'bi' },
    { name: 'Nga', slug: 'nga' },
    { name: 'Bra-xin', slug: 'brazil' }
  ];
}

/**
 * 2.6 METADATA: Danh sách ngôn ngữ NguonC
 */
function getLanguages() {
  return [
    { name: 'Vietsub', slug: 'vietsub' },
    { name: 'Thuyết Minh', slug: 'thuyet-minh' },
    { name: 'Lồng Tiếng', slug: 'long-tieng' }
  ];
}

/**
 * 2.7 PLAYER INTERFACE (TÙY CHỌN): Bộ lọc tổng hợp cho MovieListScreen của Player
 */
async function getFilters() {
  return {
    genres: getGenres(),
    countries: getCountries(),
    years: getYears(),
    languages: getLanguages(),
    categories: getListCategories()
  };
}

/**
 * 2.8 PLAYER INTERFACE (BẮT BUỘC): Menu điều hướng trên cùng cho HomeScreen của Player
 * Bao gồm các tab trực tiếp và các danh mục xổ xuống (Dropdown)
 */
async function getMenu() {
  return [
    { title: 'NguonC Mới', isDropdown: false, prefix: 'films', slug: 'phim-moi-cap-nhat' },
    { title: 'Phim Bộ', isDropdown: false, prefix: 'danh-sach', slug: 'phim-bo' },
    { title: 'Phim Lẻ', isDropdown: false, prefix: 'danh-sach', slug: 'phim-le' },
    { title: 'Hoạt Hình', isDropdown: false, prefix: 'danh-sach', slug: 'hoat-hinh' },
    { title: 'Thể loại', isDropdown: true, prefix: 'the-loai', items: getGenres() },
    { title: 'Danh mục', isDropdown: true, prefix: 'danh-sach', items: getListCategories() },
    { title: 'Quốc gia', isDropdown: true, prefix: 'quoc-gia', items: getCountries() },
    { title: 'Năm', isDropdown: true, prefix: 'nam', items: getYears() }
  ];
}

/**
 * 2.9 PLAYER INTERFACE (BẮT BUỘC): Dữ liệu trang chủ gồm các section phim đa dạng
 */
async function getHome() {
  const homeSectionsConfig = [
    { title: "Phim Mới Cập Nhật", type: "films", slug: "phim-moi-cap-nhat" },
    { title: "Phim Bộ Mới", type: "danh-sach", slug: "phim-bo" },
    { title: "Phim Lẻ Chọn Lọc", type: "danh-sach", slug: "phim-le" },
    { title: "Hoạt Hình Đặc Sắc", type: "danh-sach", slug: "hoat-hinh" },
    { title: "TV Shows Hot", type: "danh-sach", slug: "tv-shows" },
    { title: "Phim Hành Động", type: "the-loai", slug: "hanh-dong" },
    { title: "Phim Trung Quốc", type: "quoc-gia", slug: "trung-quoc" },
    { title: "Phim Hàn Quốc", type: "quoc-gia", slug: "han-quoc" }
  ];

  const results = await Promise.allSettled(
    homeSectionsConfig.map(async config => {
      const { rawItems } = await crawlList(config.type, config.slug, 1);
      const items = rawItems.map(formatMovieItem);
      return {
        title: config.title,
        type: config.type,
        slug: config.slug,
        items: items
      };
    })
  );

  const sections = results
    .filter(r => r.status === 'fulfilled' && r.value.items.length > 0)
    .map(r => r.value);

  return { sections };
}

/**
 * 2.10 PLAYER INTERFACE (BẮT BUỘC): Lấy danh sách phim phân trang & bộ lọc cho MovieListScreen của Player
 */
async function getList(type, slug, page = 1, filters = {}) {
  try {
    const { rawItems, pagination } = await crawlList(type, slug, page, filters);
    const items = rawItems.map(formatMovieItem);

    const totalPages = pagination.total_page ? Number(pagination.total_page) : 1;
    const totalItems = pagination.total_items ? Number(pagination.total_items) : items.length;

    return {
      items: items,
      page: page,
      hasNext: page < totalPages,
      totalPages: totalPages,
      totalItems: totalItems
    };
  } catch (e) {
    return { items: [], page: page, hasNext: false, totalPages: 1, totalItems: 0 };
  }
}

/**
 * 2.11 PLAYER INTERFACE (BẮT BUỘC): Tìm kiếm phim theo từ khóa
 */
async function search(keyword, page = 1) {
  try {
    const { rawItems, pagination } = await crawlSearch(keyword, page);
    const items = rawItems.map(formatMovieItem);

    const totalPages = pagination.total_page ? Number(pagination.total_page) : 1;
    const totalItems = pagination.total_items ? Number(pagination.total_items) : items.length;

    return {
      items: items,
      page: page,
      hasNext: page < totalPages,
      totalPages: totalPages,
      totalItems: totalItems
    };
  } catch (e) {
    return { items: [], page: page, hasNext: false, totalPages: 1, totalItems: 0 };
  }
}

/**
 * 2.12 PLAYER INTERFACE (BẮT BUỘC): Chi tiết phim và các server tập cho DetailScreen của Player
 */
async function getDetail(slug) {
  const movie = await crawlDetail(slug);
  const year = extractYear(movie.year || movie.created || movie.modified);

  const actors = typeof movie.casts === 'string'
    ? movie.casts.split(',').map(a => a.trim()).filter(Boolean)
    : (Array.isArray(movie.casts) ? movie.casts : []);

  const directors = typeof movie.director === 'string'
    ? movie.director.split(',').map(d => d.trim()).filter(Boolean)
    : (Array.isArray(movie.director) ? movie.director : []);

  const categories = [];
  if (movie.category) {
    if (typeof movie.category === 'object' && !Array.isArray(movie.category)) {
      if (movie.category['2']?.list) categories.push(...movie.category['2'].list.map(c => c.name));
    } else if (Array.isArray(movie.category)) {
      categories.push(...movie.category.map(c => c.name || c));
    }
  }

  const countries = [];
  if (movie.category && movie.category['4']?.list) {
    countries.push(...movie.category['4'].list.map(c => c.name));
  }

  // Danh sách server và các tập phim
  const episodeServers = (movie.episodes || []).map((server, sIdx) => {
    const serverLabel = (server.server_name || `Server ${sIdx + 1}`).replace(/\s+/g, ' ').trim();
    const items = server.items || server.server_data || [];

    return {
      serverName: serverLabel,
      episodes: items.map((item, eIdx) => {
        const epNum = parseInt(item.name) || (eIdx + 1);
        return {
          id: item.slug || `ep-${eIdx + 1}`,
          name: item.name ? (String(item.name).toLowerCase().startsWith("tập") ? item.name : `Tập ${item.name}`) : `Tập ${eIdx + 1}`,
          slug: item.slug || `tap-${eIdx + 1}`,
          number: epNum,
          serverName: serverLabel,
          data: {
            m3u8: item.m3u8 || item.link_m3u8 || "",
            embed: item.embed || item.link_embed || ""
          }
        };
      })
    };
  });

  const totalEps = parseInt(movie.total_episodes || "1");
  const currentEp = String(movie.current_episode || "").toLowerCase();
  const movieType = (totalEps > 1 || currentEp.includes("tập") || currentEp.includes("tap")) ? "series" : "single";

  return {
    slug: movie.slug,
    name: movie.name,
    originName: movie.original_name || movie.name,
    thumbUrl: buildImageUrl(movie.thumb_url_webp || movie.thumb_url),
    posterUrl: buildImageUrl(movie.poster_url_webp || movie.poster_url || movie.thumb_url),
    backdropUrl: buildImageUrl(movie.poster_url_webp || movie.poster_url || movie.thumb_url),
    year: year,
    type: movieType,
    status: movie.status || (currentEp.includes("hoàn tất") ? "completed" : "ongoing"),
    quality: movie.quality || "HD",
    language: movie.language || "Vietsub",
    duration: movie.time || "",
    currentEpisode: movie.current_episode || "",
    totalEpisodes: String(movie.total_episodes || ""),
    description: movie.description ? movie.description.replace(/<[^>]+>/g, '').trim() : "",
    actors: actors,
    directors: directors,
    genres: categories,
    countries: countries,
    tmdbId: movie.tmdb?.id ? String(movie.tmdb.id) : (movie.tmdb_id ? String(movie.tmdb_id) : null),
    imdbId: movie.imdb?.id ? String(movie.imdb.id) : (movie.imdb_id ? String(movie.imdb_id) : null),
    episodes: episodeServers
  };
}

/**
 * 2.13 PLAYER INTERFACE (BẮT BUỘC): Luồng phát video trực tiếp cho ExoPlayer/Media3 của Player
 * Hỗ trợ tự động giải mã link embed qua thư viện Extractor trong QuickJS Sandbox trước khi fallback
 */
async function getStream(episodeData) {
  const data = episodeData.data || {};

  // 1. Luồng phát HLS (m3u8) trực tiếp từ API nếu có
  if (data.m3u8) {
    const streamHeaders = {
      "User-Agent": DEFAULT_UA,
      "Referer": "https://embed.streamc.xyz/",
      "Origin": "https://embed.streamc.xyz"
    };
    const sanitizedStream = await prepareSanitizedHlsStream(data.m3u8, data.m3u8, streamHeaders);
    if (sanitizedStream) return sanitizedStream;
    return {
      type: "m3u8",
      url: data.m3u8,
      headers: streamHeaders,
      subtitles: []
    };
  }

  // 2. Link player Embed: Ưu tiên bóc tách trực tiếp theo chuẩn Zero Proxy Client của Nuvio!
  if (data.embed) {
    const rawEmbed = data.embed;
    const origin = getOrigin(rawEmbed);
    const embedHeaders = {
      "User-Agent": DEFAULT_UA,
      "Referer": rawEmbed,
      "Origin": origin
    };

    // 2.1 ƯU TIÊN 1: Gọi bootstrap trực tiếp (như Nuvio - nhanh 50ms, direct HLS unencrypted)
    try {
      const directHls = await tryFetchDirectHls(rawEmbed);
      if (directHls) {
        const streamUrlOrContent = directHls.content || directHls.url || directHls;
        const streamBaseUrl = directHls.url || rawEmbed;
        const sanitizedStream = await prepareSanitizedHlsStream(streamUrlOrContent, streamBaseUrl, embedHeaders);
        if (sanitizedStream) return sanitizedStream;
        return {
          type: "m3u8",
          url: directHls.url || directHls,
          headers: embedHeaders,
          subtitles: []
        };
      }
    } catch (e) {}

    // 2.2 DỰ PHÒNG 1: Headless WebView Sniffer nếu direct fetch bị chặn Cloudflare Challenge
    try {
      const sniffed = await sniffDirectHls(rawEmbed);
      if (sniffed) {
        return sniffed;
      }
    } catch (e) {}

    // 2.3 DỰ PHÒNG 2: Thử qua thư viện Extractor toàn cục nếu được tiêm vào Sandbox
    if (typeof globalThis !== 'undefined' && globalThis.extractors) {
      try {
        if (typeof globalThis.extractors.auto === 'function') {
          const resolved = await globalThis.extractors.auto(rawEmbed);
          if (resolved && resolved.url) {
            return {
              type: resolved.type || "m3u8",
              url: resolved.url,
              headers: {
                "User-Agent": DEFAULT_UA,
                "Referer": rawEmbed,
                "Origin": origin,
                ...(resolved.headers || {})
              },
              subtitles: resolved.subtitles || []
            };
          }
        }
      } catch (e) {}
    }

    // 2.4 Fallback an toàn về link Embed cho player WebView với Referer là chính trang embed
    return {
      type: "embed",
      url: rawEmbed,
      headers: {
        "User-Agent": DEFAULT_UA,
        "Referer": "https://phim.nguonc.com/",
        "Origin": "https://phim.nguonc.com"
      },
      subtitles: []
    };
  }

  throw new Error(`NguonC: Không tìm thấy luồng phát cho tập ${episodeData.name}`);
}

/**
 * 2.14 PLAYER INTERFACE (TÙY CHỌN): Kiểm tra trạng thái hoạt động của nguồn NguonC
 */
async function checkHealth() {
  try {
    const start = Date.now();
    const res = await fetch(`${getBaseUrl()}/films/phim-moi-cap-nhat?page=1`);
    const latency = Date.now() - start;
    if (res.ok) {
      return { status: "ok", message: "Kết nối máy chủ NguonC ổn định", latencyMs: latency };
    }
    return { status: "degraded", message: `NguonC phản hồi mã ${res.status}`, latencyMs: latency };
  } catch (e) {
    return { status: "blocked", message: "Không thể kết nối đến máy chủ NguonC (có thể bị chặn mạng)", latencyMs: null };
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
      description: "Thay đổi tên miền API khi phim.nguonc.com bị nhà mạng chặn",
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
  id: "nguonc",
  name: "NguonC",
  version: "1.2.6",

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
  // CÁC HÀM METADATA & EXTRACTOR BỔ TRỢ
  // ==========================================
  getGenres,
  getCountries,
  getLanguages,
  getYears,
  getListCategories,
  tryFetchDirectHls,
  sniffDirectHls,
  sanitizeNguonCM3u8
};
