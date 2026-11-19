import type { LocaleString } from "../config";

/** Content list sorting, filters, bulk actions, export and the hub. Keys start with `cl`. */
export const CONTENT_LIST_STRINGS = {
  /* Sorting */
  clSortBy: { th: "เรียงตาม {column}", en: "Sort by {column}" },
  clSortedAsc: { th: "เรียงจากน้อยไปมาก", en: "sorted ascending" },
  clSortedDesc: { th: "เรียงจากมากไปน้อย", en: "sorted descending" },
  clColPublished: { th: "วันที่เผยแพร่", en: "Published" },
  clColStarts: { th: "วันที่เริ่ม", en: "Starts" },

  /* Filters */
  clFilters: { th: "ตัวกรอง", en: "Filters" },
  clFilterBy: { th: "แก้ไขโดย", en: "Edited by" },
  clFilterByAny: { th: "ทุกคน", en: "Anyone" },
  clFilterWithin: { th: "แก้ไขภายใน", en: "Edited within" },
  clWithinAny: { th: "ทุกช่วงเวลา", en: "Any time" },
  clWithin7: { th: "7 วันที่ผ่านมา", en: "Last 7 days" },
  clWithin30: { th: "30 วันที่ผ่านมา", en: "Last 30 days" },
  clFilterCategory: { th: "หมวดหมู่", en: "Category" },
  clFilterPolicyStatus: { th: "สถานะนโยบาย", en: "Policy status" },
  clFilterFacetAny: { th: "ทั้งหมด", en: "All" },
  clApplyFilters: { th: "ใช้ตัวกรอง", en: "Apply filters" },
  clActiveFilters: { th: "ตัวกรองที่ใช้อยู่", en: "Active filters" },
  clRemoveFilter: { th: "ลบตัวกรอง {filter}", en: "Remove filter {filter}" },
  clChipSearch: { th: "ค้นหา: {value}", en: "Search: {value}" },
  clChipStatus: { th: "สถานะ: {value}", en: "Status: {value}" },
  clChipBy: { th: "แก้ไขโดย: {value}", en: "Edited by: {value}" },
  clChipWithin: { th: "แก้ไขภายใน: {value}", en: "Edited within: {value}" },
  clChipFacet: { th: "{label}: {value}", en: "{label}: {value}" },
  clCatTransport: { th: "การเดินทาง", en: "Transport" },
  clCatWelfare: { th: "สวัสดิการ", en: "Welfare" },
  clCatActivity: { th: "กิจกรรม", en: "Activity" },
  clCatGovernance: { th: "การกำกับดูแล", en: "Governance" },
  clPolNotStarted: { th: "ยังไม่เริ่ม", en: "Not started" },
  clPolInProgress: { th: "กำลังดำเนินการ", en: "In progress" },
  clPolDelivered: { th: "ส่งมอบแล้ว", en: "Delivered" },
  clPolBlocked: { th: "ติดขัด", en: "Blocked" },
  clPolDropped: { th: "ยกเลิก", en: "Dropped" },
  statusScheduled: { th: "ตั้งเวลาเผยแพร่", en: "Scheduled" },

  /* Selection and bulk actions */
  clSelectAll: { th: "เลือกทุกรายการในหน้านี้", en: "Select all on this page" },
  clSelectRow: { th: "เลือก {name}", en: "Select {name}" },
  clSelectedCount: { th: "เลือกแล้ว {count} รายการ", en: "{count} selected" },
  clBulkActions: { th: "การดำเนินการกับรายการที่เลือก", en: "Actions for selected items" },
  clBulkPublish: { th: "เผยแพร่", en: "Publish" },
  clBulkUnpublish: { th: "ยกเลิกการเผยแพร่", en: "Unpublish" },
  clBulkDelete: { th: "ลบ", en: "Delete" },
  clBulkNone: { th: "เลือกอย่างน้อยหนึ่งรายการก่อนดำเนินการ", en: "Select at least one item first." },
  clBulkDoneTitle: { th: "ดำเนินการเสร็จแล้ว", en: "Done" },
  clBulkPartialTitle: { th: "ดำเนินการสำเร็จบางรายการ", en: "Some items could not be changed" },
  clBulkFailedTitle: { th: "ดำเนินการไม่ได้", en: "Nothing was changed" },
  clBulkSummaryPublish: { th: "เผยแพร่แล้ว {ok} รายการ ไม่สำเร็จ {failed} รายการ", en: "Published {ok}. Could not publish {failed}." },
  clBulkSummaryUnpublish: { th: "ยกเลิกการเผยแพร่แล้ว {ok} รายการ ไม่สำเร็จ {failed} รายการ", en: "Unpublished {ok}. Could not unpublish {failed}." },
  clBulkSummaryDelete: { th: "ลบแล้ว {ok} รายการ ไม่สำเร็จ {failed} รายการ", en: "Deleted {ok}. Could not delete {failed}." },
  clBulkFailureItem: { th: "{title}: {reason}", en: "{title}: {reason}" },
  clReasonMissingTh: { th: "ยังไม่มีภาษาไทย กรอกชื่อภาษาไทยก่อนเผยแพร่", en: "Thai is missing. Add a Thai title before publishing" },
  clReasonMissingEn: { th: "ยังไม่มีภาษาอังกฤษ กรอกชื่อภาษาอังกฤษก่อนเผยแพร่", en: "English is missing. Add an English title before publishing" },
  clReasonMissingBoth: { th: "ยังไม่มีชื่อทั้งสองภาษา", en: "Both language titles are missing" },
  clReasonNotFound: { th: "ไม่พบรายการนี้แล้ว", en: "This item no longer exists" },
  clReasonInUse: { th: "ยังมีรายการอื่นอ้างอิงอยู่ จึงลบไม่ได้", en: "Something else still uses it, so it cannot be deleted" },
  clReasonError: { th: "เกิดข้อผิดพลาด ลองอีกครั้ง", en: "Something went wrong. Try again" },
  clConfirmTitle: { th: "ลบ {count} รายการ", en: "Delete {count} {count:item|items}" },
  clConfirmBody: { th: "รายการต่อไปนี้จะลบถาวร และย้อนกลับไม่ได้", en: "These items will be deleted for good. This cannot be undone." },
  clConfirmDelete: { th: "ลบ {count} รายการ", en: "Delete {count} items" },
  clConfirmCancel: { th: "ยกเลิกและกลับไปที่รายการ", en: "Cancel and go back to the list" },
  clConfirmEmpty: { th: "ไม่มีรายการที่เลือก", en: "No items were selected." },

  /* Export */
  clExport: { th: "ส่งออก CSV", en: "Export CSV" },
  clExportNote: { th: "ส่งออกตามตัวกรองปัจจุบัน", en: "Exports the current filters" },

  /* Row menu */
  clMoreFor: { th: "การดำเนินการเพิ่มเติมสำหรับ {name}", en: "More actions for {name}" },

  /* Hub */
  clHubDraftsTotal: { th: "ฉบับร่างทั้งหมด", en: "Drafts across all types" },
  clHubDraftsHint: { th: "ยังไม่เผยแพร่", en: "Not yet published" },
  clHubMine: { th: "ที่ฉันแก้ไขล่าสุด", en: "Recently edited by me" },
  clHubMineEmpty: { th: "ยังไม่ได้แก้ไขเนื้อหาใด", en: "You have not edited any content yet." },
} as const satisfies Record<string, LocaleString>;
