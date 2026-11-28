# NGI website Apps Script

`Code.gs` is the complete single-file website shared by Membership and UFAQ. Install it in the website Apps Script project used by both forms.

Run `setupWebsite` in the Apps Script editor as the deployment owner and grant Sheets, Drive and mail access. Setup creates **NGI New Applications** with separate **Membership** and **UFAQ** tabs and **NGI New UFAQ CVs** in the owner's Drive. The script log contains both links. Re-running setup reuses those resources. Keep their sharing restricted to authorized staff. The UFAQ tab holds each uploaded file's Drive ID.

Newly saved applications send a confirmation with the reference number to the applicant. Mail delivery uses the deployment owner’s Google mail quota. Check the Apps Script execution log for send failures. The application remains saved if the email fails. Then publish a new version of the website deployment with the same URL. Both GitHub forms read that URL from `membership/config.js`. Open the deployment URL with `?health=1` after setup. Both `membershipConfigured` and `ufaqConfigured` should be `true`.

The website writes only to its new storage. Existing projects, sheets and CV folders can still be opened independently. Membership accepts direct submissions. UFAQ retries from the same form and unchanged application reuse their original reference and file. Each email address can have one application in each form. UFAQ enforces its limit against the UFAQ tab before storing a new CV. Membership enforces its limit independently against the Membership tab. The UFAQ limit is 60 new submissions per UTC hour and 300 per UTC day.

After deployment, test both forms with synthetic applications and confirm new rows and CVs appear in the new resources.

## Deploying direct membership submissions

Publish a new version of the existing Apps Script web app at the same URL and release the matching frontend alongside it. Test a synthetic membership submission on each site you serve.
