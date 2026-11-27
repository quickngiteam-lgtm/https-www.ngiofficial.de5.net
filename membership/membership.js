(function () {
  "use strict";
  const form = document.getElementById("membership-form");
  const button = document.getElementById("membership-submit");
  const status = document.getElementById("membership-status");
  const endpoint = String(window.NGI_MEMBERSHIP_ENDPOINT || "").trim();
  const connected = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint);
  function message(text, kind) {
    status.textContent = text;
    status.dataset.kind = kind || "info";
  }
  button.disabled = !connected;
  if (connected) message("Please complete the form to apply for NGI membership.");
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!connected || button.disabled || !form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    let phone = String(data.phone || "").replace(/[\s()-]/g, "");
    if (!/^(?:\+92|92|0)3\d{9}$/.test(phone)) {
      message("Please enter a valid Pakistani mobile number.", "error");
      document.getElementById("phone").focus();
      return;
    }
    data.phone = phone.replace(/^\+?92/, "0");
    button.disabled = true;
    button.textContent = "Submitting…";
    message("Submitting your membership application…");
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"},
        credentials: "omit", redirect: "follow", body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Submission could not be confirmed.");
      form.reset();
      message("Membership application received. Your reference is " + result.reference + ".", "success");
      status.scrollIntoView({behavior: "smooth", block: "center"});
    } catch (error) {
      message("Your submission could not be confirmed. Please try again or contact NGI. " + (error.message || ""), "error");
    } finally {
      button.disabled = false;
      button.textContent = "Submit Membership Application";
    }
  });
})();
