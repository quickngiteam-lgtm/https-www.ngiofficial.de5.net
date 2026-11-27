(function () {
  "use strict";
  const form = document.getElementById("membership-form");
  const button = document.getElementById("membership-submit");
  const sendButton = document.getElementById("membership-send-code");
  const email = document.getElementById("email");
  const code = document.getElementById("membership-code");
  let challenge = "";
  let verifiedAddress = "";
  const status = document.getElementById("membership-status");
  const dialog = document.getElementById("membership-success-dialog");
  const referenceText = document.getElementById("membership-success-reference");
  const closeButton = document.getElementById("membership-success-close");
  if (dialog && closeButton) {
    closeButton.addEventListener("click", function () {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    });
    dialog.addEventListener("close", function () { button.focus({preventScroll: true}); });
  }
  function showSuccessPopup(reference) {
    if (!dialog || !referenceText || !closeButton) {
      status.scrollIntoView({behavior: "smooth", block: "center"});
      return;
    }
    referenceText.textContent = reference || "Not available";
    try {
      if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
      closeButton.focus({preventScroll: true});
    } catch (_) {
      status.scrollIntoView({behavior: "smooth", block: "center"});
    }
  }
  const endpoint = String(window.NGI_MEMBERSHIP_ENDPOINT || "").trim();
  const connected = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint);
  function message(text, kind) {
    status.textContent = text;
    status.dataset.kind = kind || "info";
  }
  async function request(data) {
    const response = await fetch(endpoint, {
      method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"},
      credentials: "omit", redirect: "follow", body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || "Request could not be confirmed.");
    return result;
  }
  function resetChallenge() {
    challenge = "";
    verifiedAddress = "";
    code.value = "";
    button.disabled = true;
  }
  email.addEventListener("input", resetChallenge);
  sendButton.disabled = !connected;
  sendButton.addEventListener("click", async function () {
    if (!connected || !email.reportValidity()) return;
    const address = email.value.trim().toLowerCase();
    sendButton.disabled = true;
    message("Sending verification code…");
    try {
      const result = await request({action: "sendCode", email: address, website: form.elements.website.value});
      if (!result.codeSent || typeof result.challenge !== "string") throw new Error("Code delivery could not be confirmed.");
      if (email.value.trim().toLowerCase() !== address) {
        message("Email address changed. Request a code for the current address.", "error");
        return;
      }
      challenge = result.challenge;
      verifiedAddress = address;
      code.value = "";
      button.disabled = false;
      message("Verification code sent. Check your email and enter the code.");
      code.focus();
    } catch (error) {
      message(error.message || "Unable to send a verification code.", "error");
    } finally {
      sendButton.disabled = false;
    }
  });
  if (connected) message("Please complete the form to apply for NGI membership.");
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!connected || button.disabled || !challenge || email.value.trim().toLowerCase() !== verifiedAddress || !form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    let phone = String(data.phone || "").replace(/[\s()-]/g, "");
    if (!/^(?:\+92|92|0)3\d{9}$/.test(phone)) {
      message("Please enter a valid Pakistani mobile number.", "error");
      document.getElementById("phone").focus();
      return;
    }
    data.action = "apply";
    data.challenge = challenge;
    data.phone = phone.replace(/^\+?92/, "0");
    button.disabled = true;
    sendButton.disabled = true;
    button.textContent = "Submitting…";
    message("Submitting your membership application…");
    try {
      const result = await request(data);
      form.reset();
      resetChallenge();
      const reference = typeof result.reference === "string" ? result.reference.trim() : "";
      message("Membership application received. Your reference number is " + (reference || "not available") + ".", "success");
      showSuccessPopup(reference);
    } catch (error) {
      message("Your submission could not be confirmed. Please try again or contact NGI. " + (error.message || ""), "error");
    } finally {
      button.disabled = !challenge;
      sendButton.disabled = false;
      button.textContent = "Submit Membership Application";
    }
  });
})();
