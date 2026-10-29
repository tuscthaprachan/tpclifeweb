import type { LocaleString } from "../config";

/** Staff console shell strings: sidebar, top bar, command palette and the shared page primitives. Keys start with `cs`. */
export const CONSOLE_STRINGS = {
  /* Sidebar groups */
  csGroupWork: { th: "งานประจำ", en: "Work" },
  csGroupAnnouncements: { th: "ประกาศ", en: "Announcements" },
  csGroupInformation: { th: "ข้อมูลและคู่มือ", en: "Information" },
  csGroupDirectory: { th: "ทำเนียบ", en: "Directory" },
  csGroupCanteen: { th: "โรงอาหาร", en: "Canteen" },
  csGroupLostFound: { th: "ของหายและของเจอ", en: "Lost and found" },
  csGroupMedia: { th: "สื่อ", en: "Media" },
  csGroupSettings: { th: "การตั้งค่า", en: "Settings" },

  /* Sidebar items not covered by existing keys */
  csNavStaff: { th: "เจ้าหน้าที่", en: "Staff" },
  csNavSecurity: { th: "ความปลอดภัย", en: "Security" },

  /* Sidebar and top bar controls */
  csOpenMenu: { th: "เปิดเมนู", en: "Open menu" },
  csCloseMenu: { th: "ปิดเมนู", en: "Close menu" },
  csCollapseSidebar: { th: "ย่อเมนูด้านข้าง", en: "Collapse the side menu" },
  csExpandSidebar: { th: "ขยายเมนูด้านข้าง", en: "Expand the side menu" },
  csTopbar: { th: "แถบเครื่องมือ", en: "Toolbar" },
  csSettingsMenu: { th: "การแสดงผล", en: "Display" },

  /* Account menu */
  csAccountMenu: { th: "บัญชีของฉัน", en: "My account" },
  csSignedInAs: { th: "เข้าสู่ระบบในชื่อ", en: "Signed in as" },
  csRolesHeading: { th: "บทบาท", en: "Roles" },
  csAccountSecurity: { th: "ความปลอดภัยของบัญชี", en: "Account security" },

  /* Command palette */
  csSearchButton: { th: "ค้นหา", en: "Search" },
  csSearchButtonHint: { th: "ค้นหาหน้าและคำสั่ง", en: "Search pages and actions" },
  csPaletteTitle: { th: "ค้นหาในคอนโซล", en: "Search the console" },
  csPalettePlaceholder: { th: "พิมพ์ชื่อหน้าหรือคำสั่ง", en: "Type a page or an action" },
  csPaletteGoTo: { th: "ไปที่หน้า", en: "Go to" },
  csPaletteCreate: { th: "สร้างใหม่", en: "Create" },
  csPaletteResults: { th: "ผลการค้นหา", en: "Results" },
  csPaletteEmpty: { th: "ไม่พบรายการที่ตรงกับ \"{query}\"", en: "Nothing matches \"{query}\"" },
  csPaletteLoading: { th: "กำลังค้นหา", en: "Searching" },
  csPaletteCount: { th: "พบ {count} รายการ", en: "{count} results" },
  csPaletteKeys: { th: "ลูกศรขึ้นลงเพื่อเลือก Enter เพื่อเปิด Esc เพื่อปิด", en: "Up and down to choose, Enter to open, Esc to close" },
  csPaletteClose: { th: "ปิดการค้นหา", en: "Close search" },

  /* Page primitives */
  csBreadcrumbs: { th: "เส้นทางหน้า", en: "Breadcrumb" },
  csDirty: { th: "มีการเปลี่ยนแปลงที่ยังไม่บันทึก", en: "You have unsaved changes" },
  csSaved: { th: "บันทึกการเปลี่ยนแปลงทั้งหมดแล้ว", en: "All changes saved" },
  csFilters: { th: "ตัวกรอง", en: "Filters" },
  csSearchField: { th: "ค้นหา", en: "Search" },
  csActions: { th: "การดำเนินการ", en: "Actions" },
  csCount: { th: "{count} รายการ", en: "{count} items" },
} as const satisfies Record<string, LocaleString>;
