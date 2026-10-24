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
import { CANTEEN_STRINGS } from "./admin-content/canteen";
import { DIRECTORY_STRINGS } from "./admin-content/directory";
import { MEDIA_STRINGS } from "./admin-content/media";
import { PAGES_STRINGS } from "./admin-content/pages";
import { PUBLISHING_STRINGS } from "./admin-content/publishing";

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

  /* Content: navigation and hub */
  contentLink: { th: "เนื้อหา", en: "Content" },
  contentHubTitle: { th: "เนื้อหาเว็บไซต์", en: "Website content" },
  contentHubIntro: {
    th: "แก้ไขข่าว กิจกรรม หน้าแนะนำ และข้อมูลอื่นที่แสดงบนเว็บไซต์ การเปลี่ยนแปลงจะปรากฏหลังจากกดเผยแพร่",
    en: "Edit the news, events, guides and other information shown on the website. Changes appear once you publish",
  },
  dashContentIntro: { th: "แก้ไขเนื้อหาที่แสดงบนเว็บไซต์", en: "Edit what the website shows" },
  dashAllContent: { th: "ดูเนื้อหาทั้งหมด", en: "See all content" },
  hubComingSoon: { th: "ยังไม่เปิดให้แก้ไข", en: "Editing not available yet" },
  hubSingleton: { th: "แก้ไขหน้าเดียว", en: "One page to edit" },
  hubCounts: {
    th: "ทั้งหมด {total} รายการ เผยแพร่แล้ว {published} ฉบับร่าง {drafts}",
    en: "{total} in total, {published} published, {drafts} drafts",
  },

  /* Content: types (plural label, singular for "Add ...", one-line description) */
  typeAlerts: { th: "ประกาศแจ้งเตือน", en: "Service alerts" },
  typeAlertsOne: { th: "ประกาศแจ้งเตือน", en: "service alert" },
  typeAlertsDesc: { th: "ประกาศด่วนที่แสดงเหนือหน้าเว็บ เช่น รถรับส่งหยุดวิ่ง", en: "Urgent notices shown above pages, such as a suspended shuttle" },
  typeNews: { th: "ข่าว", en: "News posts" },
  typeNewsOne: { th: "ข่าว", en: "news post" },
  typeNewsDesc: { th: "ข่าวสารและประกาศจาก อมธ. และสภานักศึกษา", en: "News and announcements from TUSU and TUSC" },
  typeEvents: { th: "กิจกรรม", en: "Events" },
  typeEventsOne: { th: "กิจกรรม", en: "event" },
  typeEventsDesc: { th: "กิจกรรมที่กำลังจะมาถึงและที่ผ่านมา", en: "Upcoming and past events" },
  typePolicies: { th: "นโยบาย", en: "Policies" },
  typePoliciesOne: { th: "นโยบาย", en: "policy" },
  typePoliciesDesc: { th: "นโยบายที่สัญญาไว้และความคืบหน้า", en: "Promised policies and how they are progressing" },
  typeGuides: { th: "หน้าคู่มือ", en: "Guide pages" },
  typeGuidesOne: { th: "หน้าคู่มือ", en: "guide page" },
  typeGuidesDesc: { th: "คู่มือการใช้ชีวิตและการเรียนในมหาวิทยาลัย", en: "How-to guides for student life" },
  typeWelfare: { th: "หน้าสวัสดิการ", en: "Welfare pages" },
  typeWelfareOne: { th: "หน้าสวัสดิการ", en: "welfare page" },
  typeWelfareDesc: { th: "สวัสดิการและความช่วยเหลือสำหรับนักศึกษา", en: "Support and benefits for students" },
  typeFaqs: { th: "คำถามที่พบบ่อย", en: "FAQs" },
  typeFaqsOne: { th: "คำถามที่พบบ่อย", en: "FAQ" },
  typeFaqsDesc: { th: "คำถามและคำตอบในคู่มือนักศึกษา", en: "Questions and answers in the student handbook" },
  typeForms: { th: "แบบฟอร์ม", en: "Forms" },
  typeFormsOne: { th: "แบบฟอร์ม", en: "form" },
  typeFormsDesc: { th: "แบบฟอร์มและคำร้องที่นักศึกษาใช้บ่อย", en: "Forms and requests students use often" },
  typeOrganisations: { th: "องค์กรและชมรม", en: "Organisations" },
  typeOrganisationsOne: { th: "องค์กร", en: "organisation" },
  typeOrganisationsDesc: { th: "สารบัญคณะกรรมการ ชมรม และหน่วยงาน", en: "The directory of committees, clubs and offices" },
  typePlaces: { th: "สถานที่", en: "Places" },
  typePlacesOne: { th: "สถานที่", en: "place" },
  typePlacesDesc: { th: "อาคาร ห้อง และจุดบริการในพื้นที่ท่าพระจันทร์", en: "Buildings, rooms and service points at Tha Prachan" },
  typeShuttle: { th: "สายรถรับส่ง", en: "Shuttle routes" },
  typeShuttleOne: { th: "สายรถรับส่ง", en: "shuttle route" },
  typeShuttleDesc: { th: "สายรถ ป้ายจอด และตารางเวลา", en: "Routes, stops and timetables" },
  typeSiteSettings: { th: "ตั้งค่าเว็บไซต์", en: "Site settings" },
  typeSiteSettingsOne: { th: "ตั้งค่าเว็บไซต์", en: "site settings" },
  typeSiteSettingsDesc: { th: "ชื่อเว็บไซต์ เมนู ช่องทางติดต่อ และสถานะของบริการ", en: "The site name, menus, help contacts and service phase" },
  typeLostFound: { th: "รายการของหาย-ของเจอ", en: "Lost and found listings" },
  typeLostFoundOne: { th: "รายการของเจอ", en: "found item listing" },
  typeLostFoundDesc: { th: "รายการของที่เจอซึ่งแสดงต่อสาธารณะ", en: "Found items shown to the public" },
  typeCanteenSettings: { th: "ตั้งค่าโรงอาหาร", en: "Canteen settings" },
  typeCanteenSettingsOne: { th: "ตั้งค่าโรงอาหาร", en: "canteen settings" },
  typeCanteenSettingsDesc: { th: "เวลาเปิดและข้อมูลทั่วไปของโรงอาหาร", en: "Opening hours and general canteen information" },
  typeCanteenStalls: { th: "ร้านในโรงอาหาร", en: "Canteen stalls" },
  typeCanteenStallsOne: { th: "ร้านอาหาร", en: "canteen stall" },
  typeCanteenStallsDesc: { th: "ร้านอาหารแต่ละร้านและตำแหน่งในผังโรงอาหาร", en: "Each stall and where it is on the floor plan" },
  typeCanteenDishes: { th: "เมนูอาหาร", en: "Canteen dishes" },
  typeCanteenDishesOne: { th: "เมนูอาหาร", en: "dish" },
  typeCanteenDishesDesc: { th: "เมนู ราคา และข้อมูลสารก่อภูมิแพ้", en: "Dishes, prices and allergen information" },
  typeCanonicalDishes: { th: "ชื่อเมนูมาตรฐาน", en: "Canonical dishes" },
  typeCanonicalDishesOne: { th: "ชื่อเมนูมาตรฐาน", en: "canonical dish" },
  typeCanonicalDishesDesc: { th: "ชื่อกลางที่ใช้จัดกลุ่มและค้นหาเมนู", en: "The common names used to group and search dishes" },
  typeImages: { th: "คลังรูปภาพ", en: "Images" },
  typeImagesOne: { th: "รูปภาพ", en: "image" },
  typeImagesDesc: { th: "รูปที่อัปโหลดและคำอธิบายรูป", en: "Uploaded pictures and their descriptions" },

  /* Content: lists */
  listTitle: { th: "ชื่อเรื่อง", en: "Title" },
  listStatus: { th: "สถานะ", en: "Status" },
  listUpdated: { th: "แก้ไขล่าสุด", en: "Last edited" },
  listActions: { th: "การดำเนินการ", en: "Actions" },
  listAdd: { th: "เพิ่ม{item}", en: "Add {item}" },
  listAddItem: { th: "เพิ่ม{item}", en: "Add {item}" },
  listFilter: { th: "ค้นหาในรายการ", en: "Filter the list" },
  listFilterApply: { th: "ค้นหา", en: "Filter" },
  listFilterClear: { th: "ล้างตัวกรอง", en: "Clear filter" },
  listEmpty: { th: "ยังไม่มี{label}", en: "There are no {label} yet" },
  listNoMatches: { th: "ไม่พบรายการที่ตรงกับคำค้น", en: "Nothing matches that search" },
  listCaption: { th: "{label} แสดง {shown} จาก {total} รายการ", en: "{label}: showing {shown} of {total}" },
  listTruncated: { th: "แสดง {shown} รายการล่าสุดจากทั้งหมด {total} ใช้ช่องค้นหาเพื่อหารายการอื่น", en: "Showing the {shown} most recent of {total}. Use the filter to find others" },
  listDeleted: { th: "ลบแล้ว", en: "Deleted" },
  listDeletedNote: { th: "ลบรายการแล้ว ประวัติการแก้ไขยังคงเก็บไว้", en: "The item has been deleted. Its edit history is kept" },
  statusDraft: { th: "ฉบับร่าง", en: "Draft" },
  statusPublished: { th: "เผยแพร่แล้ว", en: "Published" },
  untitled: { th: "(ไม่มีชื่อ)", en: "(Untitled)" },
  edit: { th: "แก้ไข", en: "Edit" },
  editItem: { th: "แก้ไข{item}", en: "Edit {item}" },
  remove: { th: "ลบออก", en: "Remove" },
  cancel: { th: "ยกเลิก", en: "Cancel" },
  done: { th: "เสร็จสิ้น", en: "Done" },
  moveUp: { th: "เลื่อนขึ้น", en: "Move up" },
  moveDown: { th: "เลื่อนลง", en: "Move down" },

  /* Content: form shell */
  formSaveDraft: { th: "บันทึกฉบับร่าง", en: "Save draft" },
  formSaveChanges: { th: "บันทึกการเปลี่ยนแปลง", en: "Save changes" },
  formSave: { th: "บันทึก", en: "Save" },
  formPublish: { th: "เผยแพร่", en: "Publish" },
  formUnpublish: { th: "ยกเลิกการเผยแพร่", en: "Unpublish" },
  formSaving: { th: "กำลังบันทึก", en: "Saving" },
  formBackToList: { th: "กลับไปที่รายการ", en: "Back to the list" },
  formDelete: { th: "ลบ", en: "Delete" },
  formDeleteTitle: { th: "ลบรายการนี้หรือไม่", en: "Delete this item?" },
  formDeleteBody: {
    th: "รายการนี้จะหายไปจากเว็บไซต์ทันที ประวัติการแก้ไขยังคงเก็บไว้ในระบบ",
    en: "It will disappear from the website straight away. Its edit history stays in the system",
  },
  formDeleteConfirm: { th: "ลบรายการนี้", en: "Yes, delete it" },
  formDeleteCancel: { th: "ไม่ลบ", en: "Keep it" },
  formViewOnSite: { th: "ดูบนเว็บไซต์", en: "View on the website" },
  formLastSaved: { th: "บันทึกล่าสุด", en: "Last saved" },
  formLastSavedBy: { th: "โดย {name}", en: "by {name}" },
  formSavedDraft: { th: "บันทึกฉบับร่างแล้ว", en: "Draft saved" },
  formSavedPublished: { th: "เผยแพร่แล้ว", en: "Published" },
  formSavedUnpublished: { th: "ยกเลิกการเผยแพร่แล้ว ตอนนี้เป็นฉบับร่าง", en: "Unpublished. It is now a draft" },
  formSavedUpdated: { th: "บันทึกการเปลี่ยนแปลงแล้ว", en: "Changes saved" },
  formSavedLiveNote: { th: "การเปลี่ยนแปลงจะขึ้นบนเว็บไซต์ภายในไม่กี่นาที", en: "The change will appear on the website within a few minutes" },
  formSavedNote: { th: "รายการนี้ยังไม่แสดงบนเว็บไซต์จนกว่าจะเผยแพร่", en: "It will not appear on the website until you publish it" },

  /* Content: field labels and hints shared by many types */
  fieldTitle: { th: "ชื่อเรื่อง", en: "Title" },
  fieldSummary: { th: "สรุปสั้น", en: "Summary" },
  fieldBody: { th: "เนื้อหา", en: "Body" },
  fieldSlug: { th: "ชื่อในที่อยู่เว็บ", en: "Web address name" },
  fieldOwner: { th: "ผู้รับผิดชอบ", en: "Responsible body" },
  fieldCategory: { th: "หมวดหมู่", en: "Category" },
  fieldPublishedAt: { th: "วันที่เผยแพร่", en: "Publication date" },
  fieldCoverImage: { th: "รูปปก", en: "Cover picture" },
  fieldGallery: { th: "แกลเลอรีรูป", en: "Picture gallery" },
  fieldTags: { th: "แท็ก", en: "Tags" },
  fieldTag: { th: "แท็ก", en: "Tag" },
  hintSummary: { th: "ประโยคหรือสองประโยคที่แสดงในรายการข่าว", en: "One or two sentences shown in lists" },
  hintGallery: { th: "รูปที่แสดงใต้เนื้อหา ตามลำดับที่เลือก", en: "Pictures shown under the body, in this order" },
  hintPublishedAt: {
    th: "เว้นว่างไว้เพื่อใช้เวลาที่กดเผยแพร่ วันที่นี้ใช้เรียงลำดับในรายการ",
    en: "Leave empty to use the time you press Publish. Lists are sorted by this date",
  },
  hintThailandTime: { th: "เวลาประเทศไทย", en: "Thailand time" },
  hintSlug: {
    th: "ตัวอักษรภาษาอังกฤษพิมพ์เล็ก ตัวเลข และขีดกลาง ใช้เป็นส่วนหนึ่งของที่อยู่หน้านี้ อย่าเปลี่ยนหลังเผยแพร่ เพราะลิงก์เดิมจะใช้ไม่ได้",
    en: "Lower case letters, numbers and hyphens. It forms part of this page's address, so do not change it after publishing or old links will break",
  },
  choiceNone: { th: "ไม่ระบุ", en: "None" },
  choiceSelect: { th: "เลือก", en: "Select" },
  filterChoices: { th: "กรองรายการ", en: "Filter the choices" },
  choicesEmpty: { th: "ยังไม่มีตัวเลือก", en: "There are no choices yet" },
  langThai: { th: "ไทย", en: "Thai" },
  langEnglish: { th: "อังกฤษ", en: "English" },

  /* Content: field errors. {field} is the field's label. */
  errFieldRequired: { th: "กรอก{field}", en: "Enter the {field}" },
  errFieldRequiredIn: { th: "กรอก{field}ภาษา{language}", en: "Enter the {field} in {language}" },
  errFieldTooLong: { th: "{field}ต้องไม่เกิน {max} ตัวอักษร", en: "The {field} must be {max} characters or fewer" },
  errUrlInvalid: { th: "กรอก{field}ให้ถูกต้อง เช่น https://example.com", en: "Enter the {field} in the correct format, like https://example.com" },
  errDateInvalid: { th: "กรอก{field}ให้ถูกต้อง", en: "Enter a real date and time for the {field}" },
  errSelectField: { th: "เลือก{field}", en: "Select the {field}" },
  errNumberInvalid: { th: "กรอก{field}เป็นจำนวนเต็มในช่วงที่กำหนด", en: "Enter the {field} as a whole number in the allowed range" },
  errSlugFormat: {
    th: "ใช้ตัวอักษรภาษาอังกฤษพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น เช่น freshers-week-2026",
    en: "Use lower case letters, numbers and hyphens only, like freshers-week-2026",
  },
  errSlugTaken: { th: "ชื่อนี้ถูกใช้แล้ว ลองชื่ออื่น", en: "That web address name is already used. Try another" },
  errRichTextInvalid: { th: "{field}มีเนื้อหาที่บันทึกไม่ได้: {detail}", en: "The {field} has content that cannot be saved: {detail}" },
  errImageUndescribed: {
    th: "รูปนี้ยังไม่มีคำอธิบายภาพทั้งสองภาษา เพิ่มคำอธิบายในคลังรูปภาพก่อนเผยแพร่",
    en: "This picture has no description in both languages. Add one in the image library before publishing",
  },
  errNotFound: { th: "ไม่พบรายการนี้ อาจถูกลบไปแล้ว", en: "We could not find this item. It may have been deleted" },
  errLinkUnsafe: {
    th: "ลิงก์ไม่ถูกต้อง ใช้ที่อยู่ที่ขึ้นต้นด้วย https:// อีเมล หรือลิงก์ภายในเว็บไซต์ที่ขึ้นต้นด้วย /",
    en: "That link is not valid. Use an address starting https://, an email address, or a path on this site starting /",
  },

  /* Content: pictures */
  imageChoose: { th: "เลือกรูปภาพ", en: "Choose a picture" },
  imageChange: { th: "เปลี่ยนรูปภาพ", en: "Change picture" },
  imageAdd: { th: "เพิ่มรูปภาพ", en: "Add pictures" },
  imageNoneChosen: { th: "ยังไม่ได้เลือกรูปภาพ", en: "No picture chosen" },
  imageDialogTitle: { th: "เลือกหรืออัปโหลดรูปภาพ", en: "Choose or upload a picture" },
  imageLibrary: { th: "เลือกจากคลังรูปภาพ", en: "Choose from the library" },
  imageLibraryEmpty: { th: "ยังไม่มีรูปในคลัง อัปโหลดรูปแรกด้านล่าง", en: "The library is empty. Upload the first picture below" },
  imageUploadTitle: { th: "อัปโหลดรูปใหม่", en: "Upload a new picture" },
  imageFile: { th: "ไฟล์รูปภาพ", en: "Picture file" },
  imageFileHint: { th: "JPEG, PNG, WebP หรือ HEIC ขนาดไม่เกิน {mb} MB", en: "JPEG, PNG, WebP or HEIC, up to {mb} MB" },
  imageAltTh: { th: "คำอธิบายภาพ (ไทย)", en: "Describe the picture (Thai)" },
  imageAltEn: { th: "คำอธิบายภาพ (อังกฤษ)", en: "Describe the picture (English)" },
  imageDecorativeLabel: { th: "รูปนี้เป็นแค่ตกแต่ง ไม่ต้องมีคำอธิบาย", en: "This picture is only decoration and needs no description" },
  imageDecorative: { th: "(รูปตกแต่ง)", en: "(decorative picture)" },
  imageNoAlt: { th: "(ยังไม่มีคำอธิบายภาพ)", en: "(no description yet)" },
  imageMissing: { th: "(ไม่พบรูปภาพ)", en: "(picture not found)" },
  imageUpload: { th: "อัปโหลด", en: "Upload" },
  imageUploading: { th: "กำลังอัปโหลด", en: "Uploading" },
  storageNotConfiguredTitle: { th: "ยังอัปโหลดรูปไม่ได้", en: "Uploading is not set up" },
  errStorageNotConfigured: {
    th: "ยังไม่ได้ตั้งค่าที่เก็บไฟล์ในสภาพแวดล้อมนี้ ผู้พัฒนาต้องตั้งค่า BLOB_READ_WRITE_TOKEN หรือ BLOB_STORE_ID ก่อน คุณยังเลือกรูปที่มีอยู่แล้วได้",
    en: "File storage is not set up in this environment. A developer needs to set BLOB_READ_WRITE_TOKEN or BLOB_STORE_ID. You can still choose pictures already in the library",
  },
  errUploadChoose: { th: "เลือกไฟล์รูปภาพ", en: "Choose a picture file" },
  errUploadAlt: { th: "กรอกคำอธิบายภาพทั้งภาษาไทยและอังกฤษ หรือเลือกว่าเป็นรูปตกแต่ง", en: "Describe the picture in Thai and English, or tick that it is only decoration" },
  errUploadTooLarge: { th: "ไฟล์ใหญ่เกินไป ลดขนาดรูปให้ไม่เกิน 4 MB", en: "That file is too large. Reduce the picture to 4 MB or less" },
  errUploadType: { th: "ใช้ได้เฉพาะไฟล์ JPEG, PNG, WebP หรือ HEIC", en: "Only JPEG, PNG, WebP or HEIC files can be used" },
  errUploadFailed: { th: "อัปโหลดไม่สำเร็จ ลองอีกครั้ง", en: "The upload did not work. Try again" },

  /* Content: rich text editor */
  rteToolbar: { th: "เครื่องมือจัดรูปแบบ {label}", en: "Formatting tools for {label}" },
  rteParagraph: { th: "ข้อความปกติ", en: "Normal text" },
  rteHeading: { th: "หัวข้อ", en: "Heading" },
  rteSubheading: { th: "หัวข้อรอง", en: "Subheading" },
  rteSmallHeading: { th: "หัวข้อย่อย", en: "Small heading" },
  rteBold: { th: "ตัวหนา", en: "Bold" },
  rteItalic: { th: "ตัวเอียง", en: "Italic" },
  rteBullets: { th: "รายการหัวข้อย่อย", en: "Bullet list" },
  rteNumbers: { th: "รายการลำดับเลข", en: "Numbered list" },
  rteQuote: { th: "คำพูดอ้างอิง", en: "Quote" },
  rteLink: { th: "ลิงก์", en: "Link" },
  rteLineBreak: { th: "ขึ้นบรรทัดใหม่", en: "Line break" },
  rteUndo: { th: "เลิกทำ", en: "Undo" },
  rteRedo: { th: "ทำซ้ำ", en: "Redo" },
  rteInsertBlock: { th: "แทรก{block}", en: "Insert {block}" },
  rteLinkTitle: { th: "ลิงก์", en: "Link" },
  rteLinkAddress: { th: "ที่อยู่ลิงก์", en: "Link address" },
  rteLinkHint: {
    th: "เช่น https://www.tu.ac.th หรืออีเมล เว้นว่างไว้เพื่อเอาลิงก์ออก",
    en: "For example https://www.tu.ac.th or an email address. Leave empty to remove the link",
  },
  rteLinkApply: { th: "ใช้ลิงก์นี้", en: "Use this link" },
  rteLinkRemove: { th: "เอาลิงก์ออก", en: "Remove link" },

  /* Content: rich text blocks */
  blockContact: { th: "ช่องทางติดต่อ", en: "Contact details" },
  blockForm: { th: "แบบฟอร์ม", en: "Form" },
  blockImage: { th: "รูปภาพ", en: "Picture" },
  blockLinkOut: { th: "การ์ดลิงก์", en: "Link card" },
  blockCallout: { th: "กล่องแจ้งเตือน", en: "Notice box" },
  blockSteps: { th: "รายการขั้นตอน", en: "Step list" },
  blockEmpty: { th: "(ยังไม่ได้กรอก)", en: "(nothing filled in yet)" },
  blockStepCount: { th: "{count} ขั้นตอน", en: "{count} steps" },
  blockInsertTitle: { th: "แทรก{block}", en: "Insert {block}" },
  blockEditTitle: { th: "แก้ไข{block}", en: "Edit {block}" },
  blockInsert: { th: "แทรก", en: "Insert" },
  blockSaveChanges: { th: "บันทึกการเปลี่ยนแปลง", en: "Save changes" },
  blockContactLabel: { th: "ชื่อช่องทาง", en: "Name of the contact" },
  blockContactChannel: { th: "ประเภท", en: "Type" },
  blockContactValue: { th: "รายละเอียด", en: "Details" },
  blockContactValueHint: { th: "เบอร์โทร อีเมล LINE ID หรือที่อยู่เว็บ", en: "A phone number, email address, LINE ID or web address" },
  blockContactHours: { th: "เวลาให้บริการ (ไม่บังคับ)", en: "Opening hours (optional)" },
  blockFormChoose: { th: "แบบฟอร์ม", en: "Form" },
  blockFormHint: { th: "การ์ดของแบบฟอร์มนี้จะแสดงในเนื้อหา", en: "A card for this form is shown in the text" },
  blockImagePicture: { th: "รูปภาพ", en: "Picture" },
  blockImageDecorative: { th: "รูปตกแต่ง", en: "Decorative picture" },
  blockImageDecorativeHint: { th: "เลือกเฉพาะรูปที่ไม่มีข้อมูล เช่น ลวดลายตกแต่ง", en: "Only for pictures that carry no information, such as a pattern" },
  blockImageAlt: { th: "คำอธิบายภาพ", en: "Description of the picture" },
  blockImageAltHint: { th: "อธิบายสิ่งที่เห็นในรูปให้คนที่มองไม่เห็นรูปเข้าใจ", en: "Say what the picture shows, for people who cannot see it" },
  blockImageCaption: { th: "คำบรรยายใต้รูป (ไม่บังคับ)", en: "Caption (optional)" },
  blockLinkLabel: { th: "ข้อความบนการ์ด", en: "Text on the card" },
  blockLinkUrl: { th: "ที่อยู่ลิงก์", en: "Link address" },
  blockLinkDescription: { th: "คำอธิบายเพิ่มเติม (ไม่บังคับ)", en: "Extra description (optional)" },
  blockLinkSignIn: { th: "การเข้าสู่ระบบ", en: "Signing in" },
  blockLinkSignInLabel: { th: "ต้องเข้าสู่ระบบก่อนจึงเปิดลิงก์นี้ได้", en: "People must sign in to open this link" },
  blockCalloutTone: { th: "ความสำคัญ", en: "Importance" },
  blockCalloutTitle: { th: "หัวเรื่อง (ไม่บังคับ)", en: "Heading (optional)" },
  blockCalloutBody: { th: "ข้อความ", en: "Message" },
  blockStepsTitle: { th: "ชื่อรายการ (ไม่บังคับ)", en: "Title of the list (optional)" },
  blockStepN: { th: "ขั้นตอนที่ {n}", en: "Step {n}" },
  blockStepTitle: { th: "ชื่อขั้นตอน", en: "Step title" },
  blockStepDetail: { th: "รายละเอียด (ไม่บังคับ)", en: "Details (optional)" },
  blockStepAdd: { th: "เพิ่มขั้นตอน", en: "Add a step" },
  channel_line: { th: "LINE", en: "LINE" },
  channel_email: { th: "อีเมล", en: "Email" },
  channel_phone: { th: "โทรศัพท์", en: "Phone" },
  channel_inPerson: { th: "ติดต่อด้วยตนเอง", en: "In person" },
  channel_url: { th: "เว็บไซต์", en: "Website" },
  tone_info: { th: "ข้อมูลทั่วไป", en: "Information" },
  tone_warning: { th: "ควรระวัง", en: "Warning" },
  tone_critical: { th: "สำคัญมาก", en: "Critical" },
  errBlockInvalid: { th: "ตรวจสอบข้อมูลอีกครั้ง: {detail}", en: "Check the details: {detail}" },
  errBlockContact: { th: "กรอกชื่อช่องทางทั้งสองภาษา และรายละเอียด", en: "Fill in the name in Thai and English, and the details" },
  errBlockForm: { th: "เลือกแบบฟอร์ม", en: "Choose a form" },
  errBlockImage: { th: "เลือกรูปภาพ", en: "Choose a picture" },
  errBlockImageAlt: { th: "กรอกคำอธิบายภาพทั้งสองภาษา หรือเลือกว่าเป็นรูปตกแต่ง", en: "Describe the picture in both languages, or mark it as decorative" },
  errBlockLinkOut: { th: "กรอกข้อความบนการ์ดทั้งสองภาษา และที่อยู่ลิงก์", en: "Fill in the card text in Thai and English, and the link address" },
  errBlockUrl: {
    th: "ที่อยู่ลิงก์ไม่ถูกต้อง ใช้ที่อยู่ที่ขึ้นต้นด้วย https:// หรือลิงก์ภายในเว็บไซต์ที่ขึ้นต้นด้วย /",
    en: "That link address is not valid. Use one starting https://, or a path on this site starting /",
  },
  errBlockCallout: { th: "กรอกข้อความทั้งสองภาษา", en: "Fill in the message in Thai and English" },
  errBlockSteps: { th: "ต้องมีอย่างน้อยหนึ่งขั้นตอน และทุกขั้นตอนต้องมีชื่อทั้งสองภาษา", en: "Add at least one step, and give every step a title in Thai and English" },
  /* Per content group, kept in their own files */
  ...PUBLISHING_STRINGS,
  ...PAGES_STRINGS,
  ...DIRECTORY_STRINGS,
  ...CANTEEN_STRINGS,
  ...MEDIA_STRINGS,
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
