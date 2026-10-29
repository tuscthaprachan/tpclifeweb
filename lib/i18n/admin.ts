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
import { CASES_STRINGS } from "./admin-content/cases";
import { COMPLAINTS_STRINGS } from "./admin-content/complaints";
import { DIRECTORY_STRINGS } from "./admin-content/directory";
import { LOST_FOUND_CASES_STRINGS } from "./admin-content/lost-found-cases";
import { MEDIA_STRINGS } from "./admin-content/media";
import { PAGES_STRINGS } from "./admin-content/pages";
import { PERFORMANCE_STRINGS } from "./admin-content/performance";
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

  /* Sign in */
  signInTitle: { th: "เข้าสู่ระบบคอนโซลเจ้าหน้าที่", en: "Sign in to the staff console" },
  signInIntro: {
    th: "ใช้พาสคีย์ในอุปกรณ์นี้ ไม่ต้องกรอกอีเมลหรือรหัสผ่าน",
    en: "Use the passkey on this device. You do not need an email address or a password",
  },
  signInButton: { th: "เข้าสู่ระบบด้วยพาสคีย์", en: "Sign in with a passkey" },
  signInNeedsScript: {
    th: "พาสคีย์ต้องเปิดใช้ JavaScript และใช้เบราว์เซอร์รุ่นใหม่ เช่น Chrome, Edge, Safari หรือ Firefox",
    en: "Passkeys need JavaScript and a recent browser, such as Chrome, Edge, Safari or Firefox",
  },
  signInFailed: {
    th: "เข้าสู่ระบบด้วยพาสคีย์ไม่สำเร็จ ลองอีกครั้ง หรือใช้อุปกรณ์อื่นที่มีพาสคีย์ของคุณ",
    en: "We could not sign you in with a passkey. Try again, or use another device that has your passkey",
  },
  signInLostHeading: { th: "พาสคีย์หายหรือใช้ไม่ได้", en: "Lost your passkey?" },
  signInLostBody: {
    th: "ขอให้ผู้ดูแลระบบสร้างลิงก์กู้คืนบัญชีให้คุณ หากคุณเป็นผู้ดูแลระบบคนเดียว ผู้ดูแลฐานข้อมูลสร้างลิงก์ให้ได้ด้วยคำสั่งกู้คืน",
    en: "Ask an administrator to make you a recovery link. If you are the only administrator, whoever looks after the database can make one with the recovery command",
  },
  emailLabel: { th: "อีเมล", en: "Email address" },
  errEmailFormat: {
    th: "กรอกอีเมลให้ถูกต้อง เช่น name@example.org",
    en: "Enter an email address in the correct format, like name@example.org",
  },

  /* Passkey ceremonies: shared messages */
  passkeyCreateFailed: {
    th: "สร้างพาสคีย์ไม่สำเร็จ ลองอีกครั้ง",
    en: "We could not create the passkey. Try again",
  },
  passkeyNeedsScript: {
    th: "การสร้างพาสคีย์ต้องเปิดใช้ JavaScript และใช้เบราว์เซอร์รุ่นใหม่ เช่น Chrome, Edge, Safari หรือ Firefox",
    en: "Creating a passkey needs JavaScript and a recent browser, such as Chrome, Edge, Safari or Firefox",
  },
  passkeyErrLinkUnusable: {
    th: "ลิงก์นี้ใช้ไม่ได้แล้ว อาจหมดอายุ ถูกใช้ไปแล้ว หรือถูกยกเลิก ขอลิงก์ใหม่จากผู้ดูแลระบบ",
    en: "This link can no longer be used. It may have expired, been used already or been cancelled. Ask an administrator for a new one",
  },
  passkeyErrTooMany: {
    th: "พยายามมากเกินไป รอ 15 นาทีแล้วลองอีกครั้ง",
    en: "Too many attempts. Wait 15 minutes and try again",
  },
  passkeyErrAccountExists: {
    th: "มีบัญชีสำหรับอีเมลนี้อยู่แล้ว เข้าสู่ระบบด้วยพาสคีย์ของคุณ แล้วเปิดลิงก์คำเชิญอีกครั้ง",
    en: "An account already exists for this address. Sign in with your passkey, then open the invitation link again",
  },
  passkeyErrSignOutFirst: {
    th: "คุณเข้าสู่ระบบเป็นบัญชีอื่นอยู่ ออกจากระบบก่อน แล้วเปิดลิงก์อีกครั้ง",
    en: "You are signed in to a different account. Sign out, then open the link again",
  },
  passkeyErrVerification: {
    th: "อุปกรณ์ไม่ได้ตรวจสอบว่าเป็นคุณ ใช้พาสคีย์ที่ขอลายนิ้วมือ ใบหน้า หรือ PIN",
    en: "Your device did not check that it was you. Use a passkey that asks for your fingerprint, face or PIN",
  },
  passkeyErrDuplicate: {
    th: "อุปกรณ์นี้มีพาสคีย์ของบัญชีนี้อยู่แล้ว ใช้อุปกรณ์อื่น หรือเอาพาสคีย์เดิมออกก่อน",
    en: "This device already has a passkey for this account. Use another device, or remove the old one first",
  },
  passkeyErrCancelled: {
    th: "ยังไม่ได้สร้างพาสคีย์ ลองอีกครั้ง และอนุญาตเมื่อเบราว์เซอร์ถาม",
    en: "The passkey was not created. Try again, and allow it when your browser asks",
  },
  tooManyTokenAttempts: {
    th: "ลองลิงก์มากเกินไปจากเครือข่ายนี้ รอ 15 นาทีแล้วลองอีกครั้ง",
    en: "Too many attempts from this network. Wait 15 minutes and try again",
  },

  /* My security */
  securityLink: { th: "ความปลอดภัยของฉัน", en: "My security" },
  securityTitle: { th: "ความปลอดภัยของฉัน", en: "My security" },
  securityIntro: {
    th: "คุณเข้าสู่ระบบด้วยพาสคีย์เท่านั้น เพิ่มพาสคีย์ในทุกอุปกรณ์ที่คุณใช้ เช่น โทรศัพท์และแล็ปท็อป เพื่อไม่ให้ถูกล็อกออกเมื่ออุปกรณ์หาย",
    en: "You sign in with passkeys only. Add one on each device you use, such as your phone and your laptop, so that losing a device does not lock you out",
  },
  passkeysHeading: { th: "พาสคีย์ของคุณ", en: "Your passkeys" },
  colAdded: { th: "เพิ่มเมื่อ", en: "Added" },
  colLastUsed: { th: "ใช้ล่าสุด", en: "Last used" },
  lastUsedNever: { th: "ยังไม่เคยใช้เข้าสู่ระบบ", en: "Not used to sign in yet" },
  passkeyUnnamed: { th: "พาสคีย์", en: "Passkey" },
  renameLabel: { th: "ชื่อพาสคีย์", en: "Passkey name" },
  renameSave: { th: "บันทึกชื่อ", en: "Save name" },
  removePasskeyVisible: { th: "เอาออก", en: "Remove" },
  removePasskeyFor: { th: "เอาพาสคีย์ {name} ออก", en: "Remove the passkey {name}" },
  onlyPasskeyNote: {
    th: "นี่คือพาสคีย์เดียวของคุณ จึงเอาออกไม่ได้ เพิ่มพาสคีย์อีกอันก่อน",
    en: "This is your only passkey, so it cannot be removed. Add another first",
  },
  addPasskeyHeading: { th: "เพิ่มพาสคีย์", en: "Add a passkey" },
  addPasskeyBody: {
    th: "เบราว์เซอร์จะขอให้คุณยืนยันด้วยลายนิ้วมือ ใบหน้า การล็อกหน้าจอ หรือกุญแจความปลอดภัย เปิดหน้านี้บนอุปกรณ์เครื่องใหม่เพื่อเพิ่มพาสคีย์ของเครื่องนั้น",
    en: "Your browser will ask you to confirm with your fingerprint, face, screen lock or security key. Open this page on a new device to add a passkey for it",
  },
  addPasskeyButton: { th: "เพิ่มพาสคีย์", en: "Add a passkey" },
  passkeyAddedTitle: { th: "เพิ่มพาสคีย์แล้ว", en: "Passkey added" },
  passkeyAddedBody: {
    th: "ครั้งต่อไปใช้พาสคีย์นี้เข้าสู่ระบบได้ ตั้งชื่อให้จำง่ายได้ด้านล่าง",
    en: "You can use it to sign in next time. Give it a name you will recognise below",
  },
  passkeyRenamedTitle: { th: "บันทึกชื่อแล้ว", en: "Name saved" },
  passkeyRenamedBody: { th: "ชื่อใหม่แสดงในรายการด้านล่างแล้ว", en: "The new name shows in the list below" },
  passkeyRemovedTitle: { th: "เอาพาสคีย์ออกแล้ว", en: "Passkey removed" },
  passkeyRemovedBody: {
    th: "พาสคีย์นั้นใช้เข้าสู่ระบบไม่ได้อีก การเปลี่ยนแปลงถูกบันทึกไว้แล้ว",
    en: "It can no longer sign in. The change has been recorded",
  },
  errPasskeyName: { th: "กรอกชื่อพาสคีย์ไม่เกิน 60 ตัวอักษร", en: "Enter a passkey name of up to 60 characters" },
  errLastPasskey: {
    th: "เอาพาสคีย์สุดท้ายออกไม่ได้ ไม่เช่นนั้นคุณจะเข้าสู่ระบบไม่ได้ เพิ่มพาสคีย์อีกอันก่อน",
    en: "You cannot remove your last passkey, or you could not sign in. Add another one first",
  },
  removePasskeyTitle: { th: "คุณต้องการเอาพาสคีย์นี้ออกหรือไม่", en: "Are you sure you want to remove this passkey?" },
  removePasskeyBody: {
    th: "พาสคีย์ {name} จะใช้เข้าสู่ระบบไม่ได้อีก การเปลี่ยนแปลงนี้จะถูกบันทึกไว้",
    en: "The passkey {name} will no longer sign you in. This change is recorded",
  },
  removePasskeyButton: { th: "เอาพาสคีย์ออก", en: "Remove passkey" },
  recoveredTitle: { th: "กู้คืนบัญชีเรียบร้อยแล้ว", en: "Your account is recovered" },
  recoveredBody: {
    th: "บันทึกพาสคีย์ใหม่แล้ว และเราออกจากระบบอุปกรณ์อื่นทั้งหมดของคุณแล้ว หากอุปกรณ์เดิมหายหรือไม่ปลอดภัย ให้เอาพาสคีย์เดิมออกตอนนี้",
    en: "Your new passkey is saved and we have signed you out everywhere else. If the old device was lost or is not safe, remove its old passkeys now",
  },
  removeOlderButton: { th: "เอาพาสคีย์เดิมทั้งหมดออก", en: "Remove my older passkeys" },
  removeOlderHint: {
    th: "เก็บพาสคีย์ใหม่ล่าสุดไว้ และเอาพาสคีย์อื่นออก",
    en: "Keeps the newest passkey and removes the rest",
  },
  olderRemovedTitle: { th: "เอาพาสคีย์เดิมออกแล้ว", en: "Older passkeys removed" },

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
    th: "เราจะสร้างลิงก์คำเชิญให้คุณส่งต่อ ลิงก์ใช้ได้ครั้งเดียวและใช้ได้ 7 วัน อีเมลใช้ระบุบัญชี จะเป็นอีเมลของมหาวิทยาลัยหรืออีเมลอื่นก็ได้ หากตั้งค่าอีเมลไว้ เราจะส่งลิงก์ไปให้ด้วย",
    en: "We will make an invitation link for you to pass on. It works once and for 7 days. The email address names the account; it can be a university address or any other. If email is set up, we also send the link",
  },
  inviteOrgLegend: { th: "เชิญเข้าหน่วยงานใด", en: "Which organisation are they joining?" },
  inviteRolesLegend: { th: "บทบาท", en: "Roles" },
  inviteRolesHint: { th: "เลือกได้หลายบทบาท", en: "Select all that apply" },
  inviteSend: { th: "สร้างลิงก์คำเชิญ", en: "Make invitation link" },
  errInviteEmailRequired: { th: "กรอกอีเมลของผู้ที่คุณต้องการเชิญ", en: "Enter the email address of the person you want to invite" },
  errInviteOrgRequired: { th: "เลือกหน่วยงาน", en: "Select an organisation" },
  errInviteRolesRequired: { th: "เลือกอย่างน้อยหนึ่งบทบาท", en: "Select at least one role" },
  errInviteFailed: { th: "สร้างคำเชิญไม่สำเร็จ ลองอีกครั้ง", en: "We could not make the invitation. Try again" },
  invitedTitle: { th: "สร้างลิงก์คำเชิญแล้ว", en: "Invitation link ready" },
  invitedBody: {
    th: "ส่งลิงก์นี้ให้ {email} ทางข้อความส่วนตัวเท่านั้น ใครก็ตามที่เปิดลิงก์ได้จะสร้างบัญชีนี้ได้ ลิงก์ใช้ได้ครั้งเดียวและใช้ได้ {days} วัน เราแสดงลิงก์นี้ได้ครั้งเดียว หากทำหาย ให้สร้างคำเชิญใหม่",
    en: "Send this link to {email} in a private message only. Anyone who opens it can create the account. It works once and for {days} days. We can only show it now; if you lose it, make a new invitation",
  },
  linkLabel: { th: "ลิงก์", en: "Link" },
  copyLink: { th: "คัดลอกลิงก์", en: "Copy link" },
  linkCopied: { th: "คัดลอกลิงก์แล้ว", en: "Link copied" },
  linkCopyFailed: { th: "คัดลอกไม่ได้ ให้เลือกลิงก์ในช่องแล้วคัดลอกเอง", en: "We could not copy it. Select the link in the box and copy it yourself" },
  emailSentNote: { th: "เราส่งลิงก์ไปที่ {email} ทางอีเมลด้วยแล้ว", en: "We have also emailed the link to {email}" },
  emailFailedNote: {
    th: "ส่งอีเมลไม่สำเร็จ ให้ส่งลิงก์ด้วยตัวเอง ลิงก์ยังใช้งานได้ตามปกติ",
    en: "We could not email it, so send the link yourself. The link still works",
  },
  emailOffNote: { th: "ยังไม่ได้ตั้งค่าอีเมล จึงต้องส่งลิงก์ด้วยตัวเอง", en: "Email is not set up, so you need to send the link yourself" },
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
  colAccount: { th: "บัญชี", en: "Account" },
  recoveryLinkVisible: { th: "สร้างลิงก์กู้คืน", en: "Make recovery link" },
  recoveryLinkFor: { th: "สร้างลิงก์กู้คืนบัญชีของ {person}", en: "Make an account recovery link for {person}" },
  recoveryTitle: { th: "สร้างลิงก์กู้คืนบัญชีให้ {person}", en: "Make a recovery link for {person}" },
  recoveryIntro: {
    th: "ใช้เมื่อ {person} ทำพาสคีย์หายทุกอัน ลิงก์ใช้ได้ครั้งเดียวและใช้ได้ 24 ชั่วโมง เมื่อใช้แล้วจะออกจากระบบทุกอุปกรณ์ของ {person} และให้สร้างพาสคีย์ใหม่ การสร้างลิงก์นี้ถูกบันทึกไว้",
    en: "Use this when {person} has lost every passkey. The link works once and for 24 hours. When it is used, {person} is signed out everywhere and registers a new passkey. Making this link is recorded",
  },
  recoveryWarning: {
    th: "ใครก็ตามที่เปิดลิงก์ได้จะเข้าบัญชีนี้ได้ ส่งให้ตัวบุคคลทางข้อความส่วนตัวเท่านั้น และตรวจสอบให้แน่ใจว่าเป็นคนนั้นจริง",
    en: "Anyone who opens the link can take over this account. Send it to the person in a private message only, and check it really is them",
  },
  recoveryButton: { th: "สร้างลิงก์กู้คืน", en: "Make recovery link" },
  recoveryReadyTitle: { th: "สร้างลิงก์กู้คืนแล้ว", en: "Recovery link ready" },
  recoveryReadyBody: {
    th: "ส่งลิงก์นี้ให้ {person} ทางข้อความส่วนตัวเท่านั้น ลิงก์ใช้ได้ครั้งเดียวและใช้ได้ {hours} ชั่วโมง เราแสดงลิงก์นี้ได้ครั้งเดียว หากทำหาย ให้สร้างใหม่",
    en: "Send this link to {person} in a private message only. It works once and for {hours} hours. We can only show it now; if you lose it, make a new one",
  },
  errRecoveryFailed: { th: "สร้างลิงก์กู้คืนไม่สำเร็จ ลองอีกครั้ง", en: "We could not make the recovery link. Try again" },
  errRecoveryScope: {
    th: "คุณสร้างลิงก์กู้คืนได้เฉพาะเจ้าหน้าที่ของหน่วยงานที่คุณเป็นผู้ดูแลระบบ",
    en: "You can only make recovery links for staff of organisations where you are an administrator",
  },
  errRecoverySelf: {
    th: "คุณสร้างลิงก์กู้คืนให้ตัวเองไม่ได้ขณะที่เป็นผู้ดูแลระบบคนเดียว หากเข้าสู่ระบบอยู่ ให้เพิ่มพาสคีย์ในหน้าความปลอดภัยของฉัน หากถูกล็อกออก ให้ผู้ดูแลฐานข้อมูลใช้คำสั่งกู้คืน",
    en: "You cannot make a recovery link for yourself while you are the only administrator. While signed in, add a passkey on My security instead. If you are locked out, ask whoever looks after the database to run the recovery command",
  },
  recoveryPendingNote: { th: "มีลิงก์กู้คืนที่ยังใช้ได้", en: "A recovery link is waiting" },

  /* Accepting an invitation, recovering an account */
  inviteLandingTitle: { th: "คุณได้รับเชิญให้เป็นเจ้าหน้าที่", en: "You have been invited to join the staff" },
  inviteLandingBody: {
    th: "คุณได้รับเชิญให้ร่วมงานกับ{organisation} บัญชีของคุณจะใช้อีเมล {email} สร้างบัญชีโดยบันทึกพาสคีย์ในอุปกรณ์นี้ ไม่ต้องใช้รหัสผ่านหรือรหัสทางอีเมล",
    en: "You have been invited to join {organisation}. Your account will use {email}. Create it by saving a passkey on this device. You do not need a password or an emailed code",
  },
  inviteNameLabel: { th: "ชื่อของคุณ", en: "Your name" },
  inviteNameHint: { th: "ชื่อที่เจ้าหน้าที่คนอื่นจะเห็น", en: "The name other staff will see" },
  errNameRequired: { th: "กรอกชื่อของคุณ ไม่เกิน 100 ตัวอักษร", en: "Enter your name, up to 100 characters" },
  inviteCreateButton: { th: "สร้างบัญชีด้วยพาสคีย์", en: "Create account with a passkey" },
  inviteExistingTitle: { th: "คุณมีบัญชีอยู่แล้ว", en: "You already have an account" },
  inviteExistingBody: {
    th: "มีบัญชีสำหรับ {email} อยู่แล้ว เข้าสู่ระบบด้วยพาสคีย์ของคุณ แล้วกลับมาที่หน้านี้เพื่อรับคำเชิญ",
    en: "There is already an account for {email}. Sign in with your passkey, then come back to this page to accept the invitation",
  },
  inviteSignInToAccept: { th: "เข้าสู่ระบบเพื่อรับคำเชิญ", en: "Sign in to accept" },
  inviteAcceptTitle: { th: "รับคำเชิญ", en: "Accept the invitation" },
  inviteAcceptBody: {
    th: "คุณเข้าสู่ระบบเป็น {email} อยู่แล้ว รับคำเชิญเพื่อรับบทบาทด้านล่างในหน่วยงาน{organisation}",
    en: "You are signed in as {email}. Accept to receive the roles below at {organisation}",
  },
  inviteAcceptButton: { th: "รับคำเชิญ", en: "Accept invitation" },
  inviteWrongAccount: {
    th: "คุณเข้าสู่ระบบเป็นบัญชีอื่นอยู่ ออกจากระบบก่อน แล้วเปิดลิงก์นี้อีกครั้ง",
    en: "You are signed in to a different account. Sign out, then open this link again",
  },
  inviteBadTitle: { th: "ใช้ลิงก์คำเชิญนี้ไม่ได้", en: "This invitation link cannot be used" },
  inviteNotFound: {
    th: "ไม่พบคำเชิญนี้ ตรวจสอบว่าคัดลอกลิงก์ครบถ้วน หรือขอให้ผู้ดูแลระบบสร้างคำเชิญใหม่",
    en: "We could not find this invitation. Check you copied the whole link, or ask an administrator to make a new one",
  },
  inviteExpired: {
    th: "คำเชิญนี้หมดอายุแล้ว ขอให้ผู้ดูแลระบบสร้างคำเชิญใหม่",
    en: "This invitation has expired. Ask an administrator to make you a new one",
  },
  inviteRevoked: {
    th: "คำเชิญนี้ถูกยกเลิกแล้ว หากคิดว่าเกิดความผิดพลาด ให้ติดต่อผู้ดูแลระบบ",
    en: "This invitation was cancelled. If you think that is a mistake, contact an administrator",
  },
  inviteAccepted: {
    th: "คำเชิญนี้ถูกใช้ไปแล้ว หากเป็นคุณ ให้เข้าสู่ระบบด้วยพาสคีย์ตามปกติ",
    en: "This invitation has already been used. If that was you, sign in with your passkey as usual",
  },
  recoverTitle: { th: "กู้คืนบัญชีของคุณ", en: "Recover your account" },
  recoverBody: {
    th: "ลิงก์นี้ให้ {name} ({email}) สร้างพาสคีย์ใหม่สำหรับบัญชีเดิม เมื่อใช้แล้ว เราจะออกจากระบบทุกอุปกรณ์ของบัญชีนี้ และลิงก์จะใช้ไม่ได้อีก",
    en: "This link lets {name} ({email}) create a new passkey for the existing account. Once you use it, we sign this account out everywhere and the link stops working",
  },
  recoverButton: { th: "สร้างพาสคีย์ใหม่", en: "Create a new passkey" },
  recoverBadTitle: { th: "ใช้ลิงก์กู้คืนนี้ไม่ได้", en: "This recovery link cannot be used" },
  recoverNotFound: {
    th: "ไม่พบลิงก์กู้คืนนี้ ตรวจสอบว่าคัดลอกลิงก์ครบถ้วน หรือขอให้ผู้ดูแลระบบสร้างใหม่",
    en: "We could not find this recovery link. Check you copied the whole link, or ask an administrator to make a new one",
  },
  recoverExpired: {
    th: "ลิงก์กู้คืนนี้หมดอายุแล้ว ขอให้ผู้ดูแลระบบสร้างใหม่",
    en: "This recovery link has expired. Ask an administrator to make a new one",
  },
  recoverRevoked: {
    th: "ลิงก์กู้คืนนี้ถูกแทนที่ด้วยลิงก์ใหม่กว่า ใช้ลิงก์ล่าสุดที่ได้รับ",
    en: "This recovery link was replaced by a newer one. Use the latest link you were sent",
  },
  recoverUsed: {
    th: "ลิงก์กู้คืนนี้ถูกใช้ไปแล้ว หากเป็นคุณ ให้เข้าสู่ระบบด้วยพาสคีย์ใหม่",
    en: "This recovery link has already been used. If that was you, sign in with your new passkey",
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
  typeFaculties: { th: "คณะและวิทยาลัย", en: "Faculties and colleges" },
  typeFacultiesOne: { th: "คณะหรือวิทยาลัย", en: "faculty or college" },
  typeFacultiesDesc: { th: "ชื่อและข้อมูลติดต่อของสำนักงานคณะ ใช้แนะนำนักศึกษาที่ต้องติดต่อคณะ", en: "Faculty names and office details, used to point students to their faculty" },
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
  imageFileHint: {
    th: "JPEG, PNG, WebP หรือ HEIC ไฟล์ที่ใหญ่กว่า {mb} MB จะถูกย่อให้อัตโนมัติ",
    en: "JPEG, PNG, WebP or HEIC. Files over {mb} MB are shrunk automatically",
  },
  imageCompressed: { th: "ย่อไฟล์จาก {from} MB เหลือ {to} MB แล้ว", en: "Compressed from {from} MB to {to} MB" },
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
  errPhotoStorageNotConfigured: {
    th: "ยังไม่ได้ตั้งค่าที่เก็บไฟล์ในสภาพแวดล้อมนี้ ผู้พัฒนาต้องตั้งค่า BLOB_READ_WRITE_TOKEN หรือ BLOB_STORE_ID ก่อน จึงจะเพิ่มรูปของสิ่งของได้ งานอื่นทำต่อได้ตามปกติ",
    en: "File storage is not set up in this environment. A developer needs to set BLOB_READ_WRITE_TOKEN or BLOB_STORE_ID before item photos can be added. You can carry on with the other tasks",
  },
  errUploadChoose: { th: "เลือกไฟล์รูปภาพ", en: "Choose a picture file" },
  errUploadAlt: { th: "กรอกคำอธิบายภาพทั้งภาษาไทยและอังกฤษ หรือเลือกว่าเป็นรูปตกแต่ง", en: "Describe the picture in Thai and English, or tick that it is only decoration" },
  errUploadTooLarge: { th: "ไฟล์ใหญ่เกินไป ลดขนาดรูปให้ไม่เกิน 4 MB", en: "That file is too large. Reduce the picture to 4 MB or less" },
  errUploadCompressDecode: {
    th: "ไฟล์ใหญ่เกิน 4 MB และเบราว์เซอร์นี้ย่อไฟล์ให้ไม่ได้ แปลงเป็น JPEG หรือลดขนาดรูปก่อน",
    en: "That file is over 4 MB and this browser could not shrink it. Convert it to JPEG or reduce the picture first",
  },
  errUploadCompressStill: {
    th: "ย่อไฟล์แล้วก็ยังเกิน 4 MB ลองใช้รูปที่เล็กลงหรือเรียบง่ายกว่านี้",
    en: "Even after compressing, that picture is still over 4 MB. Try a smaller or simpler picture",
  },
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
  ...CASES_STRINGS,
  ...COMPLAINTS_STRINGS,
  ...LOST_FOUND_CASES_STRINGS,
  ...PERFORMANCE_STRINGS,
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
