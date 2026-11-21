import { editableStrings } from "@/lib/i18n/editable";

export const COMPLAINTS_PRIVACY_TEXT = editableStrings(
  "page-complaints-privacy",
  {
    title: {
      th: "ประกาศความเป็นส่วนตัวของบริการข้อร้องเรียน",
      en: "Privacy notice for complaints",
    },
    intro: {
      th: "บริการข้อร้องเรียนดำเนินการร่วมกันโดย อมธ. และ สภานักศึกษา ท่าพระจันทร์ หน้านี้บอกว่าเราเก็บข้อมูลอะไร เพราะอะไร ใครเห็นได้ และเก็บนานเท่าใด",
      en: "Complaints are handled jointly by TUSU and TUSC at Tha Prachan. This page says what we collect, why, who can see it and how long we keep it",
    },
    whatHeading: {
      th: "ข้อมูลที่เราเก็บและเหตุผล",
      en: "What we collect and why",
    },
    what1What: {
      th: "ข้อความที่คุณเขียน: เกิดอะไรขึ้น เมื่อไรและที่ไหน และสิ่งที่คุณอยากให้แก้ไข",
      en: "What you write: what happened, when and where, and what would put it right",
    },
    what1Why: {
      th: "เพื่อให้เจ้าหน้าที่เข้าใจและดำเนินการกับเรื่องของคุณ ข้อความอาจมีข้อมูลส่วนตัวของคุณหรือของผู้อื่น เราจึงเข้ารหัสทั้งหมด และเจ้าหน้าที่เปิดอ่านได้เมื่อกด “แสดง” เท่านั้น ซึ่งมีบันทึกไว้ทุกครั้ง",
      en: "So staff can understand and act on your complaint. It may contain personal details about you or other people, so all of it is encrypted, and staff can read it only by choosing Show, which is logged every time",
    },
    what2What: {
      th: "ไฟล์หลักฐานที่คุณแนบ (ไม่บังคับ)",
      en: "Evidence files you attach (optional)",
    },
    what2Why: {
      th: "เพื่อประกอบการพิจารณา เก็บเป็นไฟล์ส่วนตัวที่ไม่มีลิงก์สาธารณะ ชื่อไฟล์เข้ารหัสไว้ เจ้าหน้าที่เปิดดูได้ผ่านลิงก์ชั่วคราวเมื่อกด “แสดง” ซึ่งมีบันทึกไว้",
      en: "To help look into the complaint. Files are private, with no public link, and their names are encrypted. Staff open them through a short-lived link when they choose Show, which is logged",
    },
    what3What: {
      th: "ชื่อ อีเมล เบอร์โทรศัพท์ หรือไอดีไลน์ (เฉพาะเมื่อคุณเลือกให้ข้อมูล)",
      en: "Your name, email address, phone number or LINE ID (only if you choose to give them)",
    },
    what3Why: {
      th: "เพื่อแจ้งความคืบหน้าและถามข้อมูลเพิ่ม เข้ารหัสไว้ หากคุณไม่ระบุตัวตน เราไม่เก็บข้อมูลเหล่านี้เลย หากคุณเลือกไม่เปิดเผยชื่อ ชื่อของคุณจะเห็นเฉพาะเจ้าหน้าที่ดำเนินการข้อร้องเรียนและผู้ดูแลระบบเมื่อจำเป็น",
      en: "So we can tell you how it is going and ask for more. Encrypted. If you stay anonymous we hold none of these. If you keep your name back, only complaints officers and administrators can see it, if it is needed",
    },
    what4What: {
      th: "การยินยอมให้ติดต่อ",
      en: "Your agreement to be contacted",
    },
    what4Why: {
      th: "เพื่อบันทึกว่าคุณอนุญาตให้ติดต่อ และเมื่อใด",
      en: "To record that you said we may contact you, and when",
    },
    what5What: {
      th: "คะแนนความพึงพอใจ และความเห็น (ไม่บังคับ) หลังเราแจ้งผลการดำเนินการ",
      en: "Your satisfaction score, and a comment (optional), after an outcome",
    },
    what5Why: {
      th: "เพื่อปรับปรุงบริการ ความเห็นเข้ารหัสไว้ คะแนนไม่มีข้อมูลส่วนตัวและเราเก็บไว้เพื่อรายงานผลการดำเนินงาน",
      en: "To improve the service. The comment is encrypted. The score holds no personal data and is kept for performance reporting",
    },
    what6What: {
      th: "ที่อยู่ไอพีและชนิดของเบราว์เซอร์",
      en: "Your IP address and browser type",
    },
    what6Why: {
      th: "เพื่อความปลอดภัย จำกัดการใช้งานเกินปกติ และตรวจสอบย้อนหลังว่าใครทำอะไรกับเรื่องนี้ บันทึกไว้ในบันทึกตรวจสอบ ไม่ใช้ติดตามตัวคุณ แม้จะไม่ระบุตัวตน",
      en: "For security, to limit abuse, and to keep a record of who did what on a complaint. They are kept in the audit log and are not used to track you, even if you stay anonymous",
    },
    whoHeading: {
      th: "ใครเห็นข้อมูลของคุณ",
      en: "Who can see your data",
    },
    who1: {
      th: "เจ้าหน้าที่ อมธ. และ สภานักศึกษา ที่ทำงานข้อร้องเรียนเท่านั้น ทั้งสองหน่วยงานใช้คิวเดียวกัน และระบบบันทึกว่าหน่วยงานใดดำเนินการ ทุกครั้งที่เปิดดูข้อความ ไฟล์ หรือข้อมูลติดต่อของคุณจะมีบันทึกไว้",
      en: "Only TUSU and TUSC staff who handle complaints. Both bodies share one queue, and each action records which one acted. Every time someone opens your text, files or contact details, it is logged",
    },
    who2: {
      th: "เรื่องในหัวข้ออ่อนไหว เช่น การคุกคามหรือการเลือกปฏิบัติ และความปลอดภัย เจ้าหน้าที่ที่ได้รับมอบหมายตามชื่อเท่านั้นที่เห็นได้ แม้แต่ผู้ดูแลระบบก็ไม่เห็นหากไม่ได้อยู่ในรายชื่อ",
      en: "Complaints in sensitive categories, such as harassment or discrimination, and safety, are visible only to named members of staff. Even an administrator cannot see them unless named",
    },
    who3: {
      th: "หน้าเว็บไซต์สาธารณะไม่แสดงข้อร้องเรียนใดเลย",
      en: "The public website never shows a complaint",
    },
    who4: {
      th: "ถ้าคุณขอให้ส่งลิงก์ส่วนตัวทางอีเมล หรือเจ้าหน้าที่แจ้งความคืบหน้าทางอีเมล ผู้ให้บริการส่งอีเมลของเราจะได้รับที่อยู่อีเมลของคุณเพื่อส่งข้อความนั้นเท่านั้น อีเมลจะไม่มีข้อความร้องเรียนของคุณ",
      en: "If you ask us to email your private link, or staff email you about progress, our email provider receives your email address for those messages only. The emails never contain what you wrote",
    },
    who5: {
      th: "เราไม่ขายหรือแบ่งปันข้อมูลของคุณให้ผู้อื่นเพื่อการตลาด",
      en: "We do not sell your data or share it for marketing",
    },
    anonHeading: {
      th: "ถ้าคุณไม่ระบุตัวตน",
      en: "If you stay anonymous",
    },
    anon: {
      th: "เราไม่เก็บชื่อหรือช่องทางติดต่อของคุณ เราจึงติดต่อคุณไม่ได้ และกู้ลิงก์ที่หายให้ไม่ได้ คุณติดตามเรื่องได้ด้วยลิงก์ส่วนตัวที่แสดงให้ครั้งเดียวเท่านั้น โปรดเก็บลิงก์ไว้",
      en: "We hold no name or way to reach you, so we cannot contact you and cannot recover a lost link. You follow the complaint only with the private link we show once. Please keep it",
    },
    cookiesHeading: {
      th: "คุกกี้ที่จำเป็น",
      en: "Essential cookies",
    },
    cookies1Purpose: {
      th: "รหัสสุ่มที่ช่วยให้เราจำคำตอบที่คุณกรอกไว้ระหว่างหน้า โดยเก็บคำตอบเข้ารหัสไว้บนเซิร์ฟเวอร์ ไม่ใส่ข้อมูลส่วนตัวไว้ในที่อยู่เว็บหรือในคุกกี้",
      en: "A random code that lets us keep your answers between pages. The answers stay encrypted on our server. No personal data goes in the web address or the cookie",
    },
    cookies1Duration: {
      th: "2 ชั่วโมง",
      en: "2 hours",
    },
    cookies2Purpose: {
      th: "จำเลขอ้างอิงและรหัสลิงก์ส่วนตัวของเรื่องที่คุณเปิดดู เพื่อไม่ต้องเก็บรหัสไว้ในที่อยู่เว็บ",
      en: "Remembers the reference and private link code of the complaint you opened, so the code does not stay in the web address",
    },
    cookies2Duration: {
      th: "1 ชั่วโมง",
      en: "1 hour",
    },
    cookiesNote: {
      th: "คุกกี้ทั้งสองจำเป็นต่อการทำงานของบริการ ไม่ใช้ติดตามหรือโฆษณา จึงไม่ต้องขอความยินยอมแยกต่างหาก",
      en: "Both are needed for the service to work. They are not used for tracking or advertising, so no separate consent is needed",
    },
    keepHeading: {
      th: "เก็บนานเท่าใด",
      en: "How long we keep it",
    },
    keep1: {
      th: "คำตอบและไฟล์ที่ยังไม่ได้ส่ง: ลบเมื่อพ้น 2 ชั่วโมงนับจากการบันทึกครั้งล่าสุด",
      en: "Answers and files you have not sent: deleted 2 hours after you last saved them",
    },
    keep2: {
      th: "หน้ายืนยันที่แสดงลิงก์ส่วนตัว: เก็บไว้ 30 นาทีเท่านั้น แล้วลบ เราแสดงลิงก์นี้ซ้ำภายหลังไม่ได้",
      en: "The confirmation page that shows your private link: kept for 30 minutes only, then deleted. We cannot show the link again later",
    },
    keep3: {
      th: "ข้อมูลส่วนบุคคลในเรื่องที่แจ้ง: ลบหลังเรื่องปิดครบ 1 ปี เรื่องที่แจ้งผลแล้วจะปิดโดยอัตโนมัติเมื่อพ้น {days} วัน หากคุณเปิดเรื่องอีกครั้ง การนับเวลาจะหยุดไว้",
      en: "Personal data in a complaint: deleted one year after it closes. A resolved complaint closes by itself after {days} days; if you reopen it the clock stops",
    },
    keep4: {
      th: "หลังลบแล้ว เรายังเก็บเพียงประวัติสถานะของเรื่อง วันที่ตามเป้าหมาย หัวข้อ และคะแนนความพึงพอใจ โดยไม่มีข้อมูลส่วนบุคคล",
      en: "After deletion we keep only the complaint's status history, target dates, category and satisfaction score, with no personal data",
    },
    rightsHeading: {
      th: "สิทธิ์ของคุณ",
      en: "Your rights",
    },
    rights: {
      th: "คุณขอดู แก้ไข หรือลบข้อมูลของคุณได้ หรือถอนความยินยอมได้ทุกเมื่อ ติดต่อเจ้าหน้าที่ตามช่องทางด้านล่างของหน้านี้ และแจ้งเลขอ้างอิง คุณถอนข้อร้องเรียนด้วยตนเองได้ในหน้าติดตามเรื่อง",
      en: "You can ask to see, correct or delete your data, or withdraw your consent, at any time. Contact the desk using the details at the bottom of this page and quote your reference number. You can withdraw a complaint yourself on the tracking page",
    },
    contactHeading: {
      th: "ใครเป็นผู้ดูแลข้อมูล",
      en: "Who is responsible",
    },
    contact: {
      th: "อมธ. และ สภานักศึกษา ท่าพระจันทร์ เป็นผู้ควบคุมข้อมูลร่วมกันและเป็นผู้ติดต่อด้านการคุ้มครองข้อมูลร่วมกัน ช่องทางติดต่ออยู่ด้านล่างของทุกหน้า",
      en: "TUSU and TUSC at Tha Prachan are joint controllers and the joint data protection contact. Their contact details are at the bottom of every page",
    },
  },
  { th: "หน้าความเป็นส่วนตัวของการร้องเรียน", en: "Complaints privacy page" },
);
