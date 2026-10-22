/**
 * Strings for the staff console (/admin). Kept apart from lib/i18n/strings.ts,
 * which is the public site's fixed contract, but built the same way: every
 * entry carries Thai and English, written as two native sentences rather than
 * one translated from the other, in the same plain official register.
 *
 * Error messages follow the GOV.UK error message guidance: say what to do,
 * not what the person did wrong ("Enter your email address", not "Invalid
 * input"). Placeholders look like `{email}`; fill them with `fmt`.
 */

import type { Locale, LocaleString } from "./config";

export const A = {
  /* Shell */
  consoleName: { th: "คอนโซลเจ้าหน้าที่", en: "Staff console" },
  signOut: { th: "ออกจากระบบ", en: "Sign out" },
  staffLink: { th: "จัดการเจ้าหน้าที่", en: "Manage staff" },
  homeLink: { th: "หน้าหลัก", en: "Dashboard" },
  consoleNav: { th: "เมนูคอนโซลเจ้าหน้าที่", en: "Staff console menu" },
  notIndexedNote: { th: "สำหรับเจ้าหน้าที่ที่ได้รับเชิญเท่านั้น", en: "For invited staff only" },
  notConfiguredTitle: { th: "ยังไม่ได้ตั้งค่าการเข้าสู่ระบบ", en: "Sign-in is not set up" },
  notConfiguredBody: {
    th: "ยังใช้คอนโซลเจ้าหน้าที่ในสภาพแวดล้อมนี้ไม่ได้ ผู้พัฒนาต้องตั้งค่าตัวแปรต่อไปนี้ก่อน: {vars}",
    en: "The staff console cannot be used in this environment yet. A developer needs to set: {vars}",
  },

  /* Sign in: email */
  signInTitle: { th: "เข้าสู่ระบบคอนโซลเจ้าหน้าที่", en: "Sign in to the staff console" },
  signInIntro: {
    th: "เราจะส่งรหัส 6 หลักไปที่อีเมลของคุณ ไม่ต้องใช้รหัสผ่าน",
    en: "We will email you a 6 digit code. You do not need a password",
  },
  emailLabel: { th: "อีเมล", en: "Email address" },
  emailHint: { th: "ใช้อีเมลของมหาวิทยาลัย เช่น name@dome.tu.ac.th", en: "Use your university email address, for example name@dome.tu.ac.th" },
  continue: { th: "ดำเนินการต่อ", en: "Continue" },
  errEmailRequired: { th: "กรอกอีเมลของคุณ", en: "Enter your email address" },
  errEmailFormat: {
    th: "กรอกอีเมลให้ถูกต้อง เช่น name@dome.tu.ac.th",
    en: "Enter an email address in the correct format, like name@dome.tu.ac.th",
  },
  errEmailDomain: {
    th: "ใช้อีเมลของมหาวิทยาลัยที่ลงท้ายด้วย {domains}",
    en: "Use a university email address ending in {domains}",
  },
  errTooManyCodes: {
    th: "คุณขอรหัสบ่อยเกินไป ลองใหม่ในอีก {minutes} นาที",
    en: "You have asked for too many codes. Try again in {minutes} minutes",
  },
  errSendFailed: { th: "ส่งรหัสไม่สำเร็จ ลองอีกครั้ง", en: "We could not send the code. Try again" },

  /* Sign in: code */
  codeTitle: { th: "ตรวจสอบอีเมลของคุณ", en: "Check your email" },
  codeSentTo: { th: "เราส่งรหัสไปที่ {email}", en: "We have sent a code to {email}" },
  codeIntro: {
    th: "รหัสมี 6 หลักและใช้ได้ 10 นาที หากไม่พบอีเมล ลองดูในกล่องจดหมายขยะ",
    en: "The code is 6 digits and works for 10 minutes. If you cannot see the email, check your spam folder",
  },
  codeLabel: { th: "รหัส 6 หลัก", en: "6 digit code" },
  errCodeRequired: { th: "กรอกรหัส 6 หลักที่ส่งไปทางอีเมล", en: "Enter the 6 digit code we emailed you" },
  errCodeFormat: { th: "รหัสต้องเป็นตัวเลข 6 หลัก", en: "The code must be 6 digits" },
  errCodeWrong: {
    th: "รหัสไม่ถูกต้อง ตรวจสอบอีเมลอีกครั้ง หรือขอรหัสใหม่",
    en: "That code is not right. Check the email again, or ask for a new code",
  },
  errCodeExpired: {
    th: "รหัสนี้หมดอายุหรือกรอกผิดหลายครั้งแล้ว ขอรหัสใหม่",
    en: "That code has expired or has been tried too many times. Ask for a new code",
  },
  errNoAccount: {
    th: "ไม่สามารถเข้าสู่ระบบด้วยอีเมลนี้ได้",
    en: "You cannot sign in with this email address",
  },
  resendHelp: { th: "ไม่ได้รับรหัส", en: "Not received a code?" },
  codeResentTitle: { th: "ส่งรหัสใหม่แล้ว", en: "New code sent" },
  codeResentBody: {
    th: "เราส่งรหัสใหม่ไปที่ {email} แล้ว รหัสก่อนหน้าใช้ไม่ได้อีก",
    en: "We have sent a new code to {email}. The earlier code no longer works",
  },
  resendTitle: { th: "ขอรหัสใหม่", en: "Get a new code" },
  resendBody: {
    th: "เราจะส่งรหัสใหม่ไปที่ {email} รหัสก่อนหน้าจะใช้ไม่ได้อีก",
    en: "We will send a new code to {email}. The earlier code will stop working",
  },
  resendButton: { th: "ส่งรหัสใหม่", en: "Send a new code" },
  changeEmail: { th: "ใช้อีเมลอื่น", en: "Use a different email address" },

  /* Second step: challenge */
  verifyTitle: { th: "ยืนยันว่าเป็นคุณ", en: "Confirm it is you" },
  verifyIntro: {
    th: "เจ้าหน้าที่ทุกคนต้องยืนยันตัวตนอีกหนึ่งขั้นตอนทุกครั้งที่เข้าสู่ระบบ",
    en: "All staff confirm their identity in a second step each time they sign in",
  },
  authCodeLabel: { th: "รหัสจากแอปยืนยันตัวตน", en: "Code from your authenticator app" },
  authCodeHint: {
    th: "เปิดแอปยืนยันตัวตนบนอุปกรณ์ของคุณ แล้วกรอกรหัส 6 หลักที่แสดงอยู่",
    en: "Open the authenticator app on your device and enter the 6 digit code it shows",
  },
  errAuthCodeRequired: { th: "กรอกรหัส 6 หลักจากแอปยืนยันตัวตน", en: "Enter the 6 digit code from your authenticator app" },
  errAuthCodeWrong: {
    th: "รหัสไม่ถูกต้อง ตรวจสอบรหัสในแอปแล้วลองอีกครั้ง",
    en: "That code is not right. Check the code in the app and try again",
  },
  errAuthLocked: {
    th: "กรอกรหัสผิดหลายครั้งเกินไป รอ 15 นาทีแล้วลองอีกครั้ง",
    en: "Too many wrong codes. Wait 15 minutes and try again",
  },
  passkeyUseHeading: { th: "ใช้พาสคีย์", en: "Use a passkey" },
  passkeyUseBody: {
    th: "ยืนยันด้วยลายนิ้วมือ ใบหน้า การล็อกหน้าจอ หรือกุญแจความปลอดภัยของคุณ",
    en: "Confirm with your fingerprint, face, screen lock or security key",
  },
  passkeyUseButton: { th: "ใช้พาสคีย์", en: "Use passkey" },
  passkeyNeedsScript: {
    th: "พาสคีย์ต้องเปิดใช้ JavaScript หากเปิดไม่ได้ ให้ใช้แอปยืนยันตัวตนหรือรหัสสำรองแทน",
    en: "Passkeys need JavaScript. If you cannot turn it on, use your authenticator app or a backup code instead",
  },
  passkeyFailed: {
    th: "ใช้พาสคีย์ไม่สำเร็จ ลองอีกครั้ง หรือเลือกวิธีอื่น",
    en: "The passkey did not work. Try again, or choose another way",
  },
  backupLink: { th: "ใช้รหัสสำรอง", en: "Use a backup code" },
  backupTitle: { th: "ใช้รหัสสำรอง", en: "Use a backup code" },
  backupHint: {
    th: "รหัสสำรองแต่ละรหัสใช้ได้ครั้งเดียว ใช้เมื่อคุณเข้าถึงแอปยืนยันตัวตนไม่ได้",
    en: "Each backup code works once. Use one if you cannot get to your authenticator app",
  },
  backupLabel: { th: "รหัสสำรอง", en: "Backup code" },
  errBackupRequired: { th: "กรอกรหัสสำรองของคุณ", en: "Enter one of your backup codes" },
  errBackupWrong: {
    th: "รหัสสำรองไม่ถูกต้องหรือเคยใช้แล้ว ลองรหัสอื่น",
    en: "That backup code is not right or has already been used. Try another one",
  },
  backToAuthApp: { th: "กลับไปใช้แอปยืนยันตัวตน", en: "Go back to the authenticator app" },

  /* Second step: set up */
  setupTitle: { th: "ตั้งค่าการยืนยันตัวตนสองขั้นตอน", en: "Set up two-step verification" },
  setupIntro: {
    th: "เจ้าหน้าที่ทุกคนต้องยืนยันตัวตนสองขั้นตอน เพื่อปกป้องข้อมูลส่วนบุคคลของนักศึกษา เลือกวิธีที่คุณจะใช้ทุกครั้งที่เข้าสู่ระบบ",
    en: "All staff must confirm their identity in two steps, to protect students' personal data. Choose how you will do it each time you sign in",
  },
  setupLegend: { th: "คุณต้องการยืนยันตัวตนด้วยวิธีใด", en: "How do you want to confirm it is you?" },
  optAuthenticator: { th: "แอปยืนยันตัวตน", en: "Authenticator app" },
  optAuthenticatorHint: {
    th: "แอปบนโทรศัพท์ เช่น Google Authenticator, Microsoft Authenticator หรือ 1Password",
    en: "An app on your phone, such as Google Authenticator, Microsoft Authenticator or 1Password",
  },
  optPasskey: { th: "พาสคีย์", en: "Passkey" },
  optPasskeyHint: {
    th: "ลายนิ้วมือ ใบหน้า การล็อกหน้าจอ หรือกุญแจความปลอดภัย",
    en: "Your fingerprint, face, screen lock or a security key",
  },
  errChoiceRequired: { th: "เลือกวิธียืนยันตัวตน", en: "Select how you want to confirm it is you" },

  authSetupTitle: { th: "ตั้งค่าแอปยืนยันตัวตน", en: "Set up an authenticator app" },
  authStep1: { th: "ติดตั้งแอปยืนยันตัวตนบนโทรศัพท์ของคุณ หากยังไม่มี", en: "Install an authenticator app on your phone if you do not have one" },
  authStep2: {
    th: "เพิ่มบัญชีในแอปด้วยรหัสตั้งค่านี้ หรือเปิดลิงก์นี้บนโทรศัพท์ของคุณ",
    en: "Add an account in the app using this setup key, or open the link on your phone",
  },
  setupKeyLabel: { th: "รหัสตั้งค่า", en: "Setup key" },
  openInApp: { th: "เปิดในแอปยืนยันตัวตน", en: "Open in your authenticator app" },
  authStep3: { th: "กรอกรหัส 6 หลักที่แอปแสดง เพื่อยืนยันว่าตั้งค่าถูกต้อง", en: "Enter the 6 digit code the app shows, to check it is set up correctly" },
  authConfirmButton: { th: "ยืนยันและดำเนินการต่อ", en: "Confirm and continue" },
  authSetupFailed: { th: "เริ่มตั้งค่าไม่สำเร็จ ลองอีกครั้ง", en: "We could not start the setup. Try again" },
  backupDoneTitle: { th: "บันทึกรหัสสำรองของคุณ", en: "Save your backup codes" },
  backupDoneIntro: {
    th: "ตั้งค่าแอปยืนยันตัวตนเรียบร้อยแล้ว เก็บรหัสสำรองเหล่านี้ไว้ในที่ปลอดภัย",
    en: "Your authenticator app is set up. Keep these backup codes somewhere safe",
  },
  backupDoneWarning: {
    th: "รหัสแต่ละรหัสใช้ได้ครั้งเดียว เมื่อโทรศัพท์หายหรือเข้าแอปไม่ได้ และเราจะไม่แสดงรหัสเหล่านี้อีก",
    en: "Each code works once, if you lose your phone or cannot get into the app. We will not show them again",
  },
  backupDoneGone: {
    th: "แอปยืนยันตัวตนของคุณตั้งค่าเรียบร้อยแล้ว รหัสสำรองแสดงได้ครั้งเดียวและไม่แสดงอีก",
    en: "Your authenticator app is set up. Backup codes are shown once, so they are not shown again",
  },
  backupDoneButton: { th: "ไปที่คอนโซล", en: "Go to the console" },
  passkeySetupTitle: { th: "สร้างพาสคีย์", en: "Create a passkey" },
  passkeySetupBody: {
    th: "เบราว์เซอร์จะขอให้คุณยืนยันด้วยลายนิ้วมือ ใบหน้า การล็อกหน้าจอ หรือกุญแจความปลอดภัย",
    en: "Your browser will ask you to confirm with your fingerprint, face, screen lock or security key",
  },
  passkeyCreateButton: { th: "สร้างพาสคีย์", en: "Create passkey" },
  passkeyCreateFailed: {
    th: "สร้างพาสคีย์ไม่สำเร็จ ลองอีกครั้ง หรือเลือกแอปยืนยันตัวตนแทน",
    en: "We could not create the passkey. Try again, or use an authenticator app instead",
  },
  chooseAnotherWay: { th: "เลือกวิธีอื่น", en: "Choose another way" },

  /* Dashboard */
  dashTitle: { th: "คอนโซลเจ้าหน้าที่", en: "Staff console" },
  dashIntro: {
    th: "หน้านี้ยังเป็นหน้าเริ่มต้น เครื่องมือสำหรับงานของคุณจะทยอยเพิ่มเข้ามา",
    en: "This is a starting page. The tools for your work will be added here",
  },
  yourDetails: { th: "ข้อมูลของคุณ", en: "Your details" },
  rowName: { th: "ชื่อ", en: "Name" },
  rowEmail: { th: "อีเมล", en: "Email address" },
  rowOrganisations: { th: "หน่วยงาน", en: "Organisations" },
  rowRoles: { th: "บทบาท", en: "Roles" },
  rowSessionEnds: { th: "เซสชันสิ้นสุดอย่างช้าที่สุด", en: "Session ends no later than" },
  nameNotGiven: { th: "ยังไม่ได้ระบุ", en: "Not given" },
  roleAtOrganisation: { th: "{role} ({organisation})", en: "{role} ({organisation})" },

  /* Roles */
  roleAdmin: { th: "ผู้ดูแลระบบ", en: "Administrator" },
  roleEditor: { th: "บรรณาธิการเนื้อหา", en: "Content editor" },
  roleLfOfficer: { th: "เจ้าหน้าที่ของหายและของเก็บได้", en: "Lost and found officer" },
  roleComplaintsHandler: { th: "ผู้รับเรื่องร้องเรียน", en: "Complaints handler" },
  roleUnitLead: { th: "หัวหน้าหน่วย", en: "Unit lead" },
  roleAdminHint: { th: "เชิญและเอาเจ้าหน้าที่ออก กำหนดบทบาท", en: "Invites and removes staff and sets roles" },
  roleEditorHint: { th: "แก้ไขเนื้อหาบนเว็บไซต์", en: "Edits website content" },
  roleLfOfficerHint: { th: "จัดการรายงานของหายและของเก็บได้", en: "Handles lost and found reports" },
  roleComplaintsHandlerHint: { th: "รับและดำเนินการเรื่องร้องเรียน", en: "Receives and resolves complaints" },
  roleUnitLeadHint: { th: "ดูแลเรื่องที่เลยกำหนดและส่งต่อ", en: "Handles overdue and escalated cases" },

  /* No access, signed out */
  noAccessTitle: { th: "คุณไม่มีสิทธิ์เข้าถึง", en: "You do not have access" },
  noAccessBody: {
    th: "บัญชี {email} ไม่ได้เป็นเจ้าหน้าที่ จึงใช้คอนโซลนี้ไม่ได้",
    en: "{email} is not a member of staff, so you cannot use this console",
  },
  noAccessRoleBody: {
    th: "บทบาทของคุณไม่รวมหน้านี้",
    en: "Your role does not include this page",
  },
  noAccessHelp: {
    th: "หากคุณเป็นเจ้าหน้าที่ ให้ติดต่อผู้ดูแลระบบของ อมธ. หรือสภานักศึกษา เพื่อขอคำเชิญ",
    en: "If you are a member of staff, ask an administrator at TUSU or TUSC to invite you",
  },
  backToConsole: { th: "กลับไปหน้าคอนโซล", en: "Go to the console" },
  signedOutTitle: { th: "คุณออกจากระบบแล้ว", en: "You have been signed out" },
  signedOutTimeout: {
    th: "เพื่อความปลอดภัย เราออกจากระบบให้เมื่อคุณไม่ได้ใช้งานเกิน 30 นาที ข้อมูลที่ยังไม่ได้บันทึกจะหายไป",
    en: "For your security, we signed you out because you were inactive for 30 minutes. Anything you had not saved is lost",
  },
  signedOutManual: { th: "คุณออกจากระบบเรียบร้อยแล้ว", en: "You have signed out" },
  signInAgain: { th: "เข้าสู่ระบบอีกครั้ง", en: "Sign in again" },

  /* Session timeout warning */
  timeoutTitle: { th: "คุณกำลังจะถูกออกจากระบบ", en: "You are about to be signed out" },
  timeoutBody: {
    th: "เพื่อความปลอดภัย เราจะออกจากระบบให้คุณใน {time} ข้อมูลที่ยังไม่ได้บันทึกจะหายไป",
    en: "For your security, we will sign you out in {time}. Anything you have not saved will be lost",
  },
  timeoutMinutes: { th: "{count} นาที", en: "{count} minutes" },
  timeoutMinute: { th: "{count} นาที", en: "{count} minute" },
  timeoutSeconds: { th: "{count} วินาที", en: "{count} seconds" },
  staySignedIn: { th: "อยู่ในระบบต่อ", en: "Stay signed in" },

  /* Staff */
  staffTitle: { th: "เจ้าหน้าที่", en: "Staff" },
  staffIntro: {
    th: "เชิญเจ้าหน้าที่ใหม่ และจัดการบทบาทของเจ้าหน้าที่ในหน่วยงานที่คุณเป็นผู้ดูแลระบบ",
    en: "Invite new staff and manage roles for the organisations where you are an administrator",
  },
  staffListCaption: { th: "เจ้าหน้าที่ที่มีบทบาทอยู่ในขณะนี้", en: "Staff who currently hold a role" },
  colPerson: { th: "บุคคล", en: "Person" },
  colRoles: { th: "บทบาท", en: "Roles" },
  noStaff: { th: "ยังไม่มีเจ้าหน้าที่", en: "There are no staff yet" },
  removeRole: { th: "เอาบทบาทออก", en: "Remove role" },
  removeRoleVisible: { th: "เอาออก", en: "Remove" },
  removeRoleFor: { th: "เอาบทบาท {role} ของ {person} ออก", en: "Remove the {role} role from {person}" },
  pendingHeading: { th: "คำเชิญที่รอการตอบรับ", en: "Invitations waiting to be accepted" },
  pendingCaption: { th: "คำเชิญที่ยังใช้ได้", en: "Invitations that can still be used" },
  noPending: { th: "ไม่มีคำเชิญที่รอการตอบรับ", en: "There are no invitations waiting" },
  colEmail: { th: "อีเมล", en: "Email address" },
  colOrganisation: { th: "หน่วยงาน", en: "Organisation" },
  colExpires: { th: "หมดอายุ", en: "Expires" },
  cancelInvite: { th: "ยกเลิกคำเชิญ", en: "Cancel invitation" },
  cancelInviteFor: { th: "ยกเลิกคำเชิญของ {email}", en: "Cancel the invitation for {email}" },
  inviteHeading: { th: "เชิญเจ้าหน้าที่", en: "Invite a member of staff" },
  inviteIntro: {
    th: "เราจะส่งลิงก์ไปที่อีเมลนี้ ลิงก์ใช้ได้ 7 วัน ใช้อีเมลของมหาวิทยาลัยหรืออีเมลอื่นก็ได้",
    en: "We will email a link to this address. The link works for 7 days. It can be a university address or any other",
  },
  inviteOrgLegend: { th: "เชิญเข้าหน่วยงานใด", en: "Which organisation are they joining?" },
  inviteRolesLegend: { th: "บทบาท", en: "Roles" },
  inviteRolesHint: { th: "เลือกได้หลายบทบาท", en: "Select all that apply" },
  inviteSend: { th: "ส่งคำเชิญ", en: "Send invitation" },
  errInviteEmailRequired: { th: "กรอกอีเมลของผู้ที่คุณต้องการเชิญ", en: "Enter the email address of the person you want to invite" },
  errInviteOrgRequired: { th: "เลือกหน่วยงาน", en: "Select an organisation" },
  errInviteRolesRequired: { th: "เลือกอย่างน้อยหนึ่งบทบาท", en: "Select at least one role" },
  errInviteSendFailed: {
    th: "ส่งอีเมลคำเชิญไม่สำเร็จ จึงยังไม่ได้สร้างคำเชิญ ลองอีกครั้ง",
    en: "We could not send the invitation email, so no invitation was made. Try again",
  },
  invitedTitle: { th: "ส่งคำเชิญแล้ว", en: "Invitation sent" },
  invitedBody: { th: "เราส่งคำเชิญไปที่ {email} แล้ว", en: "We have sent an invitation to {email}" },
  roleRemovedTitle: { th: "เอาบทบาทออกแล้ว", en: "Role removed" },
  roleRemovedBody: {
    th: "การเปลี่ยนแปลงมีผลทันที และถูกบันทึกไว้แล้ว",
    en: "The change takes effect straight away and has been recorded",
  },
  inviteCancelledBody: {
    th: "ลิงก์ในคำเชิญนั้นใช้ไม่ได้อีกแล้ว",
    en: "The link in that invitation no longer works",
  },
  goneTitle: { th: "ไม่มีรายการให้เปลี่ยน", en: "Nothing to change" },
  inviteCancelledTitle: { th: "ยกเลิกคำเชิญแล้ว", en: "Invitation cancelled" },
  removeRoleTitle: { th: "คุณต้องการเอาบทบาทนี้ออกหรือไม่", en: "Are you sure you want to remove this role?" },
  removeRoleBody: {
    th: "{person} จะไม่มีบทบาท {role} ของ{organisation} ตั้งแต่การคลิกครั้งถัดไป การเปลี่ยนแปลงนี้จะถูกบันทึกไว้",
    en: "{person} will no longer be {role} at {organisation} from their next click. This change is recorded",
  },
  removeRoleButton: { th: "เอาบทบาทออก", en: "Remove role" },
  cancelInviteTitle: { th: "คุณต้องการยกเลิกคำเชิญนี้หรือไม่", en: "Are you sure you want to cancel this invitation?" },
  cancelInviteBody: {
    th: "ลิงก์ที่ส่งไปให้ {email} จะใช้ไม่ได้อีก",
    en: "The link sent to {email} will stop working",
  },
  cancelInviteButton: { th: "ยกเลิกคำเชิญ", en: "Cancel invitation" },
  keepIt: { th: "ไม่ยกเลิก กลับไป", en: "No, go back" },
  errLastAdmin: {
    th: "เอาผู้ดูแลระบบคนสุดท้ายออกไม่ได้ ต้องมีผู้ดูแลระบบอย่างน้อยหนึ่งคนเสมอ",
    en: "You cannot remove the last administrator. There must always be at least one",
  },
  errNothingToChange: {
    th: "ไม่พบรายการนี้ หรือมีคนจัดการไปแล้ว",
    en: "We could not find this. Someone may have already dealt with it",
  },
  you: { th: "คุณ", en: "you" },
  backToStaff: { th: "กลับไปหน้าเจ้าหน้าที่", en: "Back to staff" },

  /* Accepting an invitation */
  inviteLandingTitle: { th: "คุณได้รับเชิญให้เป็นเจ้าหน้าที่", en: "You have been invited to join the staff" },
  inviteLandingBody: {
    th: "คุณได้รับเชิญให้ร่วมงานกับ{organisation} เราจะส่งรหัสไปที่ {email} เพื่อยืนยันว่าอีเมลนี้เป็นของคุณ",
    en: "You have been invited to join {organisation}. We will email a code to {email} to check the address is yours",
  },
  inviteLandingContinue: { th: "รับคำเชิญและรับรหัส", en: "Accept and get a code" },
  inviteBadTitle: { th: "ใช้ลิงก์คำเชิญนี้ไม่ได้", en: "This invitation link cannot be used" },
  inviteNotFound: {
    th: "ไม่พบคำเชิญนี้ ตรวจสอบว่าคัดลอกลิงก์ครบถ้วน หรือขอให้ผู้ดูแลระบบส่งคำเชิญใหม่",
    en: "We could not find this invitation. Check you copied the whole link, or ask an administrator to send a new one",
  },
  inviteExpired: {
    th: "คำเชิญนี้หมดอายุแล้ว ขอให้ผู้ดูแลระบบส่งคำเชิญใหม่",
    en: "This invitation has expired. Ask an administrator to send you a new one",
  },
  inviteRevoked: {
    th: "คำเชิญนี้ถูกยกเลิกแล้ว หากคิดว่าเกิดความผิดพลาด ให้ติดต่อผู้ดูแลระบบ",
    en: "This invitation was cancelled. If you think that is a mistake, contact an administrator",
  },
  inviteAccepted: {
    th: "คำเชิญนี้ถูกใช้ไปแล้ว หากเป็นคุณ ให้เข้าสู่ระบบตามปกติ",
    en: "This invitation has already been used. If that was you, sign in as usual",
  },
  inviteEmailMismatch: {
    th: "คำเชิญนี้ส่งถึงอีเมลอื่น",
    en: "This invitation was sent to a different email address",
  },
} as const satisfies Record<string, LocaleString>;

export type AdminKey = keyof typeof A;

/** Fills `{name}` placeholders. Values are plain text; React escapes them on render. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

/** Reads an admin string and fills its placeholders in one go. */
export function a(key: AdminKey, locale: Locale, values?: Record<string, string | number>): string {
  const text = A[key][locale];
  return values ? fmt(text, values) : text;
}

export const ROLE_LABEL = {
  admin: "roleAdmin",
  editor: "roleEditor",
  lf_officer: "roleLfOfficer",
  complaints_handler: "roleComplaintsHandler",
  unit_lead: "roleUnitLead",
} as const satisfies Record<string, AdminKey>;

export const ROLE_HINT = {
  admin: "roleAdminHint",
  editor: "roleEditorHint",
  lf_officer: "roleLfOfficerHint",
  complaints_handler: "roleComplaintsHandlerHint",
  unit_lead: "roleUnitLeadHint",
} as const satisfies Record<string, AdminKey>;
