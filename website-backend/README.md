# NGI website Apps Script

`Code.gs` is the complete single-file website shared by Membership and UFAQ. Use it in the existing website Apps Script project. The older Membership-only source remains available for installations that run that form separately. Install one entry point per Apps Script project.

Before releasing the GitHub frontend, update the existing website deployment to a new Apps Script version and keep its URL and Script Properties. In the editor, set `NGI_ADMIN_NOTIFICATION_EMAIL` to the admin inbox if alerts are needed, then run `setupWebsite` to authorize Sheets, mail and outbound requests. The website reuses the existing `MEMBERSHIP_SHEET_ID`. Verify the membership spreadsheet and legacy CV folder sharing with the deployment owner.

Both GitHub forms use the website deployment URL in `membership/config.js`. The hosted Apps Script forms use the same script through `google.script.run`. Test membership email delivery, application submission and verified duplicate recovery using an admin-controlled address. Test a synthetic UFAQ application and CV and confirm the record and upload are retained by the legacy service. The UFAQ proxy validates requests and limits forwarding to 60 per UTC hour and 300 per UTC day. File signatures check basic file type only.

The original UFAQ script still handles storage, CV access and duplicate decisions. Its direct endpoint and permissions require a separate review. This release does not modify that project or any existing records.
