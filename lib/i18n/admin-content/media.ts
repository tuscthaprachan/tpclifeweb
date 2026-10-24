import type { LocaleString } from "../config";

/** Staff console strings for the picture library (`media`) and lost and found (`lf`). */
export const MEDIA_STRINGS = {
  /* Picture library: list */
  mediaIntro: {
    th: "รูปภาพทั้งหมดที่ใช้บนเว็บไซต์ อัปโหลดรูปใหม่ หรือแก้คำอธิบายและเครดิตของรูปที่มีอยู่",
    en: "Every picture used on the website. Upload a new one, or correct the description and credit of an existing one",
  },
  mediaUploadNew: { th: "อัปโหลดรูปภาพ", en: "Upload a picture" },
  mediaColPicture: { th: "รูปภาพ", en: "Picture" },
  mediaColDescription: { th: "คำอธิบายภาพ", en: "Description" },
  mediaColAdded: { th: "เพิ่มเมื่อ", en: "Added" },
  mediaNeedsDescription: { th: "ยังไม่มีคำอธิบายภาพ", en: "Needs a description" },
  mediaShowMissing: { th: "แสดงเฉพาะรูปที่ยังไม่มีคำอธิบาย", en: "Show only pictures without a description" },
  mediaShowAll: { th: "แสดงรูปทั้งหมด", en: "Show all pictures" },
  mediaNoPreview: { th: "ไม่มีตัวอย่างรูป", en: "No preview" },
  mediaListEmpty: { th: "ยังไม่มีรูปภาพในคลัง", en: "There are no pictures in the library yet" },

  /* Picture library: upload and edit */
  mediaUploadIntro: {
    th: "เลือกไฟล์ แล้วอธิบายสิ่งที่เห็นในรูปทั้งสองภาษา เพื่อให้ผู้ที่มองไม่เห็นรูปเข้าใจได้",
    en: "Choose a file, then say what the picture shows in both languages, so people who cannot see it can follow",
  },
  mediaUploaded: { th: "อัปโหลดรูปแล้ว", en: "Picture uploaded" },
  mediaUploadedNote: { th: "เพิ่มคำบรรยายหรือเครดิตของรูปได้ด้านล่าง", en: "You can add a caption or credit below" },
  mediaSavedNote: { th: "คำอธิบายใหม่จะใช้ทุกที่ที่มีรูปนี้", en: "The new description is used wherever this picture appears" },
  mediaUploadAnother: { th: "อัปโหลดรูปอื่น", en: "Upload another picture" },
  mediaPreview: { th: "ตัวอย่างรูป", en: "Preview" },
  mediaFieldAlt: { th: "คำอธิบายภาพ", en: "Description of the picture" },
  mediaFieldAltHint: {
    th: "บอกว่าในรูปมีอะไร สำหรับผู้ที่มองไม่เห็นรูป ไม่ต้องขึ้นต้นว่า \"รูปของ\"",
    en: "Say what is in the picture, for people who cannot see it. There is no need to start with \"Picture of\"",
  },
  mediaFieldCaption: { th: "คำบรรยายหรือเครดิต", en: "Caption or credit" },
  mediaFieldCaptionHint: {
    th: "ไม่บังคับ เช่น ชื่อช่างภาพ ถ้าใส่ ให้ใส่ทั้งสองภาษา",
    en: "Optional, for example the photographer's name. If you add one, add it in both languages",
  },
  mediaDecorativeHint: {
    th: "ถ้าเลือก ระบบจะลบคำอธิบายภาพที่กรอกไว้",
    en: "If ticked, any description you typed is cleared",
  },

  /* Picture library: where it is used, and deleting */
  mediaUsedTitle: { th: "รูปนี้ถูกใช้ที่ไหนบ้าง", en: "Where this picture is used" },
  mediaUsedNone: { th: "รูปนี้ยังไม่ได้ใช้ที่ใด ลบได้", en: "This picture is not used anywhere, so it can be deleted" },
  mediaUsedBlockedTitle: { th: "ลบรูปนี้ไม่ได้", en: "This picture cannot be deleted" },
  mediaUsedBlocked: {
    th: "รูปนี้ยังถูกใช้อยู่ในรายการด้านล่าง ให้เอารูปออกจากรายการเหล่านั้นก่อน แล้วจึงกลับมาลบ",
    en: "This picture is still used in the items below. Take it out of them first, then come back to delete it",
  },
  mediaRoleCover: { th: "รูปปก", en: "Cover picture" },
  mediaRoleGallery: { th: "แกลเลอรีรูป", en: "Gallery" },
  mediaRolePhoto: { th: "รูปถ่าย", en: "Photo" },
  mediaRoleText: { th: "ในเนื้อหา", en: "In the text" },
  mediaDeletedFile: { th: "ลบรูปแล้ว", en: "Picture deleted" },

  /* Lost and found: list */
  lfIntro: {
    th: "รายการของหายและของเจอที่แสดงบนเว็บไซต์ รายงานที่นักศึกษาส่งเข้ามาจะอยู่ด้านบน และจะยังไม่แสดงต่อสาธารณะจนกว่าจะเผยแพร่",
    en: "The lost and found items shown on the website. Reports sent in by students are listed first and stay hidden until you publish them",
  },
  lfPendingTitle: { th: "รายงานที่รอตรวจสอบ", en: "Reports waiting for approval" },
  lfPendingNote: {
    th: "รายงานที่ส่งมาทางเว็บไซต์ ตรวจรายละเอียด เติมให้ครบสองภาษา แล้วเผยแพร่ หรือลบถ้าไม่ใช่รายการจริง",
    en: "Reports sent in through the website. Check the details, complete both languages, then publish, or delete the report if it is not genuine",
  },
  lfPendingNone: { th: "ไม่มีรายงานที่รอตรวจสอบ", en: "No reports are waiting" },
  lfAllTitle: { th: "รายการทั้งหมด", en: "All listings" },
  lfColReference: { th: "เลขอ้างอิง", en: "Reference" },
  lfColKind: { th: "ประเภท", en: "Type" },
  lfColItem: { th: "สิ่งของ", en: "Item" },
  lfColProgress: { th: "ความคืบหน้า", en: "Progress" },
  lfColReceived: { th: "ได้รับเมื่อ", en: "Received" },
  lfFromPublic: { th: "ส่งโดยนักศึกษา", en: "Sent in by a student" },
  lfListEmpty: { th: "ยังไม่มีรายการ", en: "There are no listings yet" },

  /* Lost and found: form */
  lfReportBannerTitle: { th: "รายงานนี้ส่งมาโดยนักศึกษา", en: "A student sent in this report" },
  lfReportBanner: {
    th: "รายงานนี้ยังไม่แสดงบนเว็บไซต์ นักศึกษามักเขียนมาเพียงภาษาเดียว ให้ตรวจรายละเอียด เติมอีกภาษา แล้วเผยแพร่",
    en: "This report is not on the website. Students usually write in one language only, so check the details, add the other language, then publish",
  },
  lfReference: { th: "เลขอ้างอิง: {reference}", en: "Reference: {reference}" },
  lfSectionPublic: { th: "ข้อมูลที่แสดงบนเว็บไซต์", en: "Shown on the website" },
  lfSectionPublicHint: {
    th: "ทุกช่องในส่วนนี้จะเห็นได้โดยทุกคนเมื่อเผยแพร่รายการ",
    en: "Everything in this section can be seen by anyone once the listing is published",
  },
  lfSectionPrivate: { th: "ข้อมูลส่วนตัว เห็นเฉพาะเจ้าหน้าที่", en: "Private: staff only" },
  lfSectionPrivateHint: {
    th: "ข้อมูลในส่วนนี้ไม่แสดงบนเว็บไซต์ และเห็นได้เฉพาะเจ้าหน้าที่ที่แก้ไขเนื้อหาได้ อย่าคัดลอกไปไว้ในช่องด้านบน",
    en: "This section is never shown on the website and only staff who can edit content can see it. Do not copy it into the fields above",
  },
  lfFieldKind: { th: "ประเภทรายการ", en: "Type of listing" },
  lfFieldDescription: { th: "รายละเอียดสิ่งของ", en: "Description of the item" },
  lfFieldDescriptionHint: {
    th: "บอกลักษณะที่ช่วยให้เจ้าของจำได้ อย่าใส่ข้อมูลที่มีแต่เจ้าของเท่านั้นที่รู้ ให้ใส่ในช่องข้อมูลส่วนตัวด้านล่าง",
    en: "Describe what helps the owner recognise it. Leave out anything only the owner would know; put that in the private section below",
  },
  lfFieldPlace: { th: "สถานที่", en: "Place" },
  lfFieldLocationNote: { th: "สถานที่โดยละเอียด", en: "Where it was lost or found" },
  lfFieldLocationNoteHint: {
    th: "แสดงเมื่อไม่ได้เลือกสถานที่จากรายการด้านบน",
    en: "Shown when no place is chosen from the list above",
  },
  lfFieldOccurredOn: { th: "วันที่ทำหายหรือพบ", en: "Date lost or found" },
  lfFieldProgress: { th: "ความคืบหน้า", en: "Progress" },
  lfFieldProgressHint: {
    th: "แสดงบนเว็บไซต์ ระบบไม่เปลี่ยนให้เอง ต้องเลือกด้วยตนเอง",
    en: "Shown on the website. It never changes by itself; you set it by hand",
  },
  lfFieldHeldAt: { th: "สถานที่เก็บของ", en: "Where the item is kept" },
  lfFieldHeldAtHint: {
    th: "เฉพาะของที่เจอ เช่น ห้องทำงาน อมธ. ชั้น 1",
    en: "Found items only, for example the TUSU office, first floor",
  },
  lfFieldClaimBy: { th: "รับคืนภายในวันที่", en: "Collect by" },
  lfFieldClaimByHint: { th: "เฉพาะของที่เจอ", en: "Found items only" },
  lfFieldClaimContact: { th: "ช่องทางติดต่อเพื่อรับคืน", en: "How to get in touch to claim it" },
  lfFieldClaimContactHint: {
    th: "เฉพาะของที่เจอ แสดงบนเว็บไซต์ ปล่อยว่างทั้งหมดถ้าไม่มี",
    en: "Found items only, and shown on the website. Leave all of it empty if there is none",
  },
  lfFieldPhotos: { th: "รูปถ่ายสิ่งของ", en: "Photos of the item" },
  lfFieldPhotosHint: {
    th: "อย่าให้เห็นข้อมูลที่ระบุตัวเจ้าของ เช่น ชื่อบนบัตร",
    en: "Do not show anything that identifies the owner, such as the name on a card",
  },
  lfFieldResolvedAt: { th: "วันที่ปิดเรื่อง", en: "Date closed" },
  lfFieldResolvedAtHint: {
    th: "ไม่บังคับ วันที่คืนของให้เจ้าของหรือสิ้นสุดระยะเวลารับคืน",
    en: "Optional. The date the item was returned or the claim period ended",
  },
  lfFieldSubmitterContact: { th: "ช่องทางติดต่อผู้แจ้ง", en: "Reporter's contact details" },
  lfFieldSubmitterContactHint: {
    th: "ใช้ติดต่อผู้ที่ส่งรายงานเข้ามา",
    en: "For getting in touch with the person who sent in the report",
  },
  lfFieldVerification: { th: "ข้อมูลสำหรับตรวจสอบผู้มารับ", en: "Detail for checking a claim" },
  lfFieldVerificationHint: {
    th: "สิ่งที่มีแต่เจ้าของตัวจริงที่รู้ ใช้ถามเมื่อมีผู้มาขอรับของ",
    en: "Something only the true owner would know, to ask when someone comes to claim the item",
  },
  lfPlaceNone: { th: "ไม่ได้เลือกสถานที่", en: "No place chosen" },
  lfErrLocation: {
    th: "เลือกสถานที่ หรือกรอกสถานที่โดยละเอียด",
    en: "Choose a place, or say where it was lost or found",
  },
  lfErrClaimIncomplete: {
    th: "กรอกช่องทางติดต่อให้ครบ: ชื่อช่องทางทั้งสองภาษา ประเภท และรายละเอียด",
    en: "Fill in the whole contact: its name in both languages, its type and its details",
  },
} as const satisfies Record<string, LocaleString>;
