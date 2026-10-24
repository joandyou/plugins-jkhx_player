// plugins/movie/yinitv/plugin.js
// YiniTV Short Drama Provider for JKHX Player (yini.tv / nws876.top)
// Tuân thủ kiến trúc phân tầng chuẩn & quy tắc phát triển trong PROJECT_RULES.md:
//   - Nhóm 1: Các hàm phục vụ crawl & phân giải luồng từ nguồn YiniTV (Crawler Layer)
//   - Nhóm 2: Các hàm phục vụ fill data lên JKHX Player (Player Contract Layer: Bắt buộc & Tùy chọn)
// Định danh thể loại: types = ["movie", "tv"], isAdult = false

// ============================================================================
// CẤU HÌNH & HẰNG SỐ NGUỒN YINITV
// ============================================================================
const DEFAULT_WEB_DOMAIN = "https://yini.tv";
const DEFAULT_API_BASE = "https://mkjbdsapp.nws876.top/api";
const DEFAULT_AES_KEY_HEX = "7acb10e7608baa8800d9eadbb540dbe7726018d484cb73bb097e6c876e85a8d2";
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
 * Lấy API Base URL linh hoạt: ưu tiên context storage -> CUSTOM_DOMAIN -> mặc định
 */
function getApiBase() {
  if (typeof globalThis !== "undefined") {
    const saved = globalThis.context?.storage?.get("api_base");
    if (saved && saved.trim()) return saved.trim().replace(/\/+$/, "");
    if (globalThis.CUSTOM_DOMAIN && globalThis.CUSTOM_DOMAIN.trim()) return globalThis.CUSTOM_DOMAIN.trim().replace(/\/+$/, "");
    if (globalThis.BASE_URL && globalThis.BASE_URL.trim()) return globalThis.BASE_URL.trim().replace(/\/+$/, "");
  }
  return DEFAULT_API_BASE;
}

/**
 * Lấy Web Domain
 */
function getWebDomain() {
  if (typeof globalThis !== "undefined") {
    const saved = globalThis.context?.storage?.get("web_domain");
    if (saved && saved.trim()) return saved.trim().replace(/\/+$/, "");
  }
  return DEFAULT_WEB_DOMAIN;
}

/**
 * Dữ liệu hạt nhân dự phòng (Seed Data)
 */
const SEED_VIDEOS = [
  {
    "type": "series",
    "id": 17,
    "cover_url": "https://backimg.1vkx.cn/common/vodvip/upload/covers/20260813_231356_Y7g8DyRD.jpg",
    "title": "Con Rể Thần Long Thức Tỉnh",
    "category": {
      "id": 16,
      "name": "Truyện Sảng Nam",
      "slug": "alpha-male"
    },
    "episode_count": 9,
    "is_vip": true,
    "view_count": 107565,
    "like_count": 1580,
    "first_episode_id": 1150,
    "first_episode_slug": "dragon-son-in-laws-awakening-ep1",
    "slug": "dragon-son-in-laws-awakening",
    "tags": [
      {
        "id": 1,
        "slug": "ceo",
        "name": "Tổng Tài"
      },
      {
        "id": 4,
        "slug": "rich",
        "name": "Hào Môn"
      },
      {
        "id": 5,
        "slug": "comeback",
        "name": "Phản Công"
      },
      {
        "id": 9,
        "slug": "revenge",
        "name": "Sảng Văn"
      },
      {
        "id": 13,
        "slug": "sci-fi",
        "name": "Viễn Tưởng"
      }
    ],
    "relevance": 0
  },
  {
    "type": "series",
    "id": 16,
    "cover_url": "https://backimg.1vkx.cn/common/vodvip/upload/covers/20260827_170835_qAEsT8Dg.jpg",
    "title": "Vút Bay Giữa Tầng Mây",
    "category": {
      "id": 16,
      "name": "Truyện Sảng Nam",
      "slug": "alpha-male"
    },
    "episode_count": 3,
    "is_vip": true,
    "view_count": 33400,
    "like_count": 1770,
    "first_episode_id": 1006,
    "first_episode_slug": "fly-to-the-sky-ep1",
    "slug": "fly-to-the-sky",
    "tags": [
      {
        "id": 5,
        "slug": "comeback",
        "name": "Phản Công"
      },
      {
        "id": 8,
        "slug": "betrayal",
        "name": "Phản bội"
      },
      {
        "id": 9,
        "slug": "revenge",
        "name": "Sảng Văn"
      }
    ],
    "relevance": 0
  },
  {
    "type": "series",
    "id": 14,
    "cover_url": "https://backimg.1vkx.cn/common/vodvip/upload/covers/20260814_161024_WCvyzmdy.jpg",
    "title": "Vụ Án Từ Một Chiếc Tất Ren",
    "category": {
      "id": 18,
      "name": "Ngược Tình",
      "slug": "tragic-love"
    },
    "episode_count": 3,
    "is_vip": true,
    "view_count": 35658,
    "like_count": 682,
    "first_episode_id": 1142,
    "first_episode_slug": "stocking-that-exposed-a-betrayal-ep1",
    "slug": "stocking-that-exposed-a-betrayal",
    "tags": [
      {
        "id": 5,
        "slug": "comeback",
        "name": "Phản Công"
      },
      {
        "id": 8,
        "slug": "betrayal",
        "name": "Phản bội"
      },
      {
        "id": 10,
        "slug": "triangle",
        "name": "Tay Ba"
      },
      {
        "id": 14,
        "slug": "thriller",
        "name": "Kinh Dị"
      },
      {
        "id": 17,
        "slug": "angst-romance",
        "name": "Ngược Luyến"
      }
    ],
    "relevance": 0
  },
  {
    "type": "series",
    "id": 7,
    "cover_url": "https://backimg.1vkx.cn/common/vodvip/upload/covers/20260821_135024_I6C0KwJX.jpg",
    "title": "Định Mệnh Chốn Thương Trường",
    "category": {
      "id": 15,
      "name": "Nữ Chính Lội Ngược Dòng",
      "slug": "girl-boss"
    },
    "episode_count": 2,
    "is_vip": true,
    "view_count": 29262,
    "like_count": 3243,
    "first_episode_id": 1035,
    "first_episode_slug": "come-to-ones-kingdom-ep1",
    "slug": "come-to-ones-kingdom",
    "tags": [
      {
        "id": 1,
        "slug": "ceo",
        "name": "Tổng Tài"
      },
      {
        "id": 2,
        "slug": "romance",
        "name": "Lãng Mạn"
      },
      {
        "id": 3,
        "slug": "secretary",
        "name": "Thư Ký"
      },
      {
        "id": 4,
        "slug": "rich",
        "name": "Hào Môn"
      },
      {
        "id": 5,
        "slug": "comeback",
        "name": "Phản Công"
      },
      {
        "id": 7,
        "slug": "girl-power",
        "name": "Nữ Cường"
      },
      {
        "id": 8,
        "slug": "betrayal",
        "name": "Phản bội"
      },
      {
        "id": 9,
        "slug": "revenge",
        "name": "Sảng Văn"
      },
      {
        "id": 16,
        "slug": "sweet-love",
        "name": "Ngọt Sủng"
      },
      {
        "id": 17,
        "slug": "angst-romance",
        "name": "Ngược Luyến"
      }
    ],
    "relevance": 0
  },
  {
    "type": "series",
    "id": 4,
    "cover_url": "https://backimg.1vkx.cn/common/vodvip/upload/covers/20260728_142428_gpE5ohrQ.jpg",
    "title": "Nữ Chủ Nhà Tỷ Phú Xinh Đẹp",
    "category": {
      "id": 16,
      "name": "Truyện Sảng Nam",
      "slug": "alpha-male"
    },
    "episode_count": 3,
    "is_vip": true,
    "view_count": 41980,
    "like_count": 2237,
    "first_episode_id": 208,
    "first_episode_slug": "my-billionaire-beauty-landlord-ep1",
    "slug": "my-billionaire-beauty-landlord",
    "tags": [
      {
        "id": 5,
        "slug": "comeback",
        "name": "Phản Công"
      },
      {
        "id": 8,
        "slug": "betrayal",
        "name": "Phản bội"
      },
      {
        "id": 17,
        "slug": "angst-romance",
        "name": "Ngược Luyến"
      }
    ],
    "relevance": 0
  },
  {
    "type": "series",
    "id": 3,
    "cover_url": "https://backimg.1vkx.cn/common/vodvip/upload/covers/20260820_160622_nNHIpaqo.jpg",
    "title": "Sóng gió hồ bơi & Hành trình làm người mẫu của tôi",
    "category": {
      "id": 18,
      "name": "Ngược Tình",
      "slug": "tragic-love"
    },
    "episode_count": 3,
    "is_vip": true,
    "view_count": 37836,
    "like_count": 1902,
    "first_episode_id": 201,
    "first_episode_slug": "poolside-scandal-my-modeling-life-ep1",
    "slug": "poolside-scandal-my-modeling-life",
    "tags": [
      {
        "id": 1,
        "slug": "ceo",
        "name": "Tổng Tài"
      },
      {
        "id": 5,
        "slug": "comeback",
        "name": "Phản Công"
      },
      {
        "id": 7,
        "slug": "girl-power",
        "name": "Nữ Cường"
      },
      {
        "id": 9,
        "slug": "revenge",
        "name": "Sảng Văn"
      },
      {
        "id": 16,
        "slug": "sweet-love",
        "name": "Ngọt Sủng"
      }
    ],
    "relevance": 0
  },
  {
    "type": "series",
    "id": 2,
    "cover_url": "https://backimg.1vkx.cn/common/vodvip/upload/covers/20260819_134910_dUdvozOU.jpg",
    "title": "Bí mật của phu nhân",
    "category": {
      "id": 16,
      "name": "Truyện Sảng Nam",
      "slug": "alpha-male"
    },
    "episode_count": 3,
    "is_vip": true,
    "view_count": 45742,
    "like_count": 4916,
    "first_episode_id": 184,
    "first_episode_slug": "ladys-secret-ep1",
    "slug": "ladys-secret",
    "tags": [
      {
        "id": 1,
        "slug": "ceo",
        "name": "Tổng Tài"
      },
      {
        "id": 8,
        "slug": "betrayal",
        "name": "Phản bội"
      },
      {
        "id": 9,
        "slug": "revenge",
        "name": "Sảng Văn"
      },
      {
        "id": 10,
        "slug": "triangle",
        "name": "Tay Ba"
      }
    ],
    "relevance": 0
  },
  {
    "type": "series",
    "id": 1,
    "cover_url": "https://backimg.1vkx.cn/common/vodvip/upload/covers/20260819_182104_12mjgGpA.jpg",
    "title": "Ký sự thăng chức chốn công sở",
    "category": {
      "id": 16,
      "name": "Truyện Sảng Nam",
      "slug": "alpha-male"
    },
    "episode_count": 4,
    "is_vip": true,
    "view_count": 61175,
    "like_count": 1146,
    "first_episode_id": 219,
    "first_episode_slug": "workplace-promotion-story-ep1",
    "slug": "workplace-promotion-story",
    "tags": [
      {
        "id": 5,
        "slug": "comeback",
        "name": "Phản Công"
      },
      {
        "id": 8,
        "slug": "betrayal",
        "name": "Phản bội"
      },
      {
        "id": 9,
        "slug": "revenge",
        "name": "Sảng Văn"
      }
    ],
    "relevance": 0
  },
  {
    "id": 1490,
    "slug": "served-with-desire",
    "canonical_title": null,
    "source_id": null,
    "title": "Đầu Bếp Đến Nhà",
    "description": "Nana thuê đầu bếp trẻ Trần Mặc rồi lén lút qua lại sau lưng chồng. Cô còn giới thiệu anh cho bạn thân nhưng một buổi tiệc sinh nhật suýt khiến mọi bí mật bại lộ.",
    "country": null,
    "cover_url": "https://backimg.1vkx.cn/common/vodvip/upload/covers/20261013_035330_8rt6CwEu.jpg",
    "preview_url": null,
    "is_vip": true,
    "category_id": 16,
    "series_id": null,
    "series_title": {},
    "series_cover_url": {},
    "ep_no": null,
    "category": {
      "id": 16,
      "name": "Truyện Sảng Nam",
      "slug": "alpha-male",
      "sort_order": 3,
      "enabled": true,
      "video_selectable": true
    },
    "tags": [
      {
        "id": 8,
        "slug": "betrayal",
        "name": "Phản bội"
      },
      {
        "id": 9,
        "slug": "revenge",
        "name": "Sảng Văn"
      },
      {
        "id": 11,
        "slug": "forbidden",
        "name": "Cấm Kỵ"
      }
    ],
    "duration": 2654,
    "subtitle_bottom_pct": 26,
    "sort_order": 1000,
    "view_count": 21320,
    "like_count": 1375,
    "enabled": 1,
    "source_publish_status": "published",
    "created_at": "2026-10-12T14:18:48.000000Z",
    "type": "video",
    "relevance": 0
  },
  {
    "id": 1481,
    "slug": "flying-to-the-blue-sky",
    "canonical_title": null,
    "source_id": null,
    "title": "Bay Lên Trời Xanh",
    "description": "Phát hiện vợ tiếp viên ngoại tình với sếp, Trương Cường quyết lật ngược thế cờ. Nhưng những nữ tổng tài, một thiên kim hàng không và âm mưu thương trường liên tiếp cuốn anh vào vòng xoáy mới.",
    "country": null,
    "cover_url": "https://backimg.1vkx.cn/common/vodvip/upload/covers/20261013_035433_N3GJ2Mh6.jpg",
    "preview_url": null,
    "is_vip": true,
    "category_id": 16,
    "series_id": null,
    "series_title": {},
    "series_cover_url": {},
    "ep_no": null,
    "category": {
      "id": 16,
      "name": "Truyện Sảng Nam",
      "slug": "alpha-male",
      "sort_order": 3,
      "enabled": true,
      "video_selectable": true
    },
    "tags": [
      {
        "id": 5,
        "slug": "comeback",
        "name": "Phản Công"
      },
      {
        "id": 8,
        "slug": "betrayal",
        "name": "Phản bội"
      },
      {
        "id": 9,
        "slug": "revenge",
        "name": "Sảng Văn"
      }
    ],
    "duration": 0,
    "subtitle_bottom_pct": null,
    "sort_order": 1000,
    "view_count": 21478,
    "like_count": 2124,
    "enabled": 1,
    "source_publish_status": "published",
    "created_at": "2026-10-12T02:39:56.000000Z",
    "type": "video",
    "relevance": 0
  },
  {
    "id": 1391,
    "slug": "fish-seller-is-the-hidden-overlord",
    "canonical_title": null,
    "source_id": null,
    "title": "Ông Chủ Bán Cá Là Bá Chủ Bí Ẩn",
    "description": "Vợ chê anh nghèo hèn và đòi ly hôn, không ngờ người bán cá bình thường lại là ông chủ đứng sau một tập đoàn lớn. Để cứu vợ con và tìm ra hung thủ sát hại anh trai, anh quyết định lộ thân phận thật.",
    "country": null,
    "cover_url": "https://backimg.1vkx.cn/common/vodvip/upload/covers/20261015_153243_ITVFD2lM.jpg",
    "preview_url": null,
    "is_vip": true,
    "category_id": 16,
    "series_id": null,
    "series_title": {},
    "series_cover_url": {},
    "ep_no": null,
    "category": {
      "id": 16,
      "name": "Truyện Sảng Nam",
      "slug": "alpha-male",
      "sort_order": 3,
      "enabled": true,
      "video_selectable": true
    },
    "tags": [
      {
        "id": 4,
        "slug": "rich",
        "name": "Hào Môn"
      },
      {
        "id": 5,
        "slug": "comeback",
        "name": "Phản Công"
      },
      {
        "id": 9,
        "slug": "revenge",
        "name": "Sảng Văn"
      }
    ],
    "duration": 5575,
    "subtitle_bottom_pct": 26,
    "sort_order": 1000,
    "view_count": 17675,
    "like_count": 2429,
    "enabled": 1,
    "source_publish_status": "published",
    "created_at": "2026-09-28T05:25:24.000000Z",
    "type": "video",
    "relevance": 0
  },
  {
    "id": 1389,
    "slug": "my-country-dad-is-actually-a-billionaire",
    "canonical_title": null,
    "source_id": null,
    "title": "Ai Ngờ Bố Ở Quê Tôi Lại Là Tỷ Phú",
    "description": "Hai cậu ấm cô chiêu thành phố xem thường Trần Nặc và gia đình ở vùng quê, nào ngờ những món ăn cùng đồ vật bình thường trong nhà cậu lại có giá trị kinh ngạc. Khi thư trúng tuyển đại học danh tiếng xuất hiện, thân phận thật của cậu sắp khiến tất cả sửng sốt.",
    "country": null,
    "cover_url": "https://backimg.1vkx.cn/common/vodvip/upload/covers/20261014_171738_DMPRTyAJ.jpg",
    "preview_url": null,
    "is_vip": true,
    "category_id": 16,
    "series_id": null,
    "series_title": {},
    "series_cover_url": {},
    "ep_no": null,
    "category": {
      "id": 16,
      "name": "Truyện Sảng Nam",
      "slug": "alpha-male",
      "sort_order": 3,
      "enabled": true,
      "video_selectable": true
    },
    "tags": [
      {
        "id": 4,
        "slug": "rich",
        "name": "Hào Môn"
      },
      {
        "id": 5,
        "slug": "comeback",
        "name": "Phản Công"
      },
      {
        "id": 9,
        "slug": "revenge",
        "name": "Sảng Văn"
      }
    ],
    "duration": 4821,
    "subtitle_bottom_pct": 28,
    "sort_order": 1000,
    "view_count": 17155,
    "like_count": 1753,
    "enabled": 1,
    "source_publish_status": "published",
    "created_at": "2026-09-28T05:25:20.000000Z",
    "type": "video",
    "relevance": 0
  }
];

// ============================================================================
// NHÓM 1: CÁC HÀM PHỤC VỤ CRAWL & GIẢI MÃ NGUỒN YINITV (CRAWLER LAYER)
// ============================================================================

// --- BẢNG TRA CỨU AES ---
const SBOX = new Uint8Array([
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5e, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
]);

const SBOX_INV = new Uint8Array([
  0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb,
  0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb,
  0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e,
  0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25,
  0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92,
  0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84,
  0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06,
  0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b,
  0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73,
  0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e,
  0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b,
  0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4,
  0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f,
  0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef,
  0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61,
  0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d
]);

const RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function base64ToBytes(b64) {
  if (typeof atob === "function") {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let buffer = 0, bits = 0, len = 0;
  const out = [];
  for (let i = 0; i < b64.length; i++) {
    const c = b64.charAt(i);
    if (c === "=") break;
    const val = chars.indexOf(c);
    if (val === -1) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[len++] = (buffer >>> bits) & 0xff;
    }
  }
  return new Uint8Array(out);
}

function bytesToUtf8(bytes) {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder().decode(bytes);
  }
  let str = "";
  let i = 0;
  while (i < bytes.length) {
    const b1 = bytes[i++];
    if (b1 < 0x80) {
      str += String.fromCharCode(b1);
    } else if (b1 < 0xe0) {
      const b2 = bytes[i++];
      str += String.fromCharCode(((b1 & 0x1f) << 6) | (b2 & 0x3f));
    } else if (b1 < 0xf0) {
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      str += String.fromCharCode(((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f));
    } else {
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      const b4 = bytes[i++];
      let code = (((b1 & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f)) - 0x10000;
      str += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff));
    }
  }
  return str;
}

function expandKey(key) {
  const w = new Uint32Array(60);
  for (let i = 0; i < 8; i++) {
    w[i] = (key[4 * i] << 24) | (key[4 * i + 1] << 16) | (key[4 * i + 2] << 8) | key[4 * i + 3];
  }
  for (let i = 8; i < 60; i++) {
    let temp = w[i - 1];
    if (i % 8 === 0) {
      const rot = ((temp << 8) | (temp >>> 24));
      temp = (SBOX[(rot >>> 24) & 0xff] << 24) |
             (SBOX[(rot >>> 16) & 0xff] << 16) |
             (SBOX[(rot >>> 8) & 0xff] << 8) |
             SBOX[rot & 0xff];
      temp ^= (RCON[i / 8] << 24);
    } else if (i % 8 === 4) {
      temp = (SBOX[(temp >>> 24) & 0xff] << 24) |
             (SBOX[(temp >>> 16) & 0xff] << 16) |
             (SBOX[(temp >>> 8) & 0xff] << 8) |
             SBOX[temp & 0xff];
    }
    w[i] = w[i - 8] ^ temp;
  }
  return w;
}

function gmul(a, b) {
  let p = 0;
  for (let c = 0; c < 8; c++) {
    if (b & 1) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi) a ^= 0x1b;
    b >>= 1;
  }
  return p;
}

function invMixColumns(s) {
  for (let c = 0; c < 4; c++) {
    const i = c * 4;
    const a0 = s[i], a1 = s[i + 1], a2 = s[i + 2], a3 = s[i + 3];
    s[i]     = gmul(a0, 14) ^ gmul(a1, 11) ^ gmul(a2, 13) ^ gmul(a3, 9);
    s[i + 1] = gmul(a0, 9)  ^ gmul(a1, 14) ^ gmul(a2, 11) ^ gmul(a3, 13);
    s[i + 2] = gmul(a0, 13) ^ gmul(a1, 9)  ^ gmul(a2, 14) ^ gmul(a3, 11);
    s[i + 3] = gmul(a0, 11) ^ gmul(a1, 13) ^ gmul(a2, 9)  ^ gmul(a3, 14);
  }
}

function decryptBlock(block, w) {
  const state = new Uint8Array(16);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      state[r + 4 * c] = block[r + 4 * c];
    }
  }

  for (let c = 0; c < 4; c++) {
    const word = w[56 + c];
    state[4 * c]     ^= (word >>> 24) & 0xff;
    state[4 * c + 1] ^= (word >>> 16) & 0xff;
    state[4 * c + 2] ^= (word >>> 8) & 0xff;
    state[4 * c + 3] ^= word & 0xff;
  }

  for (let round = 13; round >= 1; round--) {
    const temp1 = state[1 + 4 * 3];
    state[1 + 4 * 3] = state[1 + 4 * 2]; state[1 + 4 * 2] = state[1 + 4 * 1]; state[1 + 4 * 1] = state[1 + 4 * 0]; state[1 + 4 * 0] = temp1;
    const temp2_0 = state[2 + 4 * 0], temp2_1 = state[2 + 4 * 1];
    state[2 + 4 * 0] = state[2 + 4 * 2]; state[2 + 4 * 1] = state[2 + 4 * 3]; state[2 + 4 * 2] = temp2_0; state[2 + 4 * 3] = temp2_1;
    const temp3 = state[3 + 4 * 0];
    state[3 + 4 * 0] = state[3 + 4 * 1]; state[3 + 4 * 1] = state[3 + 4 * 2]; state[3 + 4 * 2] = state[3 + 4 * 3]; state[3 + 4 * 3] = temp3;

    for (let i = 0; i < 16; i++) state[i] = SBOX_INV[state[i]];

    for (let c = 0; c < 4; c++) {
      const word = w[round * 4 + c];
      state[4 * c]     ^= (word >>> 24) & 0xff;
      state[4 * c + 1] ^= (word >>> 16) & 0xff;
      state[4 * c + 2] ^= (word >>> 8) & 0xff;
      state[4 * c + 3] ^= word & 0xff;
    }

    invMixColumns(state);
  }

  const temp1 = state[1 + 4 * 3];
  state[1 + 4 * 3] = state[1 + 4 * 2]; state[1 + 4 * 2] = state[1 + 4 * 1]; state[1 + 4 * 1] = state[1 + 4 * 0]; state[1 + 4 * 0] = temp1;
  const temp2_0 = state[2 + 4 * 0], temp2_1 = state[2 + 4 * 1];
  state[2 + 4 * 0] = state[2 + 4 * 2]; state[2 + 4 * 1] = state[2 + 4 * 3]; state[2 + 4 * 2] = temp2_0; state[2 + 4 * 3] = temp2_1;
  const temp3 = state[3 + 4 * 0];
  state[3 + 4 * 0] = state[3 + 4 * 1]; state[3 + 4 * 1] = state[3 + 4 * 2]; state[3 + 4 * 2] = state[3 + 4 * 3]; state[3 + 4 * 3] = temp3;

  for (let i = 0; i < 16; i++) state[i] = SBOX_INV[state[i]];

  for (let c = 0; c < 4; c++) {
    const word = w[c];
    state[4 * c]     ^= (word >>> 24) & 0xff;
    state[4 * c + 1] ^= (word >>> 16) & 0xff;
    state[4 * c + 2] ^= (word >>> 8) & 0xff;
    state[4 * c + 3] ^= word & 0xff;
  }

  return state;
}

const cachedKeyBytes = hexToBytes(DEFAULT_AES_KEY_HEX);

/**
 * Giải mã dữ liệu AES-256-CBC thuần JS
 */
function decryptAes(cipherBase64) {
  try {
    const allBytes = base64ToBytes(cipherBase64);
    if (allBytes.length < 32) return null;
    const iv = allBytes.subarray(0, 16);
    const cipher = allBytes.subarray(16);

    const w = expandKey(cachedKeyBytes);
    const plain = new Uint8Array(cipher.length);
    let prevIv = iv;

    for (let i = 0; i < cipher.length; i += 16) {
      const block = cipher.subarray(i, i + 16);
      const dec = decryptBlock(block, w);
      for (let j = 0; j < 16; j++) {
        plain[i + j] = dec[j] ^ prevIv[j];
      }
      prevIv = block;
    }

    const pad = plain[plain.length - 1];
    const cleanBytes = (pad > 0 && pad <= 16) ? plain.subarray(0, plain.length - pad) : plain;
    const jsonStr = bytesToUtf8(cleanBytes);
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

/**
 * Gọi API YiniTV và tự động giải mã payload
 */
async function apiGet(endpointPath, queryParams = {}) {
  let url = getApiBase() + endpointPath;
  const queryParts = [];
  Object.keys(queryParams).forEach(k => {
    if (queryParams[k] !== undefined && queryParams[k] !== null && queryParams[k] !== "") {
      queryParts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(queryParams[k])));
    }
  });
  if (queryParts.length > 0) {
    url += (url.includes("?") ? "&" : "?") + queryParts.join("&");
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": DEFAULT_UA,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "vi",
        "Referer": getWebDomain() + "/"
      }
    });

    if (res.ok) {
      const json = await res.json();
      if (json && json._e) {
        return decryptAes(json._e);
      }
      return json;
    }
  } catch (e) {}

  return null;
}

// In-memory cache
const dramaCache = new Map();
SEED_VIDEOS.forEach(v => dramaCache.set(String(v.id), v));

/**
 * Chuẩn hóa một item phim ngắn thành MovieItem cho JKHX Player
 */
function formatMovieItem(item) {
  const isSeries = item.type === "series" || (item.episode_count && item.episode_count > 1);
  const totalEp = item.episode_count || (item.duration ? Math.ceil(item.duration / 60) + " phút" : "Tập Full");
  let cover = item.cover_url || (getWebDomain() + "/favicon.ico");

  const tags = Array.isArray(item.tags)
    ? item.tags.map(t => (typeof t === "object" ? t.name : t)).filter(Boolean)
    : [];

  const catName = item.category?.name || tags[0] || "Phim ngắn";
  const uniqueId = item.type + "_" + item.id + "_" + (item.slug || "");

  dramaCache.set(String(item.id), item);
  if (item.slug) dramaCache.set(item.slug, item);

  return {
    slug: uniqueId,
    name: item.title,
    originName: item.canonical_title || item.title,
    thumbUrl: cover,
    posterUrl: cover,
    backdropUrl: cover,
    year: item.created_at ? new Date(item.created_at).getFullYear() : 2026,
    type: isSeries ? "tv" : "movie",
    quality: "FHD 1080p",
    language: "Vietsub Đa Ngôn Ngữ",
    category: catName,
    providerId: "yinitv",
    episodeCurrent: isSeries ? (item.episode_count + " Tập") : "Full HD"
  };
}

// ============================================================================
// NHÓM 2: CÁC HÀM PHỤC VỤ GIAO DIỆN JKHX-PLAYER (PLAYER CONTRACT LAYER)
// ============================================================================

/**
 * 2.1 PLAYER INTERFACE (BẮT BUỘC): Dữ liệu các row phim cho HomeScreen
 */
async function getHome() {
  const p1 = await apiGet("/videos", { page: 1 });
  const videos = (p1 && p1.data) || SEED_VIDEOS;

  const ceoDramas = videos.filter(v => v.category?.id === 14 || (v.tags || []).some(t => (t.name || t).includes("Tổng Tài") || (t.name || t).includes("Hào Môn")));
  const girlBoss = videos.filter(v => v.category?.id === 15 || (v.tags || []).some(t => (t.name || t).includes("Nữ Cường") || (t.name || t).includes("Nữ")));
  const alphaMale = videos.filter(v => v.category?.id === 16 || (v.tags || []).some(t => (t.name || t).includes("Sảng Văn") || (t.name || t).includes("Phản Công")));
  const sweetLove = videos.filter(v => v.category?.id === 17 || (v.tags || []).some(t => (t.name || t).includes("Ngọt Sủng") || (t.name || t).includes("Lãng Mạn")));

  const sections = [
    {
      title: "🔥 Phim Ngắn Tuyển Chọn",
      type: "danh-sach",
      slug: "hot",
      items: videos.map(formatMovieItem)
    },
    {
      title: "👑 Tổng Tài Hào Môn",
      type: "the-loai",
      slug: "14",
      items: (ceoDramas.length > 0 ? ceoDramas : videos).map(formatMovieItem)
    },
    {
      title: "💃 Nữ Chính Lội Ngược Dòng",
      type: "the-loai",
      slug: "15",
      items: (girlBoss.length > 0 ? girlBoss : videos).map(formatMovieItem)
    },
    {
      title: "⚡ Truyện Sảng Nam & Phản Công",
      type: "the-loai",
      slug: "16",
      items: (alphaMale.length > 0 ? alphaMale : videos).map(formatMovieItem)
    },
    {
      title: "💞 Ngọt Sủng & Lãng Mạn",
      type: "the-loai",
      slug: "17",
      items: (sweetLove.length > 0 ? sweetLove : videos).map(formatMovieItem)
    }
  ];

  const result = sections.filter(s => s.items.length > 0);
  result.sections = result;
  return result;
}

/**
 * 2.2 PLAYER INTERFACE (BẮT BUỘC): Thanh menu trên cùng cho HomeScreen
 */
async function getMenu() {
  const categories = [
    { name: "Tổng Tài Hào Môn", slug: "14" },
    { name: "Nữ Chính Lội Ngược Dòng", slug: "15" },
    { name: "Truyện Sảng Nam", slug: "16" },
    { name: "Trùng Sinh", slug: "8" },
    { name: "Ngọt Sủng", slug: "17" },
    { name: "Ngược Tình", slug: "18" },
    { name: "Phim Chuyển Thể Truyện Tranh", slug: "19" }
  ];

  return [
    { title: "Yini TV", isDropdown: false, prefix: "danh-sach", slug: "hot" },
    { title: "Mới cập nhật", isDropdown: false, prefix: "danh-sach", slug: "all" },
    { title: "Tổng Tài", isDropdown: false, prefix: "the-loai", slug: "14" },
    { title: "Nữ Cường", isDropdown: false, prefix: "the-loai", slug: "15" },
    { title: "Sảng Nam", isDropdown: false, prefix: "the-loai", slug: "16" },
    { title: "Thể loại", isDropdown: true, prefix: "the-loai", items: categories }
  ];
}

/**
 * 2.3 PLAYER INTERFACE (BẮT BUỘC): Phân trang danh sách phim cho MovieListScreen
 */
async function getList(type, slug, page = 1, filters = {}) {
  try {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const query = { page: p };

    const effectiveSlug = (slug || type || "all").toLowerCase();
    if (type === "the-loai" || !isNaN(parseInt(effectiveSlug, 10))) {
      const catId = parseInt(effectiveSlug, 10);
      if (!isNaN(catId) && catId > 0) {
        query.category_id = catId;
      }
    }

    if (filters && filters.category_id) {
      query.category_id = filters.category_id;
    }

    const res = await apiGet("/videos", query);
    const items = ((res && res.data) || []).map(formatMovieItem);
    const total = (res && res.total) || (items.length * 28);
    const lastPage = (res && res.last_page) || Math.ceil(total / 12) || 28;

    return {
      items: items,
      page: p,
      hasNext: p < lastPage,
      totalPages: lastPage,
      totalItems: total
    };
  } catch (e) {
    return { items: [], page: 1, hasNext: false, totalPages: 1, totalItems: 0 };
  }
}

/**
 * 2.4 PLAYER INTERFACE (BẮT BUỘC): Tìm kiếm phim cho SearchScreen
 */
async function search(keyword, page = 1) {
  try {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const res = await apiGet("/videos", { keyword: keyword, page: p });
    const items = ((res && res.data) || []).map(formatMovieItem);
    const lastPage = (res && res.last_page) || 1;

    return {
      items: items,
      page: p,
      hasNext: p < lastPage
    };
  } catch (e) {
    return { items: [], page: 1, hasNext: false };
  }
}

/**
 * Chuẩn hóa URL luồng phát video:
 * 1. Máy chủ origin 'back_only.ffkm25.com' chứa ký tự gạch dưới '_' vi phạm RFC 1034/1123,
 *    khiến bộ phân giải DNS libc Android (getaddrinfo) / OkHttp / ExoPlayer ném lỗi:
 *    ERROR_CODE_IO_NETWORK_CONNECTION_FAILED: Source error.
 * 2. Thay thế bằng CDN chính thức được Cloudflare phân phối toàn cầu: 'https://cdn.yini.tv'
 */
function normalizeStreamUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  let url = rawUrl.trim();
  if (url.includes("back_only.ffkm25.com")) {
    url = url.replace(/https?:\/\/back_only\.ffkm25\.com/g, "https://cdn.yini.tv");
  } else if (url.includes("ffkm25.com")) {
    url = url.replace(/https?:\/\/[^\/]*ffkm25\.com/g, "https://cdn.yini.tv");
  }
  return url;
}

/**
 * 2.5 PLAYER INTERFACE (BẮT BUỘC): Chi tiết phim & danh sách tập cho DetailScreen
 */
async function getDetail(slug) {
  let itemType = "series";
  let targetId = slug;

  if (slug && slug.includes("_")) {
    const parts = slug.split("_");
    itemType = parts[0] || "series";
    targetId = parts[1] || slug;
  }

  let detailData = null;
  let episodeItems = [];

  // 1. Nếu là series
  if (itemType === "series") {
    const sRes = await apiGet("/series/" + encodeURIComponent(targetId));
    if (sRes && sRes.title) {
      detailData = sRes;
      const eps = sRes.episodes || [];
      episodeItems = eps.map(ep => ({
        id: String(ep.id),
        name: ep.title || ("Tập " + ep.ep_no),
        slug: ep.slug || ("ep-" + ep.ep_no),
        number: ep.ep_no || 1,
        serverName: "YiniTV Vietsub VIP",
        data: {
          videoId: ep.id,
          seriesId: sRes.id,
          title: ep.title,
          coverUrl: ep.cover_url
        }
      }));
    }
  }

  // 2. Nếu là single video hoặc fallback từ video
  if (!detailData) {
    const vRes = await apiGet("/videos/" + encodeURIComponent(targetId));
    if (vRes && vRes.title) {
      detailData = vRes;

      // Nếu video này thuộc một series, lấy trọn bộ từ series
      if (vRes.series_id) {
        const sRes = await apiGet("/series/" + vRes.series_id);
        if (sRes && Array.isArray(sRes.episodes)) {
          episodeItems = sRes.episodes.map(ep => ({
            id: String(ep.id),
            name: ep.title || ("Tập " + ep.ep_no),
            slug: ep.slug || ("ep-" + ep.ep_no),
            number: ep.ep_no || 1,
            serverName: "YiniTV Vietsub VIP",
            data: {
              videoId: ep.id,
              seriesId: sRes.id,
              title: ep.title,
              coverUrl: ep.cover_url
            }
          }));
        }
      }

      if (episodeItems.length === 0) {
        episodeItems.push({
          id: String(vRes.id),
          name: vRes.title || "Tập Full",
          slug: vRes.slug || "full",
          number: 1,
          serverName: "YiniTV Vietsub VIP",
          data: {
            videoId: vRes.id,
            playUrl: normalizeStreamUrl(vRes.play_url),
            subtitles: vRes.subtitles
          }
        });
      }
    }
  }

  // Fallback từ cache
  if (!detailData && dramaCache.has(targetId)) {
    detailData = dramaCache.get(targetId);
  }

  const title = (detailData && detailData.title) || "Phim ngắn YiniTV";
  const cover = (detailData && (detailData.cover_url || detailData.series_cover_url)) || (getWebDomain() + "/favicon.ico");
  const desc = (detailData && detailData.description) || ("Xem phim ngắn " + title + " trọn bộ Full HD Vietsub độc quyền trên YiniTV.");
  const tags = Array.isArray(detailData && detailData.tags)
    ? detailData.tags.map(t => (typeof t === "object" ? t.name : t)).filter(Boolean)
    : [];

  const catName = (detailData && detailData.category && detailData.category.name) || tags[0] || "Phim ngắn";

  return {
    slug: slug,
    name: title,
    originName: (detailData && detailData.canonical_title) || title,
    thumbUrl: cover,
    posterUrl: cover,
    backdropUrl: cover,
    year: 2026,
    type: "tv",
    status: "completed",
    quality: "FHD 1080p",
    language: "Vietsub Đa Ngôn Ngữ",
    duration: detailData && detailData.duration ? Math.ceil(detailData.duration / 60) + " phút" : "Nhiều tập",
    currentEpisode: episodeItems.length + " Tập",
    totalEpisodes: episodeItems.length + " Tập",
    description: desc,
    actors: [],
    directors: [],
    genres: ["Phim Ngắn", catName, ...tags],
    countries: ["Trung Quốc", "Quốc Tế"],
    episodes: [
      {
        serverName: "YiniTV Vietsub VIP",
        episodes: episodeItems
      }
    ]
  };
}

/**
 * 2.6 PLAYER INTERFACE (BẮT BUỘC): Luồng phát trực tiếp video cho ExoPlayer JKHX
 */
async function getStream(episodeData) {
  const data = (episodeData && episodeData.data) || {};
  let playUrl = data.playUrl || "";
  let subtitles = data.subtitles || [];

  if (!playUrl && data.videoId) {
    const videoDetail = await apiGet("/videos/" + encodeURIComponent(data.videoId));
    if (videoDetail) {
      if (videoDetail.play_url) playUrl = videoDetail.play_url;
      if (Array.isArray(videoDetail.subtitles)) subtitles = videoDetail.subtitles;
    }
  }

  playUrl = normalizeStreamUrl(playUrl);

  const mappedSubtitles = (Array.isArray(subtitles) ? subtitles : []).map(s => ({
    label: s.label || s.language_code || "Phụ đề",
    language: s.language_code || "vi",
    url: s.url,
    format: "vtt"
  }));

  if (playUrl && playUrl.startsWith("http")) {
    const isHls = playUrl.includes(".m3u8");
    const streamType = isHls ? "m3u8" : "mp4";

    return {
      type: streamType,
      url: playUrl,
      headers: {
        "User-Agent": DEFAULT_UA,
        "Referer": getWebDomain() + "/",
        "Origin": getWebDomain()
      },
      fallbackUrl: getWebDomain() + "/vi/video/" + (data.videoId || ""),
      subtitles: mappedSubtitles
    };
  }

  // Fallback sang web embed
  const webFallback = getWebDomain() + "/vi/video/" + (data.videoId || "");
  return {
    type: "embed",
    url: webFallback,
    headers: {
      "User-Agent": DEFAULT_UA,
      "Referer": getWebDomain() + "/"
    },
    subtitles: mappedSubtitles
  };
}

/**
 * 2.7 PLAYER INTERFACE (TÙY CHỌN): Cấu trúc bộ lọc tổng hợp cho MovieListScreen
 */
async function getFilters() {
  return {
    genres: [
      { name: "Tất cả thể loại", slug: "all" },
      { name: "Tổng Tài Hào Môn", slug: "14" },
      { name: "Nữ Chính Lội Ngược Dòng", slug: "15" },
      { name: "Truyện Sảng Nam", slug: "16" },
      { name: "Trùng Sinh", slug: "8" },
      { name: "Ngọt Sủng", slug: "17" },
      { name: "Ngược Tình", slug: "18" },
      { name: "Phim Chuyển Thể Truyện Tranh", slug: "19" }
    ],
    countries: [
      { name: "Tất cả", slug: "all" },
      { name: "Trung Quốc", slug: "zh" }
    ],
    years: [
      { name: "Tất cả", slug: "all" },
      { name: "2026", slug: "2026" },
      { name: "2025", slug: "2025" }
    ],
    sortFields: [],
    sortTypes: []
  };
}

/**
 * 2.8 PLAYER INTERFACE (TÙY CHỌN): Cài đặt plugin
 */
function getSettings() {
  let currentApi = DEFAULT_API_BASE;
  let currentWeb = DEFAULT_WEB_DOMAIN;
  if (typeof globalThis !== "undefined") {
    const savedApi = globalThis.context?.storage?.get("api_base");
    if (savedApi) currentApi = savedApi;
    const savedWeb = globalThis.context?.storage?.get("web_domain");
    if (savedWeb) currentWeb = savedWeb;
  }
  return [
    {
      key: "api_base",
      title: "Máy chủ API YiniTV",
      description: "Địa chỉ máy chủ API backend (mặc định: https://mkjbdsapp.nws876.top/api)",
      type: "text",
      defaultValue: DEFAULT_API_BASE,
      currentValue: currentApi
    },
    {
      key: "web_domain",
      title: "Tên miền YiniTV Web",
      description: "Địa chỉ website tham chiếu (mặc định: https://yini.tv)",
      type: "text",
      defaultValue: DEFAULT_WEB_DOMAIN,
      currentValue: currentWeb
    }
  ];
}

/**
 * 2.9 PLAYER INTERFACE (TÙY CHỌN): Kiểm tra tình trạng kết nối tới nguồn
 */
async function checkHealth() {
  const start = Date.now();
  try {
    const res = await apiGet("/videos", { page: 1 });
    const latency = Date.now() - start;
    if (res && res.data) {
      return {
        status: "ok",
        message: "Kết nối máy chủ YiniTV ổn định (" + latency + "ms) - " + res.total + " phim ngắn",
        latencyMs: latency
      };
    }
    return { status: "degraded", message: "Phản hồi chưa đầy đủ (" + latency + "ms)", latencyMs: latency };
  } catch (e) {
    return { status: "error", message: "Lỗi kết nối YiniTV: " + e.message, latencyMs: Date.now() - start };
  }
}

// ============================================================================
// EXPORT DEFAULT PLUGIN OBJECT
// ============================================================================
export default {
  id: "yinitv",
  name: "YiniTV",
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
