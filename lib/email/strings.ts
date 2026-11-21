import { editableStrings, fillText } from "@/lib/i18n/editable";

type Values = Record<string, string | number>;

/** "<thai> / <english>": a subject line with both languages, each text filled in its own language. */
export function bothLanguages(entry: { th: string; en: string }, th: Values, en: Values = th): string {
  return `${fillText(entry.th, th)} / ${fillText(entry.en, en)}`;
}

/** The frame around every email: language names, the link hint, the wordmark and the footer. */
export const EMAIL_LAYOUT_TEXT = editableStrings(
  "email-layout",
  {
    langName: { th: "ภาษาไทย", en: "English" },
    copyLink: { th: "หากปุ่มใช้ไม่ได้ ให้คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์", en: "If the button does not work, copy this link into your browser:" },
    wordmarkEn: { th: "#trytpc", en: "#trytpc" },
    wordmarkTh: { th: "#ท้ายท่าพระจันทร์", en: "#ท้ายท่าพระจันทร์" },
    footerTh: { th: "อีเมลฉบับนี้ส่งโดยอัตโนมัติจาก #ท้ายท่าพระจันทร์", en: "อีเมลฉบับนี้ส่งโดยอัตโนมัติจาก #ท้ายท่าพระจันทร์" },
    footerEn: { th: "An automated email from #trytpc.", en: "An automated email from #trytpc." },
  },
  { th: "อีเมล: กรอบและท้ายอีเมล", en: "Emails: frame and footer" },
);

/** Staff invitation and account recovery emails, and the private tracking link emails. */
export const EMAIL_ACCOUNT_TEXT = editableStrings(
  "email-account",
  {
    inviteSubject: { th: "คำเชิญเข้าร่วมทีมเจ้าหน้าที่ {organisation}", en: "You have been invited to join {organisation} staff" },
    inviteHeading: { th: "คำเชิญเข้าร่วมทีมเจ้าหน้าที่", en: "You have been invited to join the staff team" },
    inviteIntro: {
      th: "{inviter} เชิญคุณเข้าร่วมเป็นเจ้าหน้าที่ของ{organisation} บน{service}",
      en: "{inviter} has invited you to join {organisation} staff on {service}.",
    },
    inviteHow: {
      th: "เปิดลิงก์ด้านล่าง กรอกชื่อ และสร้างบัญชีด้วยพาสคีย์ (ลายนิ้วมือ ใบหน้า หรือการล็อกหน้าจอ) ไม่ต้องใช้รหัสผ่าน",
      en: "Open the link below, enter your name and create your account with a passkey (your fingerprint, face or screen lock). You do not need a password.",
    },
    inviteLink: { th: "ลิงก์รับคำเชิญ", en: "Link to accept the invitation" },
    inviteExpiresDay: { th: "ลิงก์นี้ใช้ได้ {n} วัน", en: "This link expires in {n} day." },
    inviteExpiresDays: { th: "ลิงก์นี้ใช้ได้ {n} วัน", en: "This link expires in {n} days." },
    inviteNoForward: { th: "โปรดอย่าส่งต่อลิงก์นี้ให้ผู้อื่น", en: "Do not forward this link. Anyone who opens it can create the account." },
    inviteIgnore: {
      th: "หากไม่รู้จักผู้เชิญ หรือไม่ได้รอคำเชิญนี้อยู่ ไม่ต้องทำอะไร ข้ามอีเมลฉบับนี้ไปได้เลย",
      en: "If you do not know who invited you, or were not expecting this, ignore this email. You do not need to do anything.",
    },
    recoverySubject: { th: "ลิงก์กู้คืนบัญชี {service}", en: "Your {service} account recovery link" },
    recoveryHeading: { th: "ลิงก์กู้คืนบัญชีเจ้าหน้าที่", en: "Your staff account recovery link" },
    recoveryIntro: {
      th: "ผู้ดูแลระบบของ{organisation}สร้างลิงก์นี้ให้ เพื่อให้เข้าสู่ระบบ{service}ได้อีกครั้งหลังพาสคีย์เดิมหายหรือใช้ไม่ได้",
      en: "An administrator at {organisation} made this link for you, so you can sign in to {service} again after losing your passkey.",
    },
    recoveryHow: {
      th: "เปิดลิงก์ด้านล่างเพื่อสร้างพาสคีย์ใหม่ เมื่อใช้ลิงก์แล้ว บัญชีจะออกจากระบบในอุปกรณ์อื่นทั้งหมด",
      en: "Open the link below to create a new passkey. Once you use it, we sign you out everywhere else.",
    },
    recoveryLink: { th: "ลิงก์กู้คืนบัญชี", en: "Account recovery link" },
    recoveryExpiresHour: { th: "ลิงก์นี้ใช้ได้ {n} ชั่วโมง และใช้ได้เพียงครั้งเดียว", en: "This link expires in {n} hour and works once." },
    recoveryExpiresHours: { th: "ลิงก์นี้ใช้ได้ {n} ชั่วโมง และใช้ได้เพียงครั้งเดียว", en: "This link expires in {n} hours and works once." },
    recoveryNoForward: { th: "โปรดอย่าส่งต่อลิงก์นี้ให้ผู้อื่น", en: "Do not forward this link. Anyone who opens it can take over the account." },
    recoveryIgnore: {
      th: "หากไม่ได้ขอกู้คืนบัญชี โปรดอย่าเปิดลิงก์ และแจ้งผู้ดูแลระบบ",
      en: "If you did not ask for your account to be recovered, do not open the link, and tell an administrator.",
    },
    borrowTrackHeading: { th: "ลิงก์ส่วนตัวสำหรับติดตามคำขอยืมอุปกรณ์", en: "Your private link to track your equipment request" },
    borrowTrackReference: { th: "เลขอ้างอิงคือ {reference}", en: "Your reference number is {reference}." },
    borrowTrackLine: {
      th: "ใช้ลิงก์ด้านล่างเพื่อดูสถานะ ยกเลิกคำขอก่อนรับอุปกรณ์ หรือดูวันเวลานัดรับ ใครมีลิงก์นี้ก็ดูคำขอนี้ได้ จึงไม่ควรส่งต่อให้ผู้อื่น",
      en: "Use the link below to see the status, cancel the request before you collect, or check your collection time. Anyone with the link can see this request, so do not share it.",
    },
    borrowTrackLinkLabel: { th: "ลิงก์ส่วนตัวของคุณ", en: "Your private link" },
    borrowTrackAfter: { th: "หากคุณไม่ได้ส่งคำขอนี้ ข้ามอีเมลฉบับนี้ไปได้เลย", en: "If you did not send this request, ignore this email." },
    lfClaimHeading: { th: "ลิงก์ส่วนตัวสำหรับติดตามคำขอรับของ", en: "Your private link to track your claim" },
    lfReportHeading: { th: "ลิงก์ส่วนตัวสำหรับติดตามเรื่องที่คุณแจ้ง", en: "Your private link to track your report" },
    lfLine: {
      th: "ใช้ลิงก์ด้านล่างเพื่อดูความคืบหน้า ใครมีลิงก์นี้ก็ดูความคืบหน้าได้ จึงไม่ควรส่งต่อให้ผู้อื่น",
      en: "Use the link below to see progress. Anyone with the link can see how this case is going, so do not share it.",
    },
    lfReferenceLabel: { th: "เลขอ้างอิงของคุณ", en: "Your reference number" },
    lfLinkLabel: { th: "เปิดหน้าติดตามเรื่อง", en: "Open your tracking page" },
    lfAfter: { th: "หากไม่ได้ส่งเรื่องนี้ ข้ามอีเมลฉบับนี้ไปได้เลย", en: "If you did not send this, ignore this email." },
    lfClaimSubject: { th: "ติดตามคำขอรับของ {reference}", en: "Track your claim {reference}" },
    lfReportSubject: { th: "ติดตามเรื่องที่คุณแจ้ง {reference}", en: "Track your report {reference}" },
    cpHeading: { th: "ลิงก์ส่วนตัวสำหรับติดตามข้อร้องเรียนของคุณ", en: "Your private link to track your complaint" },
    cpReference: { th: "เลขอ้างอิงคือ {reference}", en: "Your reference number is {reference}." },
    cpLine: {
      th: "ใช้ลิงก์ด้านล่างเพื่อดูความคืบหน้า ใครมีลิงก์นี้ก็ดูเรื่องนี้ได้ จึงไม่ควรส่งต่อให้ผู้อื่น",
      en: "Use the link below to see progress. Anyone with the link can see this complaint, so do not share it.",
    },
    cpLinkLabel: { th: "ลิงก์ส่วนตัว", en: "Your private link" },
    cpAfter: { th: "หากคุณไม่ได้เป็นผู้ส่งข้อร้องเรียนนี้ ไม่ต้องดำเนินการใดกับอีเมลฉบับนี้", en: "If you did not send this, ignore this email." },
    cpSubject: { th: "ลิงก์ติดตามข้อร้องเรียน {reference}", en: "Your private link for complaint {reference}" },
  },
  { th: "อีเมล: คำเชิญ กู้คืนบัญชี และลิงก์ติดตามเรื่อง", en: "Emails: invitations, recovery and tracking links" },
);

/** Emails about a complaint, sent to the person who made it, and the escalation notice to staff. */
export const EMAIL_COMPLAINT_TEXT = editableStrings(
  "email-complaints",
  {
    refLabel: { th: "เลขอ้างอิง", en: "Your reference" },
    privateLink: { th: "ใครมีลิงก์ส่วนตัวก็ดูเรื่องนี้ได้ จึงไม่ควรส่งต่อให้ผู้อื่น", en: "Anyone with the private link can see this complaint, so do not share it." },
    ackSubject: { th: "เจ้าหน้าที่รับข้อร้องเรียนของคุณแล้ว {reference}", en: "We have acknowledged your complaint {reference}" },
    ackHeading: { th: "เจ้าหน้าที่รับข้อร้องเรียนของคุณแล้ว", en: "We have acknowledged your complaint" },
    ackIntro: { th: "เจ้าหน้าที่ของ{service}ได้รับข้อร้องเรียนแล้วและกำลังดำเนินการ", en: "Staff at {service} have received your complaint and are looking after it." },
    ackHow: {
      th: "ดูความคืบหน้าและวันที่คาดว่าจะแจ้งผลได้จากลิงก์ส่วนตัวที่คุณได้รับตอนส่งเรื่อง",
      en: "You can see how it is going, and the date we aim to give you an answer, from the private link you were given when you sent it.",
    },
    resolvedSubject: { th: "เจ้าหน้าที่แจ้งผลข้อร้องเรียนของคุณแล้ว {reference}", en: "There is an outcome to your complaint {reference}" },
    resolvedHeading: { th: "เจ้าหน้าที่แจ้งผลข้อร้องเรียนของคุณแล้ว", en: "There is an outcome to your complaint" },
    resolvedRead: {
      th: "เปิดลิงก์ส่วนตัวเพื่ออ่านผลที่เจ้าหน้าที่แจ้ง และบอกเราว่าพอใจกับการดำเนินการหรือไม่",
      en: "Open your private link to read the outcome staff have written, and tell us how we did.",
    },
    resolvedReopen: {
      th: "หากเห็นว่าเรื่องยังไม่จบ ขอเปิดเรื่องอีกครั้งได้ภายใน {days} วัน จากหน้าเดียวกัน",
      en: "If you think it is not finished, you can ask us to reopen it within {days} days, from the same page.",
    },
    redirectSubject: { th: "ข้อร้องเรียนของคุณไม่อยู่ในความรับผิดชอบของเรา {reference}", en: "Your complaint is outside our remit {reference}" },
    redirectHeading: { th: "เรื่องนี้ต้องติดต่อหน่วยงานอื่น", en: "Your issue needs someone else" },
    redirectIntro: {
      th: "เจ้าหน้าที่ของ{service}อ่านข้อร้องเรียนของคุณแล้ว พบว่าไม่อยู่ในความรับผิดชอบของเรา จึงขอปิดเรื่อง",
      en: "Staff at {service} have read your complaint and found it is outside our remit, so we have closed it.",
    },
    redirectAfter: {
      th: "ดูข้อมูลนี้อีกครั้งได้จากลิงก์ส่วนตัวที่คุณได้รับตอนส่งเรื่อง ใครมีลิงก์ก็ดูเรื่องนี้ได้ จึงไม่ควรส่งต่อให้ผู้อื่น",
      en: "You can see this again from the private link you were given when you sent it. Anyone with the link can see this complaint, so do not share it.",
    },
    courseMatter: {
      th: "เรื่องนี้เกี่ยวกับรายวิชา ซึ่งผู้สอนมีอำนาจตัดสิน กรุณาปรึกษาผู้สอนก่อน",
      en: "This is a matter for your course. The lecturer has the final say, so please raise it with them first.",
    },
    courseContact: { th: "หากปรึกษาผู้สอนไม่ได้ ให้ติดต่อสำนักงานคณะ", en: "If you cannot raise it with the lecturer, contact your faculty office." },
    facultyMatter: {
      th: "เรื่องนี้เป็นเรื่องภายในคณะ ซึ่งไม่อยู่ในอำนาจหน้าที่ขององค์การนักศึกษาและสภานักศึกษา กรุณาติดต่อหน่วยงานต่อไปนี้",
      en: "This is a matter for your faculty, which is outside what the Student Union and Student Council can act on. Please contact the people below.",
    },
    programme: { th: "(หลักสูตร: {programme})", en: "(programme: {programme})" },
    facultyOffice: { th: "สำนักงานคณะ", en: "Faculty office" },
    noOfficeDetails: {
      th: "เรายังไม่มีข้อมูลติดต่อสำนักงานนี้ ลองสอบถามที่คณะหรือค้นหาในเว็บไซต์ของคณะ",
      en: "We do not have this office's contact details yet. Ask at the faculty, or look on its website.",
    },
    askFaculty: { th: "สอบถามรายละเอียดได้ที่คณะ", en: "Please ask at your faculty for the details." },
    officeWhere: { th: "ที่ตั้ง", en: "Where" },
    officePhone: { th: "โทรศัพท์", en: "Phone" },
    officeEmail: { th: "อีเมล", en: "Email" },
    officeWeb: { th: "เว็บไซต์", en: "Website" },
    escSubject: { th: "มีข้อร้องเรียนเกินกำหนด {count} เรื่อง", en: "{count} complaints past target" },
    escSubjectOne: { th: "มีข้อร้องเรียนเกินกำหนด {count} เรื่อง", en: "{count} complaint past target" },
    escNotAcknowledged: { th: "รับเรื่องไม่ทันกำหนด", en: "not acknowledged in time" },
    escNotResolved: { th: "แก้ไขไม่ทันกำหนด", en: "not resolved in time" },
    escTitle: { th: "มีข้อร้องเรียนเกินกำหนด", en: "Complaints past their target" },
    escIntro: {
      th: "ข้อร้องเรียนต่อไปนี้ยังไม่มีผู้รับเรื่องหรือยังแก้ไขไม่เสร็จภายในเวลาที่กำหนด เปิดคิวเรื่องเพื่อดูรายละเอียด",
      en: "These complaints have not been acknowledged or resolved within their target. Open the queue to see them.",
    },
    escLink: { th: "เปิดคิวเรื่อง", en: "Open the queue" },
    closedSubject: { th: "ปิดข้อร้องเรียนของคุณแล้ว {reference}", en: "Your complaint is closed {reference}" },
    closedHeading: { th: "ปิดข้อร้องเรียนของคุณแล้ว", en: "Your complaint is closed" },
    closedIntro: {
      th: "เจ้าหน้าที่ของ{service}ปิดข้อร้องเรียนนี้แล้ว ดูผลที่เจ้าหน้าที่แจ้งได้จากลิงก์ส่วนตัวที่คุณได้รับตอนส่งเรื่อง",
      en: "Staff at {service} have closed this complaint. You can read the outcome on the private link you were given when you sent it.",
    },
    closedSurvey: {
      th: "หากยังไม่ได้บอกเราว่าพอใจกับการดำเนินการหรือไม่ ทำแบบสอบถามสั้น ๆ ได้จากหน้าเดียวกัน",
      en: "If you have not yet told us how we did, you can answer a short survey from the same page.",
    },
    reopenedSubject: { th: "เปิดข้อร้องเรียนของคุณอีกครั้งแล้ว {reference}", en: "Your complaint is reopened {reference}" },
    reopenedHeading: { th: "เปิดข้อร้องเรียนของคุณอีกครั้งแล้ว", en: "Your complaint is reopened" },
    reopenedIntro: {
      th: "เจ้าหน้าที่ของ{service}เปิดข้อร้องเรียนนี้อีกครั้งและกำลังดำเนินการ",
      en: "Staff at {service} have reopened this complaint and are looking after it.",
    },
    reopenedHow: {
      th: "ดูความคืบหน้าได้จากลิงก์ส่วนตัวที่คุณได้รับตอนส่งเรื่อง",
      en: "You can see how it is going from the private link you were given when you sent it.",
    },
    withdrawnSubject: { th: "ถอนข้อร้องเรียนของคุณแล้ว {reference}", en: "Your complaint is withdrawn {reference}" },
    withdrawnHeading: { th: "ถอนข้อร้องเรียนของคุณแล้ว", en: "Your complaint is withdrawn" },
    withdrawnIntro: {
      th: "เจ้าหน้าที่ของ{service}บันทึกการถอนข้อร้องเรียนนี้แล้ว และจะไม่ดำเนินการต่อ",
      en: "Staff at {service} have recorded that this complaint is withdrawn, so we will not take it further.",
    },
    withdrawnAsk: {
      th: "หากคุณไม่ได้ขอให้ถอนเรื่อง โปรดติดต่อเจ้าหน้าที่โดยเร็ว และแจ้งเลขอ้างอิงด้านล่าง",
      en: "If you did not ask for it to be withdrawn, please contact staff straight away and give them the reference below.",
    },
  },
  { th: "อีเมล: ข้อร้องเรียน", en: "Emails: complaints" },
);

/** Emails about lost property reports and claims. */
export const EMAIL_LOST_FOUND_TEXT = editableStrings(
  "email-lost-found",
  {
    deskAt: { th: "ที่เคาน์เตอร์{desk}", en: "at the {desk} desk" },
    deskDefault: { th: "ที่เคาน์เตอร์ของ อมธ. หรือสภาฯ", en: "at the TUSU or TUSC desk" },
    yourReference: { th: "เลขอ้างอิงของคุณ", en: "Your reference" },
    reference: { th: "เลขอ้างอิง", en: "Reference" },
    noForward: {
      th: "อย่าส่งต่ออีเมลนี้ให้ผู้อื่น ทั้งนี้ เราไม่เคยขอรหัสผ่านหรือเลขบัตรทางอีเมล",
      en: "Do not forward this email. We will never ask for a password or an ID number by email.",
    },
    bringId: {
      th: "โปรดนำบัตรนักศึกษาหรือบัตรประจำตัวที่มีรูปถ่ายมาด้วย เจ้าหน้าที่จะตรวจดูบัตรแต่ไม่จดเลขบัตร",
      en: "Please bring your student card or another photo ID. Staff will look at it but will not write down the number.",
    },
    cannotCome: { th: "หากมารับเองไม่ได้ โปรดติดต่อเจ้าหน้าที่ก่อน", en: "If you cannot come yourself, please contact staff first." },
    matchSubject: { th: "เราอาจพบของที่คุณแจ้งหาย {reference}", en: "We may have found what you lost {reference}" },
    matchHeading: { th: "เราอาจพบของที่คุณแจ้งหาย", en: "We may have found what you lost" },
    matchIntro: {
      th: "เจ้าหน้าที่พบของที่อาจตรงกับเรื่องที่คุณแจ้งไว้กับ{service} ยังไม่แน่ใจว่าเป็นของคุณ เราจะตรวจสอบกับคุณก่อนส่งคืน",
      en: "Staff have found something that may match your report on {service}. We are not sure it is yours yet, so we will check with you before we hand it over.",
    },
    matchContact: { th: "โปรดติดต่อเจ้าหน้าที่ {desk} และแจ้งเลขอ้างอิงด้านล่าง", en: "Please contact staff {desk} and give them the reference below." },
    readySubject: { th: "มารับของคืนได้แล้ว {reference}", en: "Your item is ready to collect {reference}" },
    readyHeading: { th: "มารับของคืนได้แล้ว", en: "Your item is ready to collect" },
    readyIntro: {
      th: "เราตรวจสอบแล้วและพร้อมคืนของให้คุณ มารับได้ {desk} ในเวลาทำการ",
      en: "We have checked and we are ready to give it back. You can collect it {desk} during opening hours.",
    },
    returnedSubject: { th: "คืนของเรียบร้อยแล้ว {reference}", en: "Your item has been returned {reference}" },
    returnedHeading: { th: "คืนของเรียบร้อยแล้ว", en: "Your item has been returned" },
    returnedIntro: {
      th: "เจ้าหน้าที่บันทึกแล้วว่าคุณได้รับของคืน จึงขอปิดเรื่องที่คุณแจ้งไว้กับ{service} ขอบคุณที่แจ้งให้เราทราบ",
      en: "Staff have recorded that you got your item back, so your report on {service} is now closed. Thank you for letting us know.",
    },
    returnedAfter: { th: "หากคุณยังไม่ได้รับของ โปรดติดต่อเจ้าหน้าที่ทันที", en: "If you have not received it, please contact staff straight away." },
    reportDeclinedSubject: { th: "ยังคืนของตามที่คุณแจ้งไม่ได้ {reference}", en: "Your claim was not accepted {reference}" },
    reportDeclinedHeading: { th: "ยังคืนของตามที่คุณแจ้งไม่ได้", en: "Your claim was not accepted" },
    reportDeclinedIntro: {
      th: "เจ้าหน้าที่ตรวจสอบคำขอรับของคืนตามเรื่องที่คุณแจ้งไว้กับ{service}แล้ว แต่ยังยืนยันไม่ได้ว่าเป็นของคุณ จึงยังคืนของให้ไม่ได้",
      en: "Staff have checked a claim linked to your report on {service}, but could not confirm the item is yours, so it has not been handed over.",
    },
    reportDeclinedOpen: {
      th: "เรื่องที่คุณแจ้งยังไม่ปิด หากพบของที่ตรงกัน เราจะแจ้งให้ทราบอีกครั้ง หากมีข้อมูลเพิ่มเติม โปรดติดต่อเจ้าหน้าที่ {desk} และแจ้งเลขอ้างอิงด้านล่าง",
      en: "Your report is still open and we will tell you if we find a match. If you have more to tell us, please contact staff {desk} and give them the reference below.",
    },
    claimAcceptedSubject: { th: "อนุมัติคำขอรับของคืนแล้ว {reference}", en: "Your claim was accepted {reference}" },
    claimAcceptedHeading: { th: "อนุมัติคำขอรับของคืนแล้ว", en: "Your claim was accepted" },
    claimAcceptedIntro: {
      th: "เจ้าหน้าที่ของ{service}ตรวจสอบแล้วและพร้อมคืนของให้คุณ มารับได้ {desk} ในเวลาทำการ",
      en: "Staff at {service} have checked and we are ready to give the item back. You can collect it {desk} during opening hours.",
    },
    claimDeclinedSubject: { th: "ยังไม่อนุมัติคำขอรับของคืน {reference}", en: "Your claim was not accepted {reference}" },
    claimDeclinedHeading: { th: "ยังไม่อนุมัติคำขอรับของคืน", en: "Your claim was not accepted" },
    claimDeclinedIntro: {
      th: "เจ้าหน้าที่ของ{service}ตรวจสอบคำขอรับของคืนแล้ว แต่ยังยืนยันไม่ได้ว่าเป็นของคุณ จึงยังคืนของให้ไม่ได้",
      en: "Staff at {service} have checked your claim but could not confirm the item is yours, so it has not been handed over.",
    },
    claimDeclinedMore: {
      th: "หากมีข้อมูลเพิ่มเติม โปรดติดต่อเจ้าหน้าที่ {desk} และแจ้งเลขอ้างอิงด้านล่าง",
      en: "If you have more to tell us, please contact staff {desk} and give them the reference below.",
    },
  },
  { th: "อีเมล: ของหายและของที่พบ", en: "Emails: lost and found" },
);

/** Emails about an equipment loan: the decision, reminders and closing notices. */
export const EMAIL_LOAN_TEXT = editableStrings(
  "email-loans",
  {
    reference: { th: "เลขอ้างอิง", en: "Your reference" },
    privateLink: { th: "ใครมีลิงก์ส่วนตัวก็ดูคำขอนี้ได้ จึงไม่ควรส่งต่อให้ผู้อื่น", en: "Anyone with the private link can see this request, so do not share it." },
    newRequest: { th: "ส่งคำขอใหม่ได้ โดยเลือกวันหรือรายการอุปกรณ์ที่ว่างอยู่", en: "You can make a new request, choosing dates or items that are free." },
    approvedSubject: { th: "อนุมัติคำขอยืมอุปกรณ์แล้ว {reference}", en: "Your equipment request is approved {reference}" },
    approvedHeading: { th: "อนุมัติคำขอยืมอุปกรณ์แล้ว", en: "Your equipment request is approved" },
    approvedIntro: {
      th: "เจ้าหน้าที่ของ{service}อนุมัติคำขอแล้ว มารับอุปกรณ์ได้ในวันที่ {collectAt} และคืนภายในวันที่ {returnBy}",
      en: "Staff at {service} have approved your request. Collect the equipment on {collectAt} and return it by {returnBy}.",
    },
    approvedDepositOne: {
      th: "วันรับอุปกรณ์ ให้นำบัตรนักศึกษาหรือบัตรประจำตัวประชาชนตัวจริง {cards} ใบ มาวางเป็นหลักประกัน และรับบัตรคืนเมื่อคืนอุปกรณ์ครบ",
      en: "When you collect it, bring your original student card or national ID card to leave as a deposit. You get it back when everything is returned.",
    },
    approvedDepositMany: {
      th: "วันรับอุปกรณ์ ให้นำบัตรนักศึกษาหรือบัตรประจำตัวประชาชนตัวจริง {cards} ใบ มาวางเป็นหลักประกัน และรับบัตรคืนเมื่อคืนอุปกรณ์ครบ",
      en: "When you collect it, bring {cards} original student cards or national ID cards to leave as a deposit. You get them back when everything is returned.",
    },
    approvedShowId: {
      th: "วันรับอุปกรณ์ ให้นำบัตรนักศึกษาหรือบัตรประจำตัวประชาชนตัวจริงมาแสดง",
      en: "When you collect it, bring your original student card or national ID card to show.",
    },
    approvedHours: {
      th: "เคาน์เตอร์เปิดวันจันทร์ถึงวันศุกร์ เวลา {hours} น. ดูจำนวนและข้อความจากเจ้าหน้าที่ได้จากลิงก์ส่วนตัวที่ได้รับตอนส่งคำขอ",
      en: "The desk is open Monday to Friday, {hours}. You can see the quantities approved, and any message from staff, on the private link you were given when you sent the request.",
    },
    declinedSubject: { th: "ไม่อนุมัติคำขอยืมอุปกรณ์ {reference}", en: "Your equipment request was not approved {reference}" },
    declinedHeading: { th: "ไม่อนุมัติคำขอยืมอุปกรณ์", en: "Your equipment request was not approved" },
    declinedIntro: { th: "เจ้าหน้าที่ของ{service}ไม่อนุมัติคำขอนี้ เหตุผลมีดังนี้", en: "Staff at {service} could not approve your request. This is the reason." },
    reminderSubject: { th: "แจ้งเตือนกำหนดคืนอุปกรณ์ {reference}", en: "Reminder to return equipment {reference}" },
    reminderHeading: { th: "ใกล้ถึงกำหนดคืนอุปกรณ์", en: "Your equipment is due back soon" },
    reminderDue: { th: "อุปกรณ์ที่ยืมไปต้องคืนภายในวันที่ {returnBy}", en: "The equipment you borrowed is due back by {returnBy}." },
    reminderHours: {
      th: "คืนได้ที่เคาน์เตอร์ วันจันทร์ถึงวันศุกร์ เวลา {hours} น. หากคืนไม่ทัน ให้ติดต่อเจ้าหน้าที่ล่วงหน้า",
      en: "Return it to the desk, Monday to Friday, {hours}. If you cannot return it in time, contact the desk before then.",
    },
    overdueSubject: { th: "เลยกำหนดคืนอุปกรณ์ {reference}", en: "Your equipment is overdue {reference}" },
    overdueHeading: { th: "เลยกำหนดคืนอุปกรณ์แล้ว", en: "Your equipment is overdue" },
    overdueDue: {
      th: "อุปกรณ์ที่ยืมไปต้องคืนภายในวันที่ {returnBy} แต่เรายังไม่ได้รับคืน",
      en: "The equipment you borrowed was due back by {returnBy} and we have not had it back yet.",
    },
    overdueHours: {
      th: "โปรดนำมาคืนที่เคาน์เตอร์โดยเร็ว วันจันทร์ถึงวันศุกร์ เวลา {hours} น. หากมีปัญหา ให้ติดต่อเจ้าหน้าที่ เพื่อไม่ให้กระทบผู้ที่จองยืมต่อ",
      en: "Please bring it to the desk as soon as you can, Monday to Friday, {hours}. If something is wrong, contact the desk, so the next person who booked it is not let down.",
    },
    returnedSubject: { th: "รับคืนอุปกรณ์เรียบร้อยแล้ว {reference}", en: "Your equipment has been returned {reference}" },
    returnedHeading: { th: "รับคืนอุปกรณ์เรียบร้อยแล้ว", en: "Your equipment has been returned" },
    returnedIntro: {
      th: "เจ้าหน้าที่ของ{service}บันทึกแล้วว่าได้รับอุปกรณ์คืน การยืมครั้งนี้จึงสิ้นสุดลง ขอบคุณที่ใช้บริการ",
      en: "Staff at {service} have recorded that the equipment is back, so this loan is now closed. Thank you.",
    },
    returnedCard: { th: "หากมีบัตรที่วางไว้เป็นหลักประกัน เจ้าหน้าที่จะคืนให้ตามที่บันทึกไว้", en: "If you left a card as a deposit, staff will give it back as recorded." },
    settledSubject: { th: "ปิดเรื่องการยืมอุปกรณ์แล้ว {reference}", en: "Your equipment loan is settled {reference}" },
    settledHeading: { th: "ปิดเรื่องการยืมอุปกรณ์แล้ว", en: "Your equipment loan is settled" },
    settledIntro: {
      th: "เจ้าหน้าที่ของ{service}ดำเนินการเรื่องอุปกรณ์ที่ยืมเสร็จสิ้นแล้ว การยืมครั้งนี้จึงสิ้นสุดลง",
      en: "Staff at {service} have finished dealing with the equipment you borrowed, so this loan is now closed.",
    },
    settledSee: {
      th: "ดูรายละเอียดที่เจ้าหน้าที่บันทึกไว้ได้จากลิงก์ส่วนตัวที่ได้รับตอนส่งคำขอ",
      en: "You can see what staff recorded on the private link you were given when you sent the request.",
    },
    notCollectedSubject: { th: "ปิดคำขอยืมอุปกรณ์เพราะไม่ได้มารับ {reference}", en: "Your equipment request was closed, not collected {reference}" },
    notCollectedHeading: { th: "ปิดคำขอยืมอุปกรณ์เพราะไม่ได้มารับ", en: "Your equipment request was closed, not collected" },
    notCollectedIntro: {
      th: "เจ้าหน้าที่ของ{service}บันทึกว่าไม่ได้มารับอุปกรณ์ตามวันที่กำหนด จึงปิดคำขอนี้เพื่อให้คนอื่นยืมได้",
      en: "Staff at {service} recorded that the equipment was not collected when it was due, so this request is closed and others can borrow it.",
    },
    cancelledSubject: { th: "ยกเลิกคำขอยืมอุปกรณ์ {reference}", en: "Your equipment request was cancelled {reference}" },
    cancelledHeading: { th: "ยกเลิกคำขอยืมอุปกรณ์", en: "Your equipment request was cancelled" },
    cancelledIntro: { th: "เจ้าหน้าที่ของ{service}ยกเลิกคำขอนี้ เหตุผลมีดังนี้", en: "Staff at {service} have cancelled your request. This is the reason." },
  },
  { th: "อีเมล: การยืมอุปกรณ์", en: "Emails: equipment loans" },
);

/** The email that goes with a console notification, sent to staff. */
export const EMAIL_STAFF_NOTICE_TEXT = editableStrings(
  "email-staff-notice",
  {
    caseAssignedTitle: { th: "คุณได้รับมอบหมายเคสใหม่", en: "A case has been assigned to you" },
    caseAssignedRef: { th: "คุณได้รับมอบหมายเคส {reference}", en: "Case {reference} has been assigned to you." },
    caseAssignedNoRef: { th: "คุณได้รับมอบหมายเคสใหม่", en: "A case has been assigned to you." },
    caseMentionTitle: { th: "มีผู้กล่าวถึงคุณในบันทึก", en: "You were mentioned in a note" },
    caseMentionRef: { th: "มีผู้กล่าวถึงคุณในบันทึกภายในของเคส {reference}", en: "You were mentioned in an internal note on case {reference}." },
    caseMentionNoRef: { th: "มีผู้กล่าวถึงคุณในบันทึกภายในของเคส", en: "You were mentioned in an internal note on a case." },
    complaintEscalatedTitle: { th: "มีการยกระดับข้อร้องเรียน", en: "A complaint has been escalated" },
    complaintEscalatedRef: { th: "ข้อร้องเรียน {reference} เกินกำหนด จึงยกระดับเรื่องแล้ว", en: "Complaint {reference} is overdue and has been escalated." },
    complaintEscalatedNoRef: { th: "มีข้อร้องเรียนเกินกำหนด จึงยกระดับเรื่องแล้ว", en: "A complaint is overdue and has been escalated." },
    borrowingOverdueTitle: { th: "มีอุปกรณ์เกินกำหนดคืน", en: "Borrowed equipment is overdue" },
    borrowingOverdueRef: { th: "การยืม {reference} เกินกำหนดคืนแล้ว", en: "Loan {reference} is past its return time." },
    borrowingOverdueNoRef: { th: "มีรายการยืมที่เกินกำหนดคืน", en: "A loan is past its return time." },
    inviteAcceptedTitle: { th: "มีผู้ตอบรับคำเชิญของคุณแล้ว", en: "Your invitation was accepted" },
    inviteAcceptedLine: { th: "ผู้ที่คุณเชิญตอบรับและเข้าร่วมทีมแล้ว", en: "Someone you invited has accepted and joined the team." },
    fallbackTitle: { th: "มีการแจ้งเตือนใหม่", en: "You have a new notification" },
    fallbackLine: { th: "มีการแจ้งเตือนใหม่ในคอนโซลเจ้าหน้าที่", en: "You have a new notification in the staff console." },
    onService: { th: "{line} บน{service}", en: "{line} On {service}." },
    openLabel: { th: "เปิดในคอนโซล", en: "Open in the console" },
  },
  { th: "อีเมล: แจ้งเตือนเจ้าหน้าที่", en: "Emails: staff notifications" },
);
