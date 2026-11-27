/** Standalone Google Apps Script backend for NGI Membership only. */
const NGI_MEMBERSHIP_FIELDS = ['fullName', 'email', 'phone', 'district', 'city', 'education', 'institution', 'interest', 'availability', 'reason'];
const NGI_MEMBERSHIP_CODE_TTL = 600;
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
      typeof data.email !== 'string' || data.email.length > 150) {
    return membershipJson_({success: false, message: 'Invalid request.'});
  }
  const email = data.email.trim().toLowerCase();
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(email)) {
    return membershipJson_({success: false, message: 'Please enter a valid email address.'});
  }
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('MEMBERSHIP_SHEET_ID');
  if (!id) return membershipJson_({success:false,message:'Membership registration is not yet available.'});
  if (data.action === 'sendCode') return sendMembershipCode_(email, props);
  if (data.action !== 'apply' || data.consent !== 'on' || data.accuracy !== 'on') {
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
  clean.email = email;
  clean.phone = clean.phone.replace(/[\s()-]/g, '').replace(/^\+?92/, '0');
  if (!/^03\d{9}$/.test(clean.phone)) {
    return membershipJson_({success:false,message:'Please enter a valid Pakistani mobile number.'});
  }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return membershipJson_({success:false,message:'Please try again in a moment.'});
  try {
    const cache = CacheService.getScriptCache();
    const key = 'membership-code:' + membershipDigest_(email);
    const code = typeof data.code === 'string' ? data.code.trim().toUpperCase() : '';
    const challenge = typeof data.challenge === 'string' && /^[a-f0-9-]{36}$/.test(data.challenge) ? data.challenge : '';
    const digest = challenge && cache.get(key + ':' + challenge);
    const attemptsKey = key + ':' + challenge + ':attempts';
    if (digest && /^[A-F0-9]{12}$/.test(code) && digest !== membershipDigest_(code)) {
      const attempts = Number(cache.get(attemptsKey) || 0) + 1;
      cache.put(attemptsKey, String(attempts), NGI_MEMBERSHIP_CODE_TTL);
      if (attempts >= 5) cache.remove(key + ':' + challenge);
    }
    if (!digest || !/^[A-F0-9]{12}$/.test(code) || digest !== membershipDigest_(code)) {
      return membershipJson_({success:false,message:'Enter a valid verification code or request a new one.'});
    }
    const sheet = SpreadsheetApp.openById(id).getSheetByName('Applications');
    const last = sheet.getLastRow();
    if (last > 1) {
      const match = sheet.getRange(2, 4, last - 1, 1).createTextFinder(email)
        .matchEntireCell(true).matchCase(false).findNext();
      if (match) {
        const reference = sheet.getRange(match.getRow(), 2).getDisplayValue();
        cache.remove(key + ':' + challenge);
        return membershipJson_({success:true,reference:reference});
      }
    }
    const reference = 'NGI-M-' + Utilities.getUuid().split('-')[0].toUpperCase();
    sheet.appendRow([new Date(), reference].concat(NGI_MEMBERSHIP_FIELDS.map(field => membershipSafeCell_(clean[field])), ['Agreed', 'Confirmed']));
    SpreadsheetApp.flush();
    cache.remove(key + ':' + challenge);
    return membershipJson_({success:true,reference:reference});
  } catch (_) {
    return membershipJson_({success:false,message:'Unable to save the application. Please try again.'});
  } finally { lock.releaseLock(); }
}

function sendMembershipCode_(email, props) {
  const unavailable = {success:false,message:'Unable to send a code right now. Please try again later.'};
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return membershipJson_(unavailable);
  try {
    const cache = CacheService.getScriptCache();
    const key = 'membership-code:' + membershipDigest_(email);
    const cooldownKey = key + ':cooldown';
    if (cache.get(cooldownKey)) {
      return membershipJson_({success:false,message:'Please wait one minute before requesting another code.'});
    }
    const now = new Date().toISOString();
    const day = now.slice(0, 10);
    const hour = now.slice(0, 13);
    const quota = JSON.parse(props.getProperty('MEMBERSHIP_EMAIL_QUOTA') || '{}');
    const dailyCount = quota.day === day ? quota.dailyCount : 0;
    const hourlyCount = quota.hour === hour ? quota.hourlyCount : 0;
    if (dailyCount >= 75 || hourlyCount >= 15 || MailApp.getRemainingDailyQuota() < 1) {
      return membershipJson_(unavailable);
    }
    const challenge = Utilities.getUuid();
    const code = Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase();
    props.setProperty('MEMBERSHIP_EMAIL_QUOTA', JSON.stringify({
      day:day, hour:hour, dailyCount:dailyCount + 1, hourlyCount:hourlyCount + 1
    }));
    cache.put(cooldownKey, '1', 60);
    MailApp.sendEmail(email, 'NGI membership verification code',
      'Your NGI membership verification code is ' + code + '. It expires in 10 minutes. If you did not request this code, you can ignore this email.');
    cache.put(key + ':' + challenge, membershipDigest_(code), NGI_MEMBERSHIP_CODE_TTL);
    return membershipJson_({success:true,codeSent:true,challenge:challenge});
  } catch (_) {
    return membershipJson_(unavailable);
  } finally { lock.releaseLock(); }
}

function membershipDigest_(value) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value));
}

function membershipSafeCell_(value) {
  // Preserve text, including leading zeroes in mobile numbers; prevent spreadsheet formula injection.
  return "'" + String(value);
}

function membershipJson_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

/** Run once as the script owner before deploying email verification. */
function authorizeMembershipEmail() {
  MailApp.getRemainingDailyQuota();
}
