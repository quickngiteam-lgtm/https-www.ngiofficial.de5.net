/** Standalone Google Apps Script backend for NGI Membership only. */
const NGI_MEMBERSHIP_FIELDS = ['fullName', 'email', 'phone', 'district', 'city', 'education', 'institution', 'interest', 'availability', 'reason'];
const NGI_MEMBERSHIP_HEADERS = ['Received At', 'Reference'].concat(NGI_MEMBERSHIP_FIELDS, ['Consent', 'Accuracy']);

/** Run once manually as the script owner. The spreadsheet stays private. */
function setupMembership() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('MEMBERSHIP_SHEET_ID')) return;
  const book = SpreadsheetApp.create('NGI Membership Applications');
  const sheet = book.getSheets()[0];
  sheet.setName('Applications');
  sheet.appendRow(NGI_MEMBERSHIP_HEADERS);
  sheet.setFrozenRows(1);
  props.setProperty('MEMBERSHIP_SHEET_ID', book.getId());
}

function doGet() {
  return membershipJson_({success: true, service: 'NGI Membership'});
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents || e.postData.contents.length > 14000) {
    return membershipJson_({success: false, message: 'Invalid request.'});
  }
  let data;
  try { data = JSON.parse(e.postData.contents); } catch (_) {
    return membershipJson_({success: false, message: 'Invalid request.'});
  }
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.website ||
      data.consent !== 'on' || data.accuracy !== 'on') {
    return membershipJson_({success: false, message: 'Please complete all required fields and declarations.'});
  }
  const limits = {fullName:100,email:150,phone:20,district:80,city:80,education:80,institution:150,interest:100,availability:60,reason:1200};
  const required = ['fullName','email','phone','district','city','education','interest','reason'];
  const clean = {};
  for (const field of NGI_MEMBERSHIP_FIELDS) {
    if (data[field] != null && typeof data[field] !== 'string') return membershipJson_({success:false,message:'Invalid field.'});
    clean[field] = (data[field] || '').trim();
    if (clean[field].length > limits[field] || (required.includes(field) && !clean[field])) return membershipJson_({success:false,message:'Please review required fields.'});
  }
  clean.email = clean.email.toLowerCase();
  clean.phone = clean.phone.replace(/[\s()-]/g, '').replace(/^\+?92/, '0');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email) || !/^03\d{9}$/.test(clean.phone)) {
    return membershipJson_({success:false,message:'Please enter a valid email and Pakistani mobile number.'});
  }
  const id = PropertiesService.getScriptProperties().getProperty('MEMBERSHIP_SHEET_ID');
  if (!id) return membershipJson_({success:false,message:'Membership registration is not yet available.'});
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return membershipJson_({success:false,message:'Please try again in a moment.'});
  try {
    const sheet = SpreadsheetApp.openById(id).getSheetByName('Applications');
    const last = sheet.getLastRow();
    if (last > 1) {
      const existing = sheet.getRange(2, 4, last - 1, 2).getDisplayValues();
      if (existing.some(row => row[0].toLowerCase() === clean.email || row[1] === clean.phone)) return membershipJson_({success:false,message:'An application with these contact details is already on record. Contact NGI if you need assistance.'});
    }
    const reference = 'NGI-M-' + Utilities.getUuid().split('-')[0].toUpperCase();
    sheet.appendRow([new Date(), reference].concat(NGI_MEMBERSHIP_FIELDS.map(field => membershipSafeCell_(clean[field])), ['Agreed', 'Confirmed']));
    return membershipJson_({success:true,reference:reference});
  } catch (_) {
    return membershipJson_({success:false,message:'Unable to save the application. Please try again.'});
  } finally { lock.releaseLock(); }
}

function membershipSafeCell_(value) {
  // Preserve text, including leading zeroes in mobile numbers; prevent spreadsheet formula injection.
  return "'" + String(value);
}

function membershipJson_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
