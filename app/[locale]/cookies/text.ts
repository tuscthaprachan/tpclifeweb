import { editableStrings } from "@/lib/i18n/editable";

export const COOKIES_TEXT = editableStrings(
  "page-cookies",
  {
    intro: {
      th: "หน้านี้บอกว่า {nameTh} เก็บข้อมูลอะไรไว้ในเบราว์เซอร์ของคุณ และเก็บไปเพื่ออะไร เว็บไซต์นี้ไม่มีคุกกี้โฆษณาและไม่ติดตามคุณข้ามเว็บไซต์อื่น",
      en: "This page lists what {nameEn} stores in your browser, and why. There are no advertising cookies and no cross-site tracking.",
    },
    whatHeading: {
      th: "สิ่งที่จัดเก็บ",
      en: "What is stored",
    },
    tableHeadersName: {
      th: "ชื่อ",
      en: "Name",
    },
    tableHeadersPurpose: {
      th: "วัตถุประสงค์",
      en: "Purpose",
    },
    tableHeadersDuration: {
      th: "ระยะเวลาเก็บ",
      en: "Duration",
    },
    localeCookieRowPurpose: {
      th: "จำว่าคุณเลือกอ่านเป็นภาษาไทยหรือภาษาอังกฤษ เพื่อให้เปิดเว็บไซต์ในภาษานั้นทุกครั้งที่กลับมา",
      en: "Remembers whether you chose Thai or English, so the language toggle keeps you on the same page in your chosen language and you are not asked again on your next visit.",
    },
    localeCookieRowDuration: {
      th: "1 ปี",
      en: "1 year",
    },
    themeCookieRowPurpose: {
      th: "จำว่าคุณเลือกธีมสว่างหรือมืด ถ้าเลือก “ตามระบบ” จะไม่มีคุกกี้นี้",
      en: "Remembers whether you chose the light or dark theme. If you choose System, this cookie is not set.",
    },
    themeCookieRowDuration: {
      th: "1 ปี",
      en: "1 year",
    },
    jsCookieRowPurpose: {
      th: "บอกเว็บไซต์ว่าเบราว์เซอร์ของคุณเปิดใช้ JavaScript เพื่อให้หน้าที่มีตัวกรองหรือการค้นหาเปิดจากสำเนาที่เก็บไว้ล่วงหน้าได้เร็วขึ้น คุกกี้เก็บเพียงค่า 1",
      en: "Tells the site your browser runs JavaScript, so pages with filters or a search open from the ready-made copy and load faster. It holds only the value 1.",
    },
    jsCookieRowDuration: {
      th: "จนกว่าจะปิดเบราว์เซอร์",
      en: "Until you close your browser",
    },
    lfJourneyRowPurpose: {
      th: "จำว่าคุณกำลังกรอกเรื่องใดอยู่ในบริการแจ้งของหาย ร้องเรียน หรือยืมอุปกรณ์ เพื่อให้กรอกต่อทีละหน้าได้ คุกกี้เก็บเพียงรหัสสุ่ม ส่วนคำตอบเก็บไว้ที่เซิร์ฟเวอร์ในรูปแบบเข้ารหัส",
      en: "Remembers the lost and found, complaint or borrowing form you are filling in, so you can move between its pages. It holds only a random code. Your answers are kept encrypted on our server.",
    },
    lfJourneyRowDuration: {
      th: "2 ชั่วโมง",
      en: "2 hours",
    },
    lfTrackRowPurpose: {
      th: "จำลิงก์ติดตามส่วนตัวของคุณหลังเปิดลิงก์ เพื่อให้ดูสถานะเรื่องได้โดยไม่ต้องให้ลิงก์ค้างอยู่ในแถบที่อยู่",
      en: "Remembers your private tracking link after you open it, so you can see the progress of your case without the link staying in the address bar.",
    },
    lfTrackRowDuration: {
      th: "1 ชั่วโมง",
      en: "1 hour",
    },
    necessaryHeading: {
      th: "เหตุใดจึงไม่มีแบนเนอร์ขอความยินยอม",
      en: "Why there is no consent banner",
    },
    necessaryBody: {
      th: "คุกกี้ทั้งหมดข้างต้นจำเป็นต่อการทำงานพื้นฐานของเว็บไซต์ กฎหมายคุ้มครองข้อมูลส่วนบุคคลไม่ได้กำหนดให้ขอความยินยอมสำหรับคุกกี้ประเภทนี้ เว็บไซต์จึงไม่แสดงแบนเนอร์ขอความยินยอม",
      en: "The cookies above are strictly necessary for the site's basic operation. Data protection law does not require consent for this category of cookie, so this site does not show a cookie consent banner.",
    },
    analyticsHeading: {
      th: "การวิเคราะห์การใช้งาน",
      en: "Analytics",
    },
    analyticsBody: {
      th: "เว็บไซต์นี้ไม่ใช้เครื่องมือวิเคราะห์การใช้งานหรือเครื่องมือติดตามใด ๆ ไม่นับผู้เข้าชม ไม่สร้างรหัสที่ใช้ติดตามคุณข้ามการเข้าชมหรือข้ามเว็บไซต์ และไม่นำข้อมูลการใช้งานไปใช้โฆษณา",
      en: "This site does not use analytics or tracking tools. It does not count visitors, does not create an identifier that tracks you across visits or across other sites, and never uses your usage data for advertising.",
    },
    noAdsHeading: {
      th: "คุกกี้และการติดตามที่ไม่ใช้",
      en: "Cookies and tracking not used",
    },
    noAdsBody: {
      th: "เว็บไซต์นี้ไม่มีคุกกี้โฆษณา ไม่มีคุกกี้ติดตามเพื่อการตลาดจากบุคคลที่สาม และไม่ขายหรือแบ่งปันข้อมูลการใช้งานของคุณให้ใคร",
      en: "No advertising cookies, no third-party marketing trackers, and your usage data is never sold or shared with anyone outside this service.",
    },
    controlHeading: {
      th: "วิธีลบคุกกี้",
      en: "Deleting cookies",
    },
    controlBody: {
      th: "คุณลบคุกกี้เหล่านี้ได้ทุกเมื่อในการตั้งค่าเบราว์เซอร์ การลบไม่กระทบส่วนอื่นของเว็บไซต์ ครั้งถัดไปเว็บไซต์จะเลือกภาษาให้ตามภาษาของเบราว์เซอร์ และใช้ธีมตามระบบ",
      en: "You can delete these cookies at any time in your browser settings. Nothing else on the site is affected. On your next visit the site picks a language from your browser's language setting and follows your system theme.",
    },
    eatStorageHeading: {
      th: "ข้อมูลที่เก็บไว้ในเครื่องจาก \"กินอะไรดี\"",
      en: "Data kept on your device by What to eat",
    },
    eatStorageBody: {
      th: "ส่วน \"กินอะไรดี\" เก็บข้อมูลส่วนตัวไว้ในที่เก็บข้อมูลของเบราว์เซอร์ (localStorage) เท่านั้น โดยใช้ชื่อที่ขึ้นต้นด้วย trytpc.eat.v1. ได้แก่ เมนูโปรด เมนูที่ไม่เอา ประวัติที่คุณกด \"กินมื้อนี้\" พร้อมราคา ณ ตอนที่กด ตัวกรองที่ตั้งไว้ และแผนสัปดาห์ที่บันทึกไว้ ข้อมูลเหล่านี้ไม่ถูกส่งไปที่ใดและไม่มีบัญชีผู้ใช้ คุณลบได้ทุกเมื่อด้วยปุ่ม \"ล้างทุกอย่าง\" ในหน้า \"ของฉัน\" (/eat/mine) หรือล้างข้อมูลเว็บไซต์ในเบราว์เซอร์",
      en: "The What to eat section keeps personal data only in your browser's own storage (localStorage), under names that start with trytpc.eat.v1. That is your favourites, dishes you never want suggested, what you tapped \"I'll eat this\" for with the price at that moment, your saved filters and a saved week plan. None of it is sent anywhere and there is no account. Clear it any time with the \"Clear everything\" button on Your stuff (/eat/mine), or by clearing this site's data in your browser.",
    },
  },
  { th: "หน้าคุกกี้", en: "Cookies page" },
);
