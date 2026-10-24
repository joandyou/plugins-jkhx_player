// plugins/movie/zophim/plugin.js
// ZoPhim Provider for JKHX Player (api-zophim.blogspot.com / anisrc.top)
// Tuân thủ kiến trúc phân tầng chuẩn & quy tắc phát triển trong PROJECT_RULES.md:
//   - Nhóm 1: Các hàm phục vụ crawl & phân giải luồng từ nguồn ZoPhim (Crawler Layer)
//   - Nhóm 2: Các hàm phục vụ fill data lên JKHX Player (Player Contract Layer: Bắt buộc & Tùy chọn)
// Định danh thể loại: types = ["movie", "tv"], isAdult = false

// ============================================================================
// CẤU HÌNH & HẰNG SỐ NGUỒN ZOPHIM
// ============================================================================
const DEFAULT_WEB_DOMAIN = "https://api-zophim.blogspot.com";
const DEFAULT_API_BASE = "https://anisrc.top";
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
const SEED_MOVIES = [
  {
    "slug": "linh-canh-hanh-gia",
    "ten_phim": "Linh Cảnh Hành Giả",
    "ten_goc": "Spiritual Realm Walker, 灵境行者",
    "poster": "https://image.tmdb.org/t/p/w400/5yluTfz1LI6TkzBIeUTsE49Lyu0.jpg",
    "tmdb": "tv-297923-1",
    "nam_chieu": "2026",
    "trang_thai": "08 VS+TM",
    "thoi_luong": "??? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Viễn Tưởng,Hành Động,Hoạt Hình",
    "lich_chieu": "T4",
    "noi_dung": "Linh Cảnh Hành Giả kể về một thế giới kỳ dị tồn tại song song với thế giới hiện thực, nơi người tham gia phải vượt qua những phó bản nguy hiểm, đối mặt với các nhiệm vụ sinh tử và những sinh vật siêu nhiên. Trong quá trình khám phá Linh Cảnh, Trương Nguyên Thanh từng bước thức tỉnh năng lực, trưởng thành qua những cuộc phiêu lưu và dần khám phá những bí mật ẩn giấu phía sau thế giới này."
  },
  {
    "slug": "van-gioi-doc-ton",
    "ten_phim": "Vạn Giới Độc Tôn",
    "ten_goc": "Ten Thousand Worlds, Wan Jie Du Zun, 万界独尊",
    "poster": "https://image.tmdb.org/t/p/w400/Ag1nI2XPt6mBiKwPKT1d9TRARZr.jpg",
    "tmdb": "t122612",
    "nam_chieu": "2022",
    "trang_thai": "491 VS+TM",
    "thoi_luong": "?? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Luyện Cấp,Hoạt Hình",
    "lich_chieu": "T3,T7",
    "noi_dung": "Vạn Giới Độc Tôn kể về Lâm Phong, người vốn là thiếu gia của gia tộc họ Lâm, không còn được người hầu kính trọng nữa, họ không sẵn lòng giúp đỡ. Mãi cho đến khi Lâm Phong dùng sức mạnh có được từ vùng bí ẩn đánh bại cường quốc võ lâm, người nhà họ Lâm mới thay đổi thái độ đối với Lâm Phong."
  },
  {
    "slug": "hoc-vien-cao-vo-dong-dai",
    "ten_phim": "Học Viện Cao Võ Đông Đại",
    "ten_goc": "Oriental Martial Academy",
    "poster": "https://image.tmdb.org/t/p/w400/ksaBqIKOfDklbMBvscq6zkV6LrA.jpg",
    "tmdb": "tv-323839-1",
    "nam_chieu": "2026",
    "trang_thai": "14 VS+TM",
    "thoi_luong": "??? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Tu Tiên,Học Đường,Hoạt Hình",
    "lich_chieu": "T5",
    "noi_dung": "Học Viện Cao Võ Đông Đại kể về Vạn Vật Sinh là một thứ công pháp cổ xưa thần kỳ và bí ẩn hơn tất cả những hiểu biết của con người thời hiện đại ngày nay, nhưng bằng một cách thần bí nào đó mà nó lại được truyền thừa và tái hiện trong cơ thể của một thiếu niên thời hiện đại là Tần Vũ. Vốn Tần Vũ được chọn để làm người kế thừa bởi anh mang trong mình những thiên bẩm vô cùng to lớn, có thể dễ kể đến nhất chính là linh căn phế. Tham gia rèn luyện tại Học Viện Cao Võ Đông Đại, Tần Vũ đã nâng cao những sức mạnh thiên bẩm của mình và cùng với các chiến hữu liều mình xả thân chiến đấu cho lẽ phải, đánh đuổi yêu ma, tạo nên một thế giới yên bình sau những biến cố liên tiếp xảy đến."
  },
  {
    "slug": "luyen-khi-muoi-van-nam",
    "ten_phim": "Luyện Khí Mười Vạn Năm",
    "ten_goc": "One Hundred Thousand Years Of Qi Refining, Lian Qi Shi Wan Nian, 炼气十万年",
    "poster": "https://image.tmdb.org/t/p/w400/dZF7DTXgyoyshdALJLOrQ9Zj4Xz.jpg",
    "tmdb": "t220850",
    "nam_chieu": "2023",
    "trang_thai": "385 VS+TM",
    "thoi_luong": "??? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Luyện Cấp,Hoạt Hình",
    "lich_chieu": "T3,T7",
    "noi_dung": "Luyện Khí Mười Vạn Năm kể về Từ Dương của Thiên Lam Tông. Mười vạn năm trước Thiên Lam Tông vang dội giới tu chân, đệ tử trong tông đều là những đứa con của trời, đánh đâu thắng đó. Chỉ có khai sơn đệ tử Từ Dương vẫn luôn ở Luyện Khí kỳ, để đột phá tu vi sớm ngày phi thăng, Từ Dương bế quan vạn năm. Ai ngờ trong thời gian bế quan giới tu chân đã xuống dốc, Thiên Lam Tông cũng chỉ còn vài ba đệ tử, thấy sắp phải đối mặt với diệt tông, Từ Dương đánh bại cường địch, thề sẽ dẫn dắt Thiên Lam Tông quay về đỉnh cao!"
  },
  {
    "slug": "thai-co-than-ton",
    "ten_phim": "Thái Cổ Thần Tôn",
    "ten_goc": "太古神尊",
    "poster": "https://image.tmdb.org/t/p/w400/3GzzdIDhSUbjtrfKOmJ1xcXOhJb.jpg",
    "tmdb": "tv-330275-1",
    "nam_chieu": "2026",
    "trang_thai": "26 VS+TM",
    "thoi_luong": "??? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Tu Tiên,Luyện Cấp,Chuyển Sinh,Hoạt Hình",
    "lich_chieu": "T5,CN",
    "noi_dung": "Thái Cổ Thần Tôn kể về Thái tử tối cao của Linh Giới bị hãm hại oan uổng, thân vong đạo tiêu, trùng sinh rơi xuống phàm trần, biến thành một tên tạp dịch hèn mọn. Trong người mang thần đan tạo hóa tuyệt thế và công pháp nghịch thiên, chỉ với một thanh kiếm gỉ, hắn lật nhào cả võ đạo giới. Song võ hồn đồng thời thức tỉnh, luyện hóa vạn linh, tham ngộ cả hai con đường thần hồn. Kho báu Thiên Ma, bí cảnh Hóa Long, di tích Viễn Cổ đều bị hắn giẫm đạp khắp nơi, chiến giáp Ma Tôn, kính Đại Hoang, vô số bảo vật vô thượng đều thu vào tay. Các thiên kiêu khắp nơi, bọn sâu mọt trong tông môn, tà tộc ngoại vực lần lượt xông lên tìm chết, đều bị hắn một kiếm quét ngang, đè bẹp tại chỗ. Thu phục Long hồn và Linh khuyển thông linh, bảo vệ những người thân cận và mỹ nhân bên cạnh, đạp qua Võ Vương, phá Võ Hoàng, đăng lâm Võ Tôn, một mình đối đầu 2 kẻ thù truyền kiếp là Long Già Thiên và Nam Cung Lăng Thiên, vạch trần âm mưu bị chôn vùi của thời kỳ Hắc Ám cổ xưa."
  },
  {
    "slug": "thon-phe-tinh-khong",
    "ten_phim": "Thôn Phệ Tinh Không",
    "ten_goc": "Swallowed Star, Tun Shi Xing Kong, 吞噬星空",
    "poster": "https://image.tmdb.org/t/p/w400/wVIXqqxFbcfYLbdfPCce2jWXFMu.jpg",
    "tmdb": "tv-101172-1",
    "nam_chieu": "2018",
    "trang_thai": "245 VS+TM",
    "thoi_luong": "??? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Viễn Tưởng,Hoạt Hình",
    "lich_chieu": "T3",
    "noi_dung": "Thôn Phệ Tinh Không kể về La Phong luôn muốn cố gắng trở thành 1 võ giả trong thế giới tương lai đầy lạ lẫm khi loài người đứng trước nguy cơ quái thú."
  },
  {
    "slug": "nhat-tram-thuong-khung",
    "ten_phim": "Nhất Trảm Thương Khung",
    "ten_goc": "一斩苍穹",
    "poster": "https://image.tmdb.org/t/p/w400/r7xmoRNWb5mAhjN5dR7fnqAafsf.jpg",
    "tmdb": "tv-303287-1",
    "nam_chieu": "2026",
    "trang_thai": "13 VS+TM",
    "thoi_luong": "??? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Tu Tiên,Luyện Cấp,Hoạt Hình",
    "lich_chieu": "T3",
    "noi_dung": "Nhất Trảm Thương Khung kể về Cốc An luôn nỗ lực tu luyện với khát vọng trở thành tiên nhân. Thế nhưng, vì trời sinh thiếu linh căn nên anh vô duyên với tiên đạo, lại còn bị lừa vào một khu lừa đảo của giới tu tiên, nhiều lần cận kề cái chết. Sau khi trải qua vô vàn đau khổ và bị dồn đến đường cùng, Cốc An quyết tâm vùng lên báo thù, từng bước nghịch thiên cải mệnh. Con đường thượng vị của anh bắt đầu từ đây, với lời thề một ngày sẽ một đao chém rách cả thương khung."
  },
  {
    "slug": "nghich-thien-chi-ton",
    "ten_phim": "Nghịch Thiên Chí Tôn",
    "ten_goc": "Against The Sky Supreme, Ni Tian Zhizun, 逆天至尊",
    "poster": "https://image.tmdb.org/t/p/w400/6QnS1gfGaaLGkamcmngBc3sIIkH.jpg",
    "tmdb": "t129272",
    "nam_chieu": "2018",
    "trang_thai": "557 VS+TM",
    "thoi_luong": "??? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Chuyển Sinh,Luyện Cấp,Hoạt Hình",
    "lich_chieu": "T2,T6",
    "noi_dung": "Nghịch Thiên Chí Tôn kể về Đàm Vân kiếp trước là Hồng Mông Chí Tôn bị bạn thân hại chết. Sau khi rơi xuống vạn thế luân hồi, Đàm Vân cuối cùng cũng nhớ ra thân phận của mình. Tư đây bắt đầu tu luyện lại, cả thế giới sẽ run rẩy dưới chân!"
  },
  {
    "slug": "vo-thuong-than-de",
    "ten_phim": "Vô Thượng Thần Đế",
    "ten_goc": "Wu Shang Shen Di, 无上神帝",
    "poster": "https://image.tmdb.org/t/p/w400/8vmZErkbw5d5iwXHO23zVmvixOB.jpg",
    "tmdb": "t107116",
    "nam_chieu": "2018",
    "trang_thai": "648 VS+TM",
    "thoi_luong": "??? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Chuyển Sinh,Luyện Cấp,Tu Tiên,Hoạt Hình",
    "lich_chieu": "T2,T6",
    "noi_dung": "Vô Thượng Thần Đế kể về Tiên Vương Mục Vân bởi vì nắm giữ Tru Tiên Đồ mà bị kẻ khác ám toán, tàn hồn ngủ say vạn năm sau, thức tỉnh ở trên người Phế vật Mục Vân tại Nam Vân đế quốc Thiên Vận đại lục.Mục Vân mới tỉnh, đã nhận phải sự xem thường của đám học trò, sự khinh rẻ của gia tộc. Nhưng Mục Vân đã dễ dàng hóa giải các thử thách, đồng thời còn khiến nhiều người phải bất ngờ về khả năng của bản thân. Tiếp tục hành trình tu luyện, Mục Vân đã thề phải khuấy đảo thiên địa, trở về đỉnh cao. Một đời này, ta nhất định phải thống trị vạn giới, phá vỡ trời cao!"
  },
  {
    "slug": "linh-vu-dai-luc",
    "ten_phim": "Linh Vũ Đại Lục",
    "ten_goc": "Lingwu Continent, Ling Wu Dalu, 灵武大陆",
    "poster": "https://image.tmdb.org/t/p/w400/dKm6tbjFXdgOODSfBMzqbQNoL9y.jpg",
    "tmdb": "t259844",
    "nam_chieu": "2024",
    "trang_thai": "223 VS+TM",
    "thoi_luong": "?? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Luyện Cấp,Hoạt Hình",
    "lich_chieu": "T2,T6",
    "noi_dung": "Linh Vũ Đại Lục kể về thiên tài Thần Thiên, sau 10 tuổi võ hồn không thấy, linh hải khô cạn, trở thành phế vật của gia tộc. Sau đó vào nhầm đại trận của Cổ Kiếm Đế, có được cơ duyên lớn, từ đó cuộc đời thay đổi, phá Thiên Đạo, nắm giữ luân hồi, độ Đế kiếp, trở thành người đứng đầu Linh Vũ Đại Lục"
  },
  {
    "slug": "muc-than-ky",
    "ten_phim": "Mục Thần Ký",
    "ten_goc": "Tales Of Herding Gods, Tales Of Qin Mu, Mushen Ji, 牧神记",
    "poster": "https://image.tmdb.org/t/p/w400/jPHitNQ1fuKK6aPZ6eCPiFq9XhG.jpg",
    "tmdb": "t236534",
    "nam_chieu": "2024",
    "trang_thai": "104 VS+TM",
    "thoi_luong": "??? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Hoạt Hình",
    "lich_chieu": "CN",
    "noi_dung": "Mục Thần Ký kể về Tần Mục, với sức mạnh bất diệt cuối cùng trở thành giáo chủ Thiên Ma Giáo và được chọn là tiến sĩ thái học đầu tiên của Diên Khang quốc. Trong cuộc chiến phản loạn của Diên Khang quốc, Tần Mục dấn thân vào Hoàng kim Cung Lâu Lan cùng với Võ Khả Hãn, đánh bại các đối thủ, vô địch thủ trong thánh cung. Sau chiến thắng đầy ấn tượng, Tần Mục quay về Diên Khang, nỗ lực giúp quốc sư dẹp yên phản loạn đang nổi lên. Lập được công lao to lớn, Tần Mục được Nhân hoàng truyền thừa và trở thành một Nhân hoàng mới, đánh dấu sự lên ngôi của mình trong lịch sử vĩ đại của Diên Khang quốc."
  },
  {
    "slug": "tien-nghich",
    "ten_phim": "Tiên Nghịch",
    "ten_goc": "Renegade Immortal, Xian Ni, 仙逆",
    "poster": "https://image.tmdb.org/t/p/w400/lcPFF2rPaQpgnuIkie5M23Ir4kd.jpg",
    "tmdb": "t223911",
    "nam_chieu": "2023",
    "trang_thai": "162 VS+TM",
    "thoi_luong": "??? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Tu Tiên,Luyện Cấp,Hoạt Hình",
    "lich_chieu": "T2",
    "noi_dung": "Tiên Nghịch kể về Vương Lâm, một thiếu niên may mắn, bị cuốn vào thế giới pháp thuật và tu tiên của nước Triệu. Ban đầu, hắn thiếu linh căn và không có tri thức về thế giới này. Tuy nhiên, một hiểu lầm tai hại và một khối thiết tinh bí ẩn đã thay đổi cuộc đời của Vương Lâm mãi mãi. Hắn nhận được một Thần Bí Hạt Châu, một sự hỗ trợ quý báu trong việc trở thành một tu sĩ mạnh mẽ."
  },
  {
    "slug": "dau-la-dai-luc-2",
    "ten_phim": "Đấu La Đại Lục 2: Tuyệt Thế Đường Môn",
    "ten_goc": "Soul Land 2: The Peerless Tang Clan, Douluo Dalu II: Jueshi Tangmen, 斗罗大陆Ⅱ绝世唐门",
    "poster": "https://image.tmdb.org/t/p/w400/pzemNbETZKXRzjvBwc1hydqbEeK.jpg",
    "tmdb": "t228429",
    "nam_chieu": "2023",
    "trang_thai": "174 VS+TM",
    "thoi_luong": "??? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Luyện Cấp,Hoạt Hình",
    "lich_chieu": "T7",
    "noi_dung": "Đấu La Đại Lục 2 - Tuyệt Thế Đường Môn kể về sau khi Đường Môn được sáng lập hơn vạn năm trên đại lục Đấu La, Đường Môn suy thoái. Một thế hệ anh tài trời sinh xuất thế, Sử Lai Khắc Thất Quái đời mới liệu có thể trọng chấn Đường Môn, viết nên một khúc nhạc về Tuyệt Thế Đường Môn?"
  },
  {
    "slug": "quang-am-chi-ngoai",
    "ten_phim": "Quang Âm Chi Ngoại",
    "ten_goc": "Beyond Time Gaze, 光阴之外",
    "poster": "https://image.tmdb.org/t/p/w400/7SwXlyFRtelXhDQqTGytsKGZaAv.jpg",
    "tmdb": "t281233",
    "nam_chieu": "2025",
    "trang_thai": "43 VS+TM",
    "thoi_luong": "??? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Tu Tiên,Luyện Cấp,Hoạt Hình",
    "lich_chieu": "T7",
    "noi_dung": "Quang Âm Chi Ngoại kể về Hứa Thanh một con người tràn đầy sự khắc khổ vì hoàn cảnh rất là khắc nghiệt, cũng bởi vì thế mà tính cách của anh luôn rất lạnh lùng, khó để mở lòng với ai đó, luôn đề cao cảnh giác với tất cả mọi người xung quanh, thậm chí là sẵn sàng ra tay với bất kỳ kẻ nào có ý đồ xấu với mình, dù mới chỉ nhen nhóm ở mức có ý định thì cũng không tránh khỏi."
  },
  {
    "slug": "pham-nhan-tu-tien",
    "ten_phim": "Phàm Nhân Tu Tiên",
    "ten_goc": "Fan Ren Xiu Xian, 凡人修仙传",
    "poster": "https://image.tmdb.org/t/p/w600_and_h900_face/xQeT4LPU9KrPHNlmz21qPgcNJ6s.jpg",
    "tmdb": "t106449",
    "nam_chieu": "2020",
    "trang_thai": "195 VS+TM",
    "thoi_luong": "???? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Tu Tiên,Hoạt Hình",
    "lich_chieu": "T7",
    "noi_dung": "Phàm Nhân Tu Tiên kể về Hàn Lập sinh ra trong một gia đình nông dân nghèo, có thúc thúc là nhân viên ngoại đường của một bang phái trung lưu. Bang phái tranh chấp nên đốc rút tuyển mộ đệ tử. Hàn Lập do tư chất thấp kém, trong vài đệ tử được tuyển thì hắn chỉ vào hạng vớt vát, sau đó cùng một đệ tử khác nhập vào môn đồ của một thầy thuốc. Sư phụ này của Hàn lập tuy là một gã võ công xuất chúng chứ không phải tu tiên giả nhưng biết được công pháp tu tiên và công pháp đoạt xá. Hàn Lập được dạy công pháp, nhưng trong đó lại ẩn chứa âm mưu của lão sư phụ, đánh nhau chết sống chủ yếu bằng trí tuệ mới vớt được cái mạng nhỏ. Bước vào giới tu tiên mới nhận ra mình thuộc lại tư chất cực kém. Nhưng bằng vào sự cẩn thận, luôn luôn suy nghĩ nên dần dần sinh sống và phát triển trong thế giới tu tiên."
  },
  {
    "slug": "trach-nhat-phi-thang",
    "ten_phim": "Trạch Nhật Phi Thăng",
    "ten_goc": "择日飞升",
    "poster": "https://image.tmdb.org/t/p/w400/67OIZtXwyDw8QlT97G6aOUG44YC.jpg",
    "tmdb": "tv-326695-1",
    "nam_chieu": "2026",
    "trang_thai": "15 VS+TM",
    "thoi_luong": "??? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Tu Tiên,Luyện Cấp,Hoạt Hình",
    "lich_chieu": "T7",
    "noi_dung": "Trạch Nhật Phi Thăng kể về Dưới thời loạn lạc, yêu quái nổi lên khắp nơi, gian thần thao túng triều chính. Đúng lúc đó, U giới thâm nhập, thế lực của người và quỷ cùng tàn phá nhân gian. Hứa Ứng là 1 người bắt rắn, hắn không chịu nổi cảnh thần cỏ bán mạng cho U giới, ức hiếp dân lành nên đã phản kháng và phạm tội giết thần, đồng thời hắn cũng ra tay đánh chết quan lại triều đình bất lực. Kết quả, Hứa Ứng bị thế lực hai giới truy sát, bắt đầu cuộc đời lưu vong."
  },
  {
    "slug": "than-tai-dau-chiem-long",
    "ten_phim": "Thần Tài Đậu Chiêm Long",
    "ten_goc": "God Of Wealth Dou Zhanlong,财神窦占龙",
    "poster": "https://image.tmdb.org/t/p/w400/zwSPKgp4UXGutfrzyue4Tha3Nc8.jpg",
    "tmdb": "tv-330609-1",
    "nam_chieu": "2026",
    "trang_thai": "11 VS+TM",
    "thoi_luong": "??? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Tu Tiên,Luyện Cấp,Hoạt Hình",
    "lich_chieu": "CN",
    "noi_dung": "Thần Tài Đậu Chiêm Long kể về Ba mươi sáu bàng môn, bảy mươi hai tả đạo, trong đó Bí Bảo được xem là đứng đầu. Bước chân vào con đường phát tài, tranh đoạt tạo hóa của đất trời, cũng đồng nghĩa với việc đặt mình vào vô số hiểm cảnh. Đậu Chiêm Long – vị Thần Tài tà môn nhất lịch sử – mang trong mình một vận mệnh không thể thoát khỏi. Giữa những bí thuật dân gian, kỳ cảnh quỷ dị và vòng xoáy nhân quả, hắn buộc phải nghịch thiên cải mệnh, phá vỡ xiềng xích số phận và tìm ra con đường sống của chính mình."
  },
  {
    "slug": "do-thi-co-tien-y",
    "ten_phim": "Đô Thị Cổ Tiên Y",
    "ten_goc": "Immortal Doctor In Modern City, Du Shi Gu Xian Yi, 都市古仙医",
    "poster": "https://image.tmdb.org/t/p/w400/uR7U1KBs5WAWvwbBA8SA8AnOhLE.jpg",
    "tmdb": "t273263",
    "nam_chieu": "2024",
    "trang_thai": "220 VS+TM",
    "thoi_luong": "??? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Hiện Đại,Tu Tiên,Hoạt Hình",
    "lich_chieu": "T4,CN",
    "noi_dung": "Đô Thị Cổ Tiên Y kể về Diệp Bất Phàm là một sinh viên năm 3, để kiếm đủ tiền nằm viện cho mẹ mà đi ăn vạ, giả vờ tai nạn để bắt người khác bồi thường. Nào ngờ lại gặp phải một cô tài xế không làm theo những gì người ta hay làm. Sau khi bị đâm, Diệp bất Phàm vô tình xuyên không vào một ảo cảnh, và có được truyền thừa của một môn phái về y học thời cổ đại. Từ đó, anh ta thông thạo y thuật, tu luyện công pháp, và được rất nhiều mỹ nữ chú ý vây quanh."
  },
  {
    "slug": "vo-than-chua-te",
    "ten_phim": "Võ Thần Chúa Tể",
    "ten_goc": "The God Of War Dominates, Wu Shen Zhu Zai, 武神主宰",
    "poster": "https://image.tmdb.org/t/p/w400/tiiDyfu3CXhqJMqD303KjMctNVG.jpg",
    "tmdb": "tv-110181-1",
    "nam_chieu": "2018",
    "trang_thai": "699 VS+TM",
    "thoi_luong": "??? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Chuyển Sinh,Luyện Cấp,Hoạt Hình",
    "lich_chieu": "T3,CN",
    "noi_dung": "Võ Thần Chúa Tể kể về Thiên Vũ đại lục nhất đại truyền kỳ Tần Trần, bởi vì bạn tốt phản bội bất ngờ ngã xuống Võ vực. 300 năm sau, hắn chuyển sinh ở một cái nhận hết ức hiếp vương phủ con riêng trên người, lợi dụng kiếp trước trình độ, ngưng thần công, luyện thần đan, đi ngược lên trời, quật khởi mạnh mẽ, từ đây bước lên một đoạn khiếp sợ đại lục kinh thế lữ trình."
  },
  {
    "slug": "su-huynh-a-su-huynh",
    "ten_phim": "Sư Huynh À Sư Huynh",
    "ten_goc": "My Senior Brother Is Too Steady, Shi Xiong A Shi Xiong, 师兄啊师兄",
    "poster": "https://image.tmdb.org/t/p/w400/fKSRWr8MtJoAEjEPOuIUiIFmIlb.jpg",
    "tmdb": "t218642",
    "nam_chieu": "2023",
    "trang_thai": "162 VS+TM",
    "thoi_luong": "?? Tập",
    "quoc_gia": "Trung Quốc",
    "the_loai": "Tu Tiên,Hoạt Hình",
    "lich_chieu": "T5",
    "noi_dung": "Sư Huynh À Sư Huynh kể về Lý Trường Thọ - một thanh niên mắc bệnh hiểm nghèo vô tình được tái sinh vào thời thượng cổ trước đại chiến phong thần, trở thành một Luyện khí sĩ. Vì để tu được trường sinh bất lão và sống yên thân nơi hồng hoang tàn khốc này mà hắn hành sự khiêm tốn, tính trước làm sau, trước giờ không bao giờ bước vào nơi nguy hiểm, giấu át chủ bài, tu độn thuật, luyện đan độc. Cho đến một hôm, sư phụ của hắn nhận một sư muội về cho hắn, Lý Trường Thọ vốn muốn khiêm tốn tu hành bị cuốn vào hiểm nguy."
  }
];

// Bộ nhớ đệm in-memory cho phim
const movieCache = new Map();
SEED_MOVIES.forEach(m => movieCache.set(m.slug, m));

// ============================================================================
// NHÓM 1: CÁC HÀM PHỤC VỤ CRAWL & PHÂN GIẢI LUỒNG TỪ NGUỒN ZOPHIM (CRAWLER LAYER)
// ============================================================================

/**
 * Giải mã Dean Edwards Packer JavaScript eval(function(p,a,c,k,e,d)...)
 */
function unpackDeanEdwards(p, a, c, k) {
  const getWord = (num) => {
    return (num < a ? "" : getWord(Math.floor(num / a))) +
      ((num = num % a) > 35 ? String.fromCharCode(num + 29) : num.toString(36));
  };
  const dict = {};
  while (c--) {
    dict[getWord(c)] = k[c] || getWord(c);
  }
  return p.replace(/\b\w+\b/g, (w) => dict[w] || w);
}

/**
 * Phân giải chuỗi NDJSON (mỗi dòng là một đối tượng JSON)
 */
function parseNdjson(rawText) {
  if (!rawText || typeof rawText !== "string") return [];
  const lines = rawText.trim().split(/\r?\n/);
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("{") && line.endsWith("}")) {
      try {
        const parsed = JSON.parse(line);
        if (parsed && (parsed.slug || parsed.ten_phim)) {
          result.push(parsed);
          if (parsed.slug) movieCache.set(parsed.slug, parsed);
        }
      } catch (e) {}
    }
  }
  return result;
}

/**
 * Crawl danh sách phim cập nhật theo trang
 */
async function fetchUpdatePage(page = 1) {
  try {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const endpoint = getApiBase() + "/api/v1/update/" + p;
    const res = await fetch(endpoint, {
      headers: {
        "User-Agent": DEFAULT_UA,
        "Accept": "*/*",
        "Referer": getWebDomain() + "/"
      }
    });
    if (res.ok) {
      const text = await res.text();
      const list = parseNdjson(text);
      if (list.length > 0) return list;
    }
  } catch (e) {}

  if (page === 1) return SEED_MOVIES;
  return [];
}

/**
 * Tìm kiếm phim theo từ khóa
 */
async function searchFilms(keyword, page = 1) {
  try {
    const q = (keyword || "").trim();
    if (!q) return [];
    const p = Math.max(1, parseInt(page, 10) || 1);
    const endpoint = getApiBase() + "/api/v1/search/" + encodeURIComponent(q) + "/" + p;
    const res = await fetch(endpoint, {
      headers: {
        "User-Agent": DEFAULT_UA,
        "Accept": "*/*",
        "Referer": getWebDomain() + "/"
      }
    });
    if (res.ok) {
      const text = await res.text();
      return parseNdjson(text);
    }
  } catch (e) {}
  return [];
}

/**
 * Lấy danh sách các tập phim theo slug
 */
async function fetchEpisodesList(slug) {
  const cleanSlug = String(slug || "").trim();
  if (!cleanSlug) return [];

  try {
    const endpoint = getApiBase() + "/api/v1/list/" + encodeURIComponent(cleanSlug);
    const res = await fetch(endpoint, {
      headers: {
        "User-Agent": DEFAULT_UA,
        "Accept": "*/*",
        "Referer": getWebDomain() + "/"
      }
    });
    if (res.ok) {
      const text = await res.text();
      const lines = text.trim().split(/\r?\n/);
      const eps = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("{") && line.endsWith("}")) {
          try {
            const parsed = JSON.parse(line);
            if (parsed && parsed.tap && (parsed.vs || parsed.tm)) {
              eps.push(parsed);
            }
          } catch (e) {}
        }
      }
      if (eps.length > 0) return eps;
    }
  } catch (e) {}

  return [];
}

/**
 * Tìm kiếm thông tin chi tiết của phim theo slug
 */
async function fetchMovieInfo(slug) {
  const cleanSlug = String(slug || "").trim();
  if (movieCache.has(cleanSlug)) {
    return movieCache.get(cleanSlug);
  }

  // Thử tìm kiếm qua API search bằng slug
  try {
    const found = await searchFilms(cleanSlug, 1);
    const exact = found.find(m => m.slug === cleanSlug) || found[0];
    if (exact) {
      movieCache.set(cleanSlug, exact);
      return exact;
    }
  } catch (e) {}

  // Fallback từ SEED_MOVIES
  const seedFound = SEED_MOVIES.find(m => m.slug === cleanSlug);
  if (seedFound) return seedFound;

  return {
    slug: cleanSlug,
    ten_phim: cleanSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    ten_goc: "",
    poster: getWebDomain() + "/favicon.ico",
    nam_chieu: new Date().getFullYear(),
    trang_thai: "Đang cập nhật",
    thoi_luong: "?? Tập",
    quoc_gia: "Trung Quốc",
    the_loai: "Hoạt Hình,Tu Tiên",
    noi_dung: ""
  };
}

/**
 * Trích xuất URL video HLS trực tiếp từ trang ssplay.net
 */
async function extractStreamUrl(embedUrl) {
  if (!embedUrl || !embedUrl.startsWith("http")) return null;

  try {
    const res = await fetch(embedUrl, {
      headers: {
        "User-Agent": DEFAULT_UA,
        "Referer": getWebDomain() + "/"
      }
    });
    if (!res.ok) return null;
    const html = await res.text();

    // 1. Thử regex trực tiếp
    const fileMatch = html.match(/sources:\s*\[\s*\{\s*["']?file["']?:\s*["']([^"']+)["']/i);
    if (fileMatch && fileMatch[1]) {
      const path = fileMatch[1];
      return path.startsWith("http") ? path : ("https://ssplay.net" + path);
    }

    // 2. Giải mã Dean Edwards Packer
    const robustRegex = /eval\(function\(p,a,c,k,e,d\)[\s\S]*?\}\s*\(\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")\.split\('\|'\)/gi;
    let m;
    while ((m = robustRegex.exec(html)) !== null) {
      try {
        const p = m[1].slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
        const a = parseInt(m[2], 10);
        const c = parseInt(m[3], 10);
        const k = m[4].slice(1, -1).split("|");

        let unpacked = "";
        if (globalThis.extractors && typeof globalThis.extractors.unpack === "function") {
          unpacked = globalThis.extractors.unpack(m[0]);
        }
        if (!unpacked) {
          unpacked = unpackDeanEdwards(p, a, c, k);
        }

        const uMatch = unpacked.match(/sources:\s*\[\s*\{\s*["']?file["']?:\s*["']([^"']+)["']/i)
          || unpacked.match(/["']?file["']?:\s*["']([^"']+\.html|[^"']+\.m3u8)["']/i);
        if (uMatch && uMatch[1]) {
          const path = uMatch[1];
          return path.startsWith("http") ? path : ("https://ssplay.net" + path);
        }
      } catch (e) {}
    }
  } catch (e) {}

  return null;
}

/**
 * Chuẩn hóa một item phim thành MovieItem cho JKHX Player
 */
function formatMovieItem(m) {
  const genres = (m.the_loai || "").split(",").map(s => s.trim()).filter(Boolean);
  const isSeries = (m.thoi_luong && m.thoi_luong.includes("Tập")) || (m.trang_thai && m.trang_thai.includes("Tập"));
  let logo = m.poster || (getWebDomain() + "/favicon.ico");
  if (logo.startsWith("//")) logo = "https:" + logo;

  let year = new Date().getFullYear();
  if (m.nam_chieu) {
    const y = parseInt(m.nam_chieu, 10);
    if (!isNaN(y) && y > 1900) year = y;
  }

  const lang = m.trang_thai?.includes("TM") ? "Vietsub + Thuyết Minh" : "Vietsub";

  return {
    slug: m.slug,
    name: m.ten_phim,
    originName: m.ten_goc || m.ten_phim,
    thumbUrl: logo,
    posterUrl: logo,
    backdropUrl: logo,
    year: year,
    type: isSeries ? "tv" : "movie",
    quality: "FHD 1080p",
    language: lang,
    category: genres[0] || m.quoc_gia || "Hoạt Hình",
    providerId: "zophim",
    episodeCurrent: m.trang_thai || ""
  };
}

// ============================================================================
// NHÓM 2: CÁC HÀM PHỤC VỤ GIAO DIỆN JKHX-PLAYER (PLAYER CONTRACT LAYER)
// ============================================================================

/**
 * 2.1 PLAYER INTERFACE (BẮT BUỘC): Dữ liệu các row phim cho HomeScreen
 */
async function getHome() {
  const page1 = await fetchUpdatePage(1);
  const page2 = await fetchUpdatePage(2);
  const allMovies = [...page1, ...page2];

  const chinaAnime = allMovies.filter(m => (m.quoc_gia || "").includes("Trung Quốc") || (m.the_loai || "").includes("Tu Tiên") || (m.the_loai || "").includes("Luyện Cấp"));
  const japanAnime = allMovies.filter(m => (m.quoc_gia || "").includes("Nhật") || (m.the_loai || "").includes("Dị Giới"));
  const fullMovies = allMovies.filter(m => (m.trang_thai || "").toLowerCase().includes("full"));
  const tuTienMovies = allMovies.filter(m => (m.the_loai || "").toLowerCase().includes("tu tiên") || (m.the_loai || "").toLowerCase().includes("luyện cấp"));

  const sections = [
    {
      title: "🔥 Phim Mới Cập Nhật",
      type: "danh-sach",
      slug: "update",
      items: page1.slice(0, 20).map(formatMovieItem)
    },
    {
      title: "🐉 Hoạt Hình 3D Trung Quốc",
      type: "the-loai",
      slug: "trung-quoc",
      items: (chinaAnime.length > 0 ? chinaAnime : page1).slice(0, 20).map(formatMovieItem)
    },
    {
      title: "🌸 Anime Nhật Bản Nổi Bật",
      type: "the-loai",
      slug: "nhat-ban",
      items: (japanAnime.length > 0 ? japanAnime : page2).slice(0, 20).map(formatMovieItem)
    },
    {
      title: "✨ Trọn Bộ Hoàn Thành (Full)",
      type: "danh-sach",
      slug: "full",
      items: (fullMovies.length > 0 ? fullMovies : page1).slice(0, 20).map(formatMovieItem)
    },
    {
      title: "⚔️ Tu Tiên & Luyện Cấp Đặc Sắc",
      type: "the-loai",
      slug: "tu-tien",
      items: (tuTienMovies.length > 0 ? tuTienMovies : page1).slice(0, 20).map(formatMovieItem)
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
  const genres = [
    { name: "Hoạt Hình", slug: "hoat-hinh" },
    { name: "Tu Tiên", slug: "tu-tien" },
    { name: "Luyện Cấp", slug: "luyen-cap" },
    { name: "Chuyển Sinh", slug: "chuyen-sinh" },
    { name: "Dị Giới", slug: "di-gioi" },
    { name: "Viễn Tưởng", slug: "vien-tuong" },
    { name: "Hành Động", slug: "hanh-dong" },
    { name: "Phiêu Lưu", slug: "phieu-luu" },
    { name: "Học Đường", slug: "hoc-duong" },
    { name: "Tình Yêu", slug: "tinh-yeu" },
    { name: "Cổ Trang", slug: "co-trang" },
    { name: "Kinh Dị", slug: "kinh-di" }
  ];

  const countries = [
    { name: "Trung Quốc", slug: "trung-quoc" },
    { name: "Nhật Bản", slug: "nhat-ban" }
  ];

  return [
    { title: "ZoPhim", isDropdown: false, prefix: "danh-sach", slug: "home" },
    { title: "Mới cập nhật", isDropdown: false, prefix: "danh-sach", slug: "update" },
    { title: "HH Trung Quốc", isDropdown: false, prefix: "quoc-gia", slug: "trung-quoc" },
    { title: "Anime Nhật", isDropdown: false, prefix: "quoc-gia", slug: "nhat-ban" },
    { title: "Phim Full", isDropdown: false, prefix: "danh-sach", slug: "full" },
    { title: "Thể loại", isDropdown: true, prefix: "the-loai", items: genres },
    { title: "Quốc gia", isDropdown: true, prefix: "quoc-gia", items: countries }
  ];
}

/**
 * 2.3 PLAYER INTERFACE (BẮT BUỘC): Phân trang danh sách phim cho MovieListScreen
 */
async function getList(type, slug, page = 1, filters = {}) {
  try {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const movies = await fetchUpdatePage(p);
    const effectiveSlug = (slug || type || "update").toLowerCase();

    let filtered = movies;

    if (effectiveSlug === "full") {
      filtered = filtered.filter(m => (m.trang_thai || "").toLowerCase().includes("full"));
    } else if (effectiveSlug === "trung-quoc" || (type === "quoc-gia" && effectiveSlug.includes("trung"))) {
      filtered = filtered.filter(m => (m.quoc_gia || "").toLowerCase().includes("trung"));
    } else if (effectiveSlug === "nhat-ban" || (type === "quoc-gia" && effectiveSlug.includes("nhat"))) {
      filtered = filtered.filter(m => (m.quoc_gia || "").toLowerCase().includes("nhật"));
    } else if (type === "the-loai") {
      const genreKeyword = effectiveSlug.replace(/-/g, " ");
      filtered = filtered.filter(m => (m.the_loai || "").toLowerCase().includes(genreKeyword));
    }

    if (filters) {
      if (filters.genre && filters.genre !== "all") {
        const g = filters.genre.toLowerCase();
        filtered = filtered.filter(m => (m.the_loai || "").toLowerCase().includes(g));
      }
      if (filters.country && filters.country !== "all") {
        const c = filters.country.toLowerCase();
        filtered = filtered.filter(m => (m.quoc_gia || "").toLowerCase().includes(c));
      }
      if (filters.year && filters.year !== "all") {
        filtered = filtered.filter(m => String(m.nam_chieu) === String(filters.year));
      }
    }

    const items = filtered.map(formatMovieItem);
    const TOTAL_PAGES = 47;

    return {
      items: items,
      page: p,
      hasNext: p < TOTAL_PAGES,
      totalPages: TOTAL_PAGES,
      totalItems: TOTAL_PAGES * 20
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
    const found = await searchFilms(keyword, p);
    const items = found.map(formatMovieItem);

    return {
      items: items,
      page: p,
      hasNext: items.length >= 20
    };
  } catch (e) {
    return { items: [], page: 1, hasNext: false };
  }
}

/**
 * 2.5 PLAYER INTERFACE (BẮT BUỘC): Chi tiết phim & danh sách tập cho DetailScreen
 */
async function getDetail(slug) {
  const movie = await fetchMovieInfo(slug);
  const rawEpisodes = await fetchEpisodesList(slug);

  const vsEpisodes = [];
  const tmEpisodes = [];

  rawEpisodes.forEach((ep) => {
    const tapNum = parseInt(ep.tap, 10) || ep.tap;
    const epName = "Tập " + ep.tap;
    const epSlug = "tap-" + ep.tap;

    if (ep.vs) {
      vsEpisodes.push({
        id: "vs-" + ep.tap,
        name: epName,
        slug: epSlug,
        number: typeof tapNum === "number" ? tapNum : 1,
        serverName: "ZoPhim Vietsub",
        data: {
          url: ep.vs,
          serverType: "vs",
          tap: ep.tap,
          slug: slug
        }
      });
    }

    if (ep.tm) {
      tmEpisodes.push({
        id: "tm-" + ep.tap,
        name: epName,
        slug: epSlug,
        number: typeof tapNum === "number" ? tapNum : 1,
        serverName: "ZoPhim Thuyết Minh",
        data: {
          url: ep.tm,
          serverType: "tm",
          tap: ep.tap,
          slug: slug
        }
      });
    }
  });

  const episodeServers = [];
  if (vsEpisodes.length > 0) {
    episodeServers.push({
      serverName: "ZoPhim Vietsub",
      episodes: vsEpisodes
    });
  }
  if (tmEpisodes.length > 0) {
    episodeServers.push({
      serverName: "ZoPhim Thuyết Minh",
      episodes: tmEpisodes
    });
  }

  // Đảm bảo luôn có ít nhất 1 server
  if (episodeServers.length === 0) {
    episodeServers.push({
      serverName: "ZoPhim Mặc Định",
      episodes: [
        {
          id: "tap-1",
          name: "Tập 1",
          slug: "tap-1",
          number: 1,
          serverName: "ZoPhim Mặc Định",
          data: {
            url: getWebDomain() + "/",
            slug: slug
          }
        }
      ]
    });
  }

  const genres = (movie.the_loai || "").split(",").map(s => s.trim()).filter(Boolean);
  const isSeries = (movie.thoi_luong && movie.thoi_luong.includes("Tập")) || (movie.trang_thai && movie.trang_thai.includes("Tập"));
  let logo = movie.poster || (getWebDomain() + "/favicon.ico");
  if (logo.startsWith("//")) logo = "https:" + logo;

  let year = new Date().getFullYear();
  if (movie.nam_chieu) {
    const y = parseInt(movie.nam_chieu, 10);
    if (!isNaN(y) && y > 1900) year = y;
  }

  return {
    slug: movie.slug,
    name: movie.ten_phim,
    originName: movie.ten_goc || movie.ten_phim,
    thumbUrl: logo,
    posterUrl: logo,
    backdropUrl: logo,
    year: year,
    type: isSeries ? "tv" : "movie",
    status: (movie.trang_thai || "").toLowerCase().includes("full") ? "completed" : "ongoing",
    quality: "FHD 1080p",
    language: movie.trang_thai?.includes("TM") ? "Vietsub + Thuyết Minh" : "Vietsub",
    duration: movie.thoi_luong || "",
    currentEpisode: movie.trang_thai || "",
    totalEpisodes: movie.thoi_luong || (rawEpisodes.length + " Tập"),
    description: movie.noi_dung || ("Xem phim " + movie.ten_phim + " (" + (movie.ten_goc || "") + ") chất lượng cao FHD 1080p Vietsub, Thuyết minh trên ZoPhim."),
    actors: [],
    directors: [],
    genres: genres.length > 0 ? genres : ["Hoạt Hình", "Tu Tiên"],
    countries: [movie.quoc_gia || "Trung Quốc"],
    episodes: episodeServers
  };
}

/**
 * 2.6 PLAYER INTERFACE (BẮT BUỘC): Luồng phát trực tiếp video cho ExoPlayer JKHX
 */
async function getStream(episodeData) {
  const data = (episodeData && episodeData.data) || {};
  const embedUrl = data.url || "";

  if (embedUrl && embedUrl.startsWith("http")) {
    const streamHls = await extractStreamUrl(embedUrl);
    if (streamHls) {
      return {
        type: "m3u8",
        url: streamHls,
        headers: {
          "User-Agent": DEFAULT_UA,
          "Referer": embedUrl,
          "Origin": "https://ssplay.net"
        },
        fallbackUrl: embedUrl,
        subtitles: []
      };
    }

    // Fallback sang embed iframe nếu bóc tách m3u8 không thành công
    return {
      type: "embed",
      url: embedUrl,
      headers: {
        "User-Agent": DEFAULT_UA,
        "Referer": getWebDomain() + "/"
      },
      subtitles: []
    };
  }

  return {
    type: "embed",
    url: getWebDomain() + "/",
    headers: {
      "User-Agent": DEFAULT_UA
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
      { name: "Hoạt Hình", slug: "hoat-hinh" },
      { name: "Tu Tiên", slug: "tu-tien" },
      { name: "Luyện Cấp", slug: "luyen-cap" },
      { name: "Chuyển Sinh", slug: "chuyen-sinh" },
      { name: "Dị Giới", slug: "di-gioi" },
      { name: "Viễn Tưởng", slug: "vien-tuong" },
      { name: "Hành Động", slug: "hanh-dong" },
      { name: "Phiêu Lưu", slug: "phieu-luu" },
      { name: "Học Đường", slug: "hoc-duong" },
      { name: "Tình Yêu", slug: "tinh-yeu" },
      { name: "Cổ Trang", slug: "co-trang" },
      { name: "Kinh Dị", slug: "kinh-di" }
    ],
    countries: [
      { name: "Tất cả quốc gia", slug: "all" },
      { name: "Trung Quốc", slug: "trung-quoc" },
      { name: "Nhật Bản", slug: "nhat-ban" }
    ],
    years: [
      { name: "Tất cả năm", slug: "all" },
      { name: "2026", slug: "2026" },
      { name: "2025", slug: "2025" },
      { name: "2024", slug: "2024" },
      { name: "2023", slug: "2023" },
      { name: "2022", slug: "2022" },
      { name: "2021", slug: "2021" },
      { name: "2020", slug: "2020" }
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
      title: "Máy chủ API ZoPhim",
      description: "Địa chỉ máy chủ API backend (mặc định: https://anisrc.top)",
      type: "text",
      defaultValue: DEFAULT_API_BASE,
      currentValue: currentApi
    },
    {
      key: "web_domain",
      title: "Tên miền ZoPhim Blog",
      description: "Địa chỉ website tham chiếu (mặc định: https://api-zophim.blogspot.com)",
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
    const endpoint = getApiBase() + "/api/v1/update/1";
    const res = await fetch(endpoint, {
      headers: { "User-Agent": DEFAULT_UA }
    });
    const latency = Date.now() - start;
    if (res.ok) {
      const text = await res.text();
      const list = parseNdjson(text);
      return {
        status: "ok",
        message: "Kết nối máy chủ ZoPhim ổn định (" + latency + "ms) - " + list.length + " phim mới",
        latencyMs: latency
      };
    }
    return { status: "degraded", message: "Phản hồi HTTP " + res.status + " (" + latency + "ms)", latencyMs: latency };
  } catch (e) {
    return { status: "error", message: "Lỗi kết nối ZoPhim: " + e.message, latencyMs: Date.now() - start };
  }
}

// ============================================================================
// EXPORT DEFAULT PLUGIN OBJECT
// ============================================================================
export default {
  id: "zophim",
  name: "ZoPhim",
  version: "1.0.0",
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
