# NGI website Apps Script

`Code.gs` is the complete single-file website shared by Membership and UFAQ. Install it in the website Apps Script project used by both forms.

Run `setupWebsite` in the Apps Script editor as the deployment owner and grant Sheets, Drive and mail access. Setup creates **NGI New Applications** with separate **Membership** and **UFAQ** tabs and **NGI New UFAQ CVs** in the owner's Drive. The script log contains both links. Re-running setup reuses those resources. Keep their sharing restricted to authorized staff. The UFAQ tab holds each uploaded file's Drive ID.

Optionally set `NGI_ADMIN_NOTIFICATION_EMAIL` in Script Properties. Then publish a new version of the website deployment with the same URL. Both GitHub forms read that URL from `membership/config.js`. Use the health endpoint to check configuration after setup.

The website writes only to its new storage. Existing projects, sheets and CV folders can still be opened independently. Membership verifies email ownership. UFAQ retries from the same form and unchanged application reuse their original reference and file. Requests submitted from fresh forms are recorded independently. The UFAQ limit is 60 new submissions per UTC hour and 300 per UTC day.

After deployment, test both forms with synthetic applications and confirm new rows and CVs appear in the new resources.
